import os
import asyncio
import logging
from typing import List, Dict, Optional
import httpx
from bs4 import BeautifulSoup
from duckduckgo_search import AsyncDDGS
import google.generativeai as genai
from pydantic import BaseModel, Field

# Logger yapılandırması
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------------
# YAPILANDIRMA VE SABİTLER
# -----------------------------------------------------------------------------

# Güvenilir kaynaklar listesi (Whitelist)
ALLOWED_DOMAINS = [
    "resmigazete.gov.tr",
    "mevzuat.gov.tr",
    "turkiye.gov.tr",
    "yargitay.gov.tr",
    "anayasa.gov.tr",
    "barobirlik.org.tr",
    "istanbulbarosu.org.tr",
    "ankarabarosu.org.tr",
    "wikipedia.org",
    "hukukihaber.net"  # Örnek güvenilir haber kaynağı
]

# Sadece bu uzantılara güven (Ekstra güvenlik katmanı)
TRUSTED_EXTENSIONS = [".gov.tr", ".edu.tr", ".org.tr"]

# User-Agent (Bot korumalarını aşmak için)
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

# -----------------------------------------------------------------------------
# VERİ MODELLERİ (PYDANTIC)
# -----------------------------------------------------------------------------

class WebResult(BaseModel):
    found: bool = Field(default=False, description="Bilgi bulundu mu?")
    summary: str = Field(default="", description="Bulunan bilgilerin yapay zeka özeti")
    source_links: List[str] = Field(default_factory=list, description="Bilginin alındığı kaynak linkler")
    raw_data: List[Dict[str, str]] = Field(default_factory=list, description="Debug için ham veri (URL ve içerik)")

# -----------------------------------------------------------------------------
# WEB SEARCH AGENT KATMANI
# -----------------------------------------------------------------------------

class WebSearchLayer:
    def __init__(self):
        """
        Web Arama Katmanı başlatıcı.
        Gemini API anahtarını ortam değişkenlerinden alır.
        """
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.warning("GEMINI_API_KEY bulunamadı. WebSearchLayer özetleme yapamayabilir.")
        
        if api_key:
            genai.configure(api_key=api_key)
            # Talimatlara uygun olarak 2.0 Flash modelini kullanıyoruz
            self.model = genai.GenerativeModel("gemini-2.0-flash")
        else:
            self.model = None

    def _is_url_trusted(self, url: str) -> bool:
        """URL'in güvenilir listede olup olmadığını kontrol eder."""
        try:
            from urllib.parse import urlparse
            domain = urlparse(url).netloc.lower()
            
            # 1. Tam domain kontrolü
            if any(allowed in domain for allowed in ALLOWED_DOMAINS):
                return True
            
            # 2. Uzantı kontrolü (Örn: herhangi bir .gov.tr sitesi)
            if any(domain.endswith(ext) for ext in TRUSTED_EXTENSIONS):
                return True
                
            return False
        except Exception:
            return False

    async def _search_duckduckgo(self, query: str, max_results: int = 10) -> List[str]:
        """DuckDuckGo üzerinde asenkron arama yapar ve güvenilir linkleri döner."""
        trusted_links = []
        
        # Arama operatörleri ile sorguyu güçlendir (Hukuki bağlam)
        # Örn: "Kira artış oranı site:gov.tr OR site:barobirlik.org.tr"
        # Not: Çok uzun search query'ler bazen DDG tarafından reddedilebilir, 
        # bu yüzden broad search yapıp Python tarafında filtrelemek daha güvenlidir.
        search_query = f"{query} hukuk mevzuat" 
        
        logger.info(f"DuckDuckGo araması yapılıyor: {search_query}")

        try:
            results = await AsyncDDGS().text(search_query, max_results=max_results)
            
            if not results:
                logger.info("DuckDuckGo sonuç döndürmedi.")
                return []

            for res in results:
                link = res.get('href')
                if link and self._is_url_trusted(link):
                    trusted_links.append(link)
                    if len(trusted_links) >= 3:  # Sadece en iyi 3 link
                        break
            
            logger.info(f"Bulunan güvenilir linkler: {trusted_links}")
            return trusted_links

        except Exception as e:
            logger.error(f"Arama sırasında hata oluştu: {str(e)}")
            return []

    async def _scrape_url(self, client: httpx.AsyncClient, url: str) -> Optional[Dict[str, str]]:
        """Verilen URL'e gider ve içeriği temizleyerek çeker."""
        try:
            response = await client.get(url, headers=HEADERS, timeout=10.0, follow_redirects=True)
            
            if response.status_code != 200:
                logger.warning(f"Linke erişilemedi ({response.status_code}): {url}")
                return None

            soup = BeautifulSoup(response.text, 'html.parser')

            # Gereksiz elementleri temizle
            for script in soup(["script", "style", "nav", "footer", "header", "aside", "form"]):
                script.decompose()

            # Metni al ve temizle
            text = soup.get_text(separator=' ', strip=True)
            
            # Aşırı boşlukları temizle
            clean_text = ' '.join(text.split())

            # İlk 2500 karakteri al (Token tasarrufu ve odaklanma)
            truncated_text = clean_text[:2500]

            return {
                "url": url,
                "content": truncated_text
            }

        except Exception as e:
            logger.error(f"Scraping hatası ({url}): {str(e)}")
            return None

    async def _synthesize_with_gemini(self, query: str, contents: List[Dict[str, str]]) -> str:
        """Toplanan içerikleri Gemini 2.0 Flash ile özetler."""
        if not self.model:
            return "API Key eksik olduğu için özetleme yapılamadı."

        # Context oluşturma
        context_text = ""
        for item in contents:
            context_text += f"\n--- KAYNAK: {item['url']} ---\n{item['content']}\n"

        prompt = f"""
        Sen uzman bir hukuk asistanısın. Aşağıdaki metinler, kullanıcının sorusu için güvenilir internet kaynaklarından (resmi gazete, mevzuat, barolar vb.) toplandı.
        
        KULLANICI SORUSU: "{query}"

        TOPLANAN VERİLER:
        {context_text}

        GÖREV:
        Bu verileri kullanarak kullanıcının sorusuna doğrudan, net ve hukuki dille yanıt ver.
        - Varsa ilgili kanun maddelerini, tarihleri ve resmi gazete sayılarını belirt.
        - Eğer metinlerde soruyla ilgili kesin bilgi yoksa, genel bilgileri özetle ama "Kesin bilgi metinlerde bulunamadı" diye not düş.
        - Yanıtın Türkçe olsun.
        """

        try:
            # Gemini 2.0 Flash asenkron çağrısı (veya senkron wrapper)
            # Not: google-generativeai kütüphanesinin şu anki sürümünde generate_content genellikle senkrondur,
            # thread içinde çalıştırarak asenkron akışı bozmamasını sağlıyoruz.
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(None, self.model.generate_content, prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini sentez hatası: {str(e)}")
            return "Veriler toplandı ancak yapay zeka özeti oluşturulurken bir hata meydana geldi."

    async def run(self, user_query: str) -> WebResult:
        """
        Ana çalışma fonksiyonu.
        Arama -> Filtreleme -> Kazıma -> Özetleme akışını yönetir.
        """
        try:
            # 1. Arama ve Link Toplama
            target_links = await self._search_duckduckgo(user_query)
            
            if not target_links:
                return WebResult(
                    found=False, 
                    summary="Güvenilir kaynaklarda (gov.tr, barolar vb.) bu konuyla ilgili güncel bir veri bulunamadı.",
                    source_links=[]
                )

            # 2. İçerik Kazıma (Scraping) - Paralel İstekler
            scraped_data = []
            async with httpx.AsyncClient() as client:
                tasks = [self._scrape_url(client, url) for url in target_links]
                results = await asyncio.gather(*tasks)
                
                # None olmayan sonuçları filtrele
                scraped_data = [res for res in results if res is not None]

            if not scraped_data:
                return WebResult(
                    found=False,
                    summary="İlgili linkler bulundu ancak içerikleri okunamadı (Erişim engeli veya teknik hata).",
                    source_links=target_links
                )

            # 3. Sentez (AI Summary)
            summary = await self._synthesize_with_gemini(user_query, scraped_data)

            # 4. Sonuç Döndürme
            return WebResult(
                found=True,
                summary=summary,
                source_links=[d['url'] for d in scraped_data],
                raw_data=scraped_data
            )

        except Exception as e:
            logger.critical(f"WebSearchLayer kritik hata: {str(e)}")
            return WebResult(found=False, summary="Sistemde beklenmedik bir hata oluştu.")

# Test için (Bu dosya doğrudan çalıştırıldığında)
if __name__ == "__main__":
    async def main():
        agent = WebSearchLayer()
        query = "2026 yılı kira artış oranı resmi gazete"
        print(f"Sorgulanıyor: {query}...")
        result = await agent.run(query)
        print("\n--- SONUÇ ---")
        print(f"Durum: {result.found}")
        print(f"Özet: {result.summary}")
        print(f"Linkler: {result.source_links}")

    if os.getenv("GEMINI_API_KEY"):
        asyncio.run(main())
    else:
        print("Test etmek için GEMINI_API_KEY ortam değişkenini ayarlayın.")