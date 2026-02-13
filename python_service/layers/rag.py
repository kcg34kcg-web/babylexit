import os
import google.generativeai as genai
from supabase import Client
from typing import List, Dict, Any, Optional

# --- Gemini 3.0 Konfigürasyonu ---
# Not: Eğer 'gemini-3-flash-preview' henüz API'de aktif değilse 'gemini-1.5-flash' kullanabilirsin.
MODEL_NAME = "gemini-3-flash-preview"

class InternalRAGAgent:
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.api_key = os.getenv("GEMINI_API_KEY")
        
        if self.api_key:
            genai.configure(api_key=self.api_key)
            # Avukat karakteri için Gemini modelini hazırlıyoruz
            self.model = genai.GenerativeModel(
                model_name=MODEL_NAME,
                system_instruction="""
                Sen Babylexit'in Kıdemli Hukuk Danışmanısın.
                Görevin: Sana verilen 'BELGE BAĞLAMI'nı (Context) kullanarak kullanıcı sorusunu yanıtlamak.
                
                Kurallar:
                1. Sadece verilen bağlamdaki bilgileri kullan. Bağlamda cevap yoksa "Bu konuda veri tabanımda yeterli bilgi bulamadım." de.
                2. Cevapların profesyonel, net ve hukuki terminolojiye uygun olsun ama anlaşılır olsun.
                3. Kesinlikle kanun maddesi veya vaka uydurma (Halüsinasyon görme).
                4. Varsa belgedeki kaynak ismini (dosya adı vs.) cevabın sonunda referans ver.
                """
            )

    async def retrieve_documents(self, embedding: List[float], limit: int = 5) -> List[Dict]:
        """
        Supabase'den benzer döküman parçalarını getirir.
        Not: Bu fonksiyonun çalışması için SQL tarafında 'match_documents' fonksiyonu olmalıdır.
        """
        try:
            # SQL'de oluşturduğumuz match_documents fonksiyonunu çağırıyoruz
            response = self.supabase.rpc(
                "match_documents",
                {
                    "query_embedding": embedding, # BGE-M3'ten gelen 1024 boyutlu vektör
                    "match_threshold": 0.55,      # Benzerlik eşiği (Hukuk metinleri için biraz esnek tutuyoruz)
                    "match_count": limit
                }
            ).execute()
            
            return response.data if response.data else []
        except Exception as e:
            print(f"RAG Retrieval Hatası: {e}")
            return []

    async def generate_answer(self, query: str, context_docs: List[Dict]) -> Dict[str, Any]:
        """Gemini ile belgeleri okuyup cevap üretir."""
        
        if not context_docs:
            return {
                "answer": "Üzgünüm, veri tabanında bu konuyla ilgili (benzerlik eşiğini geçen) döküman bulamadım. İsterseniz genel web araması yapabilirim.",
                "sources": []
            }

        # Bağlamı metne döküyoruz
        context_text = ""
        sources = []
        for doc in context_docs:
            meta = doc.get('metadata', {}) or {}
            source_name = meta.get('source', 'Bilinmeyen Belge')
            
            # Context'i zenginleştiriyoruz
            context_text += f"---\n[KAYNAK: {source_name}]\nİÇERİK: {doc.get('content')}\n"
            
            if source_name not in sources:
                sources.append(source_name)

        prompt = f"""
        BELGE BAĞLAMI:
        {context_text}

        KULLANICI SORUSU: 
        {query}

        Lütfen yukarıdaki bağlamı analiz ederek soruyu cevapla.
        """

        try:
            # Gemini'ye sor (Asenkron)
            response = await self.model.generate_content_async(prompt)
            return {
                "answer": response.text,
                "sources": sources
            }
        except Exception as e:
            print(f"RAG Generation Hatası: {e}")
            return {
                "answer": "Cevap üretilirken bir hata oluştu. Lütfen tekrar deneyin.", 
                "sources": []
            }

    async def process(self, query: str, query_embedding: List[float]) -> Dict[str, Any]:
        """Ana işlem fonksiyonu: Ara -> Bul -> Cevapla"""
        print(f"⚖️ Hukuk Uzmanı (RAG) Çalışıyor: '{query}'")
        
        # 1. Belgeleri bul (Retrieve)
        docs = await self.retrieve_documents(query_embedding)
        print(f"📄 Bulunan İlgili Parça Sayısı: {len(docs)}")
        
        # 2. Cevabı yaz (Generate)
        result = await self.generate_answer(query, docs)
        
        return result