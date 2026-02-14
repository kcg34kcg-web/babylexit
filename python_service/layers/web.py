import os
import asyncio
import logging
from typing import List, Dict, Optional
import httpx
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS # v6.4.2 uyumlu
import google.generativeai as genai
from pydantic import BaseModel, Field

# Logger yapılandırması
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("BabyLexitWeb")

# -----------------------------------------------------------------------------
# YAPILANDIRMA VE SABİTLER
# -----------------------------------------------------------------------------

ALLOWED_DOMAINS = [
    "resmigazete.gov.tr", "mevzuat.gov.tr", "turkiye.gov.tr", 
    "yargitay.gov.tr", "anayasa.gov.tr", "barobirlik.org.tr", 
    "istanbulbarosu.org.tr", "ankarabarosu.org.tr", "wikipedia.org", 
    "hukukihaber.net"
]

TRUSTED_EXTENSIONS = [".gov.tr", ".edu.tr", ".org.tr", ".pol.tr"]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

# -----------------------------------------------------------------------------
# VERİ MODELLERİ
# -----------------------------------------------------------------------------

class WebResult(BaseModel):
    found: bool = Field(default=False, description="Bilgi bulundu mu?")
    source_type: str = Field(default="unknown", description="trusted (resmi) veya general (genel)")
    summary: str = Field(default="", description="Bulunan bilgilerin yapay zeka özeti")
    source_links: List[str] = Field(default_factory=list, description="Bilginin alındığı kaynak linkler")
    raw_data: List[Dict[str, str]] = Field(default_factory=list, description="Debug için ham veri")
    # Geriye dönük uyumluluk için (eski kodlar 'content' alanını ararsa hata vermesin diye):
    @property
    def content(self):
        return self.summary

# -----------------------------------------------------------------------------
# WEB SEARCH LAYER (Sınıf Adı Düzeltildi: WebLayer)
# -----------------------------------------------------------------------------

class WebLayer:
    def __init__(self):
        """Web Arama Katmanı başlatıcı."""
        api_key = os.getenv("GEMINI_API_KEY")
        self.model = None
        
        if api_key:
            try:
                genai.configure(api_key=api_key)
                self.model = genai.GenerativeModel("gemini-2.0-flash")
            except Exception as e:
                logger.error(f"Gemini başlatılamadı: {e}")
        else:
            logger.warning("GEMINI_API_KEY bulunamadı.")

    def search(self, query: str) -> WebResult:
        """
        Graph.py bu metodu senkron çağırır, biz içeride asenkronu yönetiriz.
        """
        try:
            # Asenkron fonksiyonu (run) senkron ortamda çalıştırmak için wrapper
            return asyncio.run(self.run(query))
        except RuntimeError:
            # Zaten çalışan bir event loop varsa (örn. Jupyter veya FastAPI içindeysek)
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            return loop.run_until_complete(self.run(query))

    def _is_url_trusted(self, url: str) -> bool:
        try:
            from urllib.parse import urlparse
            domain = urlparse(url).netloc.lower()
            if any(allowed in domain for allowed in ALLOWED_DOMAINS): return True
            if any(domain.endswith(ext) for ext in TRUSTED_EXTENSIONS): return True
            return False
        except:
            return False

    def _search_duckduckgo(self, query: str, max_results: int = 10, strict_mode: bool = True) -> List[str]:
        final_links = []
        search_query = f"{query} hukuk mevzuat" if strict_mode else f"{query} hukuk nedir"
        logger.info(f"🦆 Arama: {search_query} (Mod: {'RESMİ' if strict_mode else 'GENEL'})")

        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(search_query, max_results=max_results + 5))

            if not results: return []

            for res in results:
                link = res.get('href')
                if not link: continue
                
                if strict_mode:
                    if self._is_url_trusted(link): final_links.append(link)
                else:
                    if "youtube.com" not in link: final_links.append(link)

                if len(final_links) >= 5: break
            
            return final_links
        except Exception as e:
            logger.error(f"Arama hatası: {e}")
            return []

    async def _scrape_url(self, client: httpx.AsyncClient, url: str) -> Optional[Dict[str, str]]:
        try:
            response = await client.get(url, headers=HEADERS, timeout=15.0, follow_redirects=True)
            if response.status_code != 200: return None
            
            soup = BeautifulSoup(response.text, 'html.parser')
            for script in soup(["script", "style", "nav", "footer", "header"]): script.decompose()
            
            text = ' '.join(soup.get_text(separator=' ', strip=True).split())
            if len(text) < 100: return None
            
            return {"url": url, "content": text[:4000]}
        except:
            return None

    async def _synthesize_with_gemini(self, query: str, contents: List[Dict[str, str]], source_type: str) -> str:
        if not self.model: return "API Key eksik, özetleme yapılamadı."
        
        context = "\n".join([f"--- {i['url']} ---\n{i['content']}\n" for i in contents])
        prompt = f"""Kullanıcı Sorusu: "{query}"
        Veriler ({'RESMİ' if source_type == 'trusted' else 'GENEL'}): {context}
        GÖREV: Soruyu bu verilere dayanarak, hukuki bir dille Türkçe cevapla. Kaynakların güvenilirliğini belirt."""
        
        try:
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(None, self.model.generate_content, prompt)
            return response.text
        except Exception as e:
            return f"Özetleme hatası: {e}"

    async def run(self, user_query: str) -> WebResult:
        # 1. Aşama: Resmi Kaynaklar
        links = self._search_duckduckgo(user_query, strict_mode=True)
        sType = "trusted"

        # 2. Aşama: Genel Arama
        if not links:
            links = self._search_duckduckgo(user_query, strict_mode=False)
            sType = "general"

        if not links:
            return WebResult(found=False, summary="Kaynak bulunamadı.", source_type="none")

        # Veri Çekme
        async with httpx.AsyncClient() as client:
            tasks = [self._scrape_url(client, url) for url in links]
            results = await asyncio.gather(*tasks)
            data = [r for r in results if r]

        if not data:
             return WebResult(found=False, summary="Siteler okunamadı.", source_links=links, source_type=sType)

        summary = await self._synthesize_with_gemini(user_query, data, sType)
        
        return WebResult(
            found=True,
            source_type=sType,
            summary=summary,
            source_links=[d['url'] for d in data],
            raw_data=data
        )