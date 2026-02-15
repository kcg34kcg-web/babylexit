import os
import asyncio
import logging
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

# --- YENİ SDK ---
from google import genai
from google.genai import types

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

# -----------------------------------------------------------------------------
# VERİ MODELLERİ
# -----------------------------------------------------------------------------

class WebResult(BaseModel):
    found: bool = Field(default=False, description="Bilgi bulundu mu?")
    source_type: str = Field(default="unknown", description="trusted (resmi) veya general (genel)")
    summary: str = Field(default="", description="Bulunan bilgilerin yapay zeka özeti")
    source_links: List[str] = Field(default_factory=list, description="Bilginin alındığı kaynak linkler")
    raw_data: List[Dict[str, str]] = Field(default_factory=list, description="Debug için ham veri")

    # Geriye dönük uyumluluk (Eski kodlar .content ararsa patlamasın)
    @property
    def content(self):
        return self.summary

# -----------------------------------------------------------------------------
# WEB SEARCH LAYER
# -----------------------------------------------------------------------------

class WebLayer:
    def __init__(self):
        """
        Web Arama Katmanı başlatıcı.
        DuckDuckGo yerine Google GenAI Search Tool kullanılır.
        """
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.client = None
        self.model_name = "gemini-2.0-flash"
        
        if self.api_key:
            try:
                # Yeni SDK Client Başlatma
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Google Client başlatılamadı: {e}")
        else:
            logger.warning("GEMINI_API_KEY bulunamadı. Web araması çalışmayabilir.")

    def _is_url_trusted(self, url: str) -> bool:
        """URL'in güvenilir listede olup olmadığını kontrol eder."""
        try:
            from urllib.parse import urlparse
            domain = urlparse(url).netloc.lower()
            
            if any(allowed in domain for allowed in ALLOWED_DOMAINS): return True
            if any(domain.endswith(ext) for ext in TRUSTED_EXTENSIONS): return True
            return False
        except:
            return False

    async def search(self, query: str) -> WebResult:
        """
        Google Search Tool kullanarak internetten güncel bilgi çeker.
        Bu metod Rate Limit sorununu çözer.
        """
        if not self.client:
            return WebResult(found=False, summary="API Key eksik, arama yapılamadı.", source_type="error")

        logger.info(f"🌍 Web Araması Yapılıyor (Google Tool): {query}")

        try:
            # 1. Google Arama Aracını Tanımla
            google_search_tool = types.Tool(
                google_search=types.GoogleSearch()
            )

            # 2. Prompt Hazırla (Güvenilir Kaynak Vurgusuyla)
            prompt = f"""
            Sen uzman bir hukuk asistanısın. Aşağıdaki konuyu internette araştır ve özetle.
            
            KONU: "{query}"
            
            KURALLAR:
            1. Öncelikle şu kaynaklardan bilgi bulmaya çalış: {', '.join(ALLOWED_DOMAINS)}
            2. Bulduğun bilgileri hukuki bir dille Türkçe özetle.
            3. Hangi kaynakları kullandığını metin içinde belirtme, sadece bilgiyi ver.
            4. Cevap yoksa "Bilgi bulunamadı" de.
            """

            # 3. Modeli Çağır (Asenkron Wrapper ile)
            # Google'ın yeni SDK'sı şu an native async tam desteklemediği için executor kullanıyoruz
            loop = asyncio.get_running_loop()
            
            def call_model():
                return self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        tools=[google_search_tool],
                        response_mime_type="text/plain"
                    )
                )

            response = await loop.run_in_executor(None, call_model)

            # 4. Kaynakları Ayıkla (Grounding Metadata)
            sources = []
            source_type = "general"
            
            if response.candidates and response.candidates[0].grounding_metadata:
                metadata = response.candidates[0].grounding_metadata
                if metadata.grounding_chunks:
                    for chunk in metadata.grounding_chunks:
                        if chunk.web:
                            uri = chunk.web.uri or ""
                            if uri:
                                sources.append(uri)
                                # Eğer kaynaklarımızdan biri varsa tipi 'trusted' yap
                                if self._is_url_trusted(uri):
                                    source_type = "trusted"

            unique_sources = list(set(sources))
            summary_text = response.text if response.text else "Arama yapıldı ancak metin oluşturulamadı."

            # 5. Sonuç Dön
            return WebResult(
                found=True,
                source_type=source_type,
                summary=summary_text,
                source_links=unique_sources,
                raw_data=[{"url": s, "content": "Google Search Result"} for s in unique_sources]
            )

        except Exception as e:
            logger.error(f"❌ Web Search Hatası: {e}")
            return WebResult(
                found=False, 
                summary=f"Arama sırasında hata oluştu: {str(e)}", 
                source_type="error"
            )

# Test Bloğu
if __name__ == "__main__":
    async def main():
        agent = WebLayer()
        print("\n--- TEST: Web Araması ---")
        res = await agent.search("2025 avukatlık asgari ücret tarifesi resmi gazete")
        print(f"Sonuç: {res.found}, Kaynak Tipi: {res.source_type}")
        print(f"Özet: {res.summary[:200]}...")
        print(f"Linkler: {res.source_links}")

    if os.getenv("GEMINI_API_KEY"):
        asyncio.run(main())