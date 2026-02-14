import os
import logging
from typing import Optional, Dict, Any
from pydantic import BaseModel
import google.generativeai as genai

# Loglama
logger = logging.getLogger(__name__)

# Supabase veya environment'tan API key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

class AuthorResult(BaseModel):
    final_markdown: str
    status: str = "completed"

class AuthorLayer:
    def __init__(self):
        self.model_name = "gemini-2.0-flash"
        self.model = genai.GenerativeModel(self.model_name)

    def _prepare_context(self, 
                         rag_data: Optional[Any], 
                         web_data: Optional[Any], 
                         expert_data: Optional[Any]) -> str:
        """Gelen ham verileri okunabilir bir bağlam metnine dönüştürür."""
        context_parts = []

        if rag_data and getattr(rag_data, 'found', False):
            context_parts.append(f"--- MEVZUAT VE İÇTİHAT (RAG) ---\n{rag_data.text}\n")
        
        if web_data and getattr(web_data, 'found', False):
            context_parts.append(f"--- GÜNCEL WEB HABERLERİ ---\n{web_data.summary}\n")
        
        if expert_data:
            context_parts.append(f"--- UZMAN AI GÖRÜŞÜ ---\n{expert_data.answer}\n")
        
        if not context_parts:
            return "Elimizde yeterli veri yok."
            
        return "\n".join(context_parts)

    def write_report(self, 
                     query: str, 
                     rag_result: Optional[Any] = None, 
                     web_result: Optional[Any] = None, 
                     expert_result: Optional[Any] = None) -> AuthorResult:
        
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
            response = self.model.generate_content(prompt)
            return AuthorResult(final_markdown=response.text)
        except Exception as e:
            logger.error(f"Author layer failed: {e}")
            return AuthorResult(
                final_markdown="⚠️ Rapor oluşturulurken bir hata meydana geldi. Lütfen tekrar deneyin.",
                status="error"
            )