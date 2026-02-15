import os
import logging
from typing import Optional, Any
from pydantic import BaseModel
from google import genai
from google.genai import types

# Loglama
logger = logging.getLogger(__name__)

class AuthorResult(BaseModel):
    final_markdown: str
    status: str = "completed"

class AuthorLayer:
    def __init__(self):
        # API Anahtarını al (Environment değişkenlerinden)
        self.api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        self.model_name = "gemini-2.0-flash"
        self.client = None
        
        # Client'ı güvenli başlat (API key yoksa None kalır, program çökmez)
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Google GenAI Client başlatılamadı: {e}")
        else:
            logger.warning("⚠️ AuthorLayer için API Key bulunamadı. Raporlama çalışmayabilir.")

    def _prepare_context(self, 
                         rag_data: Optional[Any], 
                         web_data: Optional[Any], 
                         expert_data: Optional[Any]) -> str:
        """Gelen ham verileri okunabilir bir bağlam metnine dönüştürür."""
        context_parts = []

        # RAG Verisi (Mevzuat)
        # Not: Orijinal kodda .text aranıyordu, rag.py'de context_str olabilir. İkisini de deniyoruz.
        if rag_data and getattr(rag_data, 'found', False):
            text_content = getattr(rag_data, 'context_str', getattr(rag_data, 'text', ''))
            context_parts.append(f"--- MEVZUAT VE İÇTİHAT (RAG) ---\n{text_content}\n")
        
        # Web Verisi (Haberler)
        if web_data and getattr(web_data, 'found', False):
            summary_content = getattr(web_data, 'context_str', getattr(web_data, 'summary', ''))
            context_parts.append(f"--- GÜNCEL WEB HABERLERİ ---\n{summary_content}\n")
        
        # Uzman Görüşü
        if expert_data:
            answer_content = getattr(expert_data, 'answer', '')
            context_parts.append(f"--- UZMAN AI GÖRÜŞÜ ---\n{answer_content}\n")
        
        if not context_parts:
            return "Elimizde yeterli veri yok."
            
        return "\n".join(context_parts)

    def write_report(self, 
                     query: str, 
                     rag_result: Optional[Any] = None, 
                     web_result: Optional[Any] = None, 
                     expert_result: Optional[Any] = None) -> AuthorResult:
        
        if not self.client:
            return AuthorResult(
                final_markdown="⚠️ API Anahtarı eksik olduğu için rapor oluşturulamadı. Lütfen .env dosyasını kontrol edin.", 
                status="error"
            )

        context_str = self._prepare_context(rag_result, web_result, expert_result)
        
        prompt = f"""
        Sen BabyLexit Raporlayıcısısın. Görevin, aşağıdaki verileri sentezleyerek kullanıcıya Markdown formatında şık, okunabilir ve profesyonel bir hukuki asistan raporu hazırlamaktır.

        KULLANICI SORUSU: {query}

        MEVCUT VERİLER:
        {context_str}

        TALİMATLAR:
        1. Asla veri dışına çıkma, halüsinasyon görme.
        2. Samimi ama profesyonel bir dil kullan (Sen bir asistan botusun).
        3. Raporu şu başlıklarla yapılandır (Markdown H2 veya H3 kullan):
           - 📌 Özet: Durumun kısa ve net özeti.
           - ⚖️ Mevzuat ve Detaylı Analiz: Kanun maddeleri veya detaylı açıklamalar.
           - ✅ Önerilen Adımlar: Kullanıcı ne yapmalı? (Madde imleri ile).
           - 🔗 Kaynakça: Varsa kanun numaraları veya linkler.

        Eğer veri yetersizse, dürüstçe "Bu konuda yeterli bilgiye ulaşamadım" de.
        """

        try:
            # Yeni SDK kullanımı (google-genai)
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            return AuthorResult(final_markdown=response.text)
        except Exception as e:
            logger.error(f"Author layer failed: {e}")
            return AuthorResult(
                final_markdown="⚠️ Rapor oluşturulurken bir hata meydana geldi. Lütfen tekrar deneyin.",
                status="error"
            )