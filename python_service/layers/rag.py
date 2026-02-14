import os
import json
import asyncio
import logging
from typing import List, Dict, Any, Optional, Callable

import google.generativeai as genai
from supabase import Client
from flashrank import Ranker, RerankRequest # pip install flashrank

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Gemini Konfigürasyonu ---
MODEL_NAME = "gemini-1.5-flash" # json_mode desteği için 1.5-flash daha kararlı çalışır

class InternalRAGAgent:
    def __init__(self, supabase_client: Client, embedding_fn: Callable[[str], List[float]]):
        """
        :param supabase_client: Supabase bağlantısı
        :param embedding_fn: Main.py'dan gelen yerel embedding fonksiyonu (BGE-M3)
        """
        self.supabase = supabase_client
        self.embedding_fn = embedding_fn # <-- KRİTİK: Embedding yeteneği kazandırıldı
        self.api_key = os.getenv("GEMINI_API_KEY")
        
        if self.api_key:
            genai.configure(api_key=self.api_key)
            
            # 1. Avukat Karakteri (Cevaplayıcı)
            self.answer_model = genai.GenerativeModel(
                model_name=MODEL_NAME,
                system_instruction="""
                Sen Babylexit'in Kıdemli Hukuk Danışmanısın.
                Görevin: Sana verilen 'BELGE BAĞLAMI'nı kullanarak kullanıcı sorusunu yanıtlamak.
                Kurallar:
                1. Sadece verilen bağlamdaki bilgileri kullan. Bilgi yoksa uydurma.
                2. Cevapların profesyonel ve hukuki terminolojiye uygun olsun.
                3. Kaynak ismini (dosya adı) cevabın sonunda belirt.
                """
            )

            # 2. Araç Modeli (Sorgu Genişletici - JSON Mode)
            self.tool_model = genai.GenerativeModel(
                model_name=MODEL_NAME,
                generation_config={"response_mime_type": "application/json"}
            )
        
        # 3. FlashRank (Reranker) - Başlangıçta yüklenir
        print("⚖️ RAG: FlashRank Reranker yükleniyor...")
        self.ranker = Ranker(model_name="ms-marco-TinyBERT-L-2-v2")

    async def _expand_query(self, query: str) -> List[str]:
        """Gemini ile soruyu çeşitlendirir."""
        prompt = f"""
        Kullanıcı hukuk sorusu sordu: "{query}"
        Veritabanı araması için 3 alternatif arama terimi üret.
        SADECE JSON listesi dön: ["terim1", "terim2", "terim3"]
        """
        try:
            resp = await self.tool_model.generate_content_async(prompt)
            return json.loads(resp.text)
        except Exception as e:
            logger.error(f"Query Expansion Hatası: {e}")
            return [query]

    async def retrieve_documents(self, embedding: List[float], limit: int = 10) -> List[Dict]:
        """Tek bir embedding için Supabase araması."""
        try:
            response = self.supabase.rpc(
                "match_documents",
                {
                    "query_embedding": embedding,
                    "match_threshold": 0.30, # Gelişmiş aramada threshold'u düşürüp Reranker'a güveniyoruz
                    "match_count": limit
                }
            ).execute()
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"DB Retrieval Hatası: {e}")
            return []

    async def generate_answer(self, query: str, context_docs: List[Dict]) -> Dict[str, Any]:
        """Bağlamı kullanarak cevap üretir."""
        if not context_docs:
            return {
                "answer": "Veri tabanımda bu konuyla ilgili yeterli hukuki dayanak bulamadım. Genel hukuk kuralları çerçevesinde yardımcı olmamı ister misiniz?",
                "sources": []
            }

        context_text = ""
        sources = []
        for doc in context_docs:
            meta = doc.get('metadata') or {}
            # Metadata bazen string gelebilir, kontrol et
            if isinstance(meta, str):
                try: meta = json.loads(meta)
                except: meta = {}
                
            source_name = meta.get('source', 'Bilinmeyen Belge')
            context_text += f"---\n[KAYNAK: {source_name}]\nİÇERİK: {doc.get('content')}\n"
            if source_name not in sources:
                sources.append(source_name)

        prompt = f"BELGE BAĞLAMI:\n{context_text}\n\nKULLANICI SORUSU:\n{query}\n\nLütfen yanıtla."

        try:
            response = await self.answer_model.generate_content_async(prompt)
            return {"answer": response.text, "sources": sources}
        except Exception as e:
            return {"answer": "Cevap üretilirken hata oluştu.", "sources": []}

    async def process(self, query: str, initial_embedding: List[float]) -> Dict[str, Any]:
        """
        KADEMELİ ARAMA (TIERED SEARCH):
        Adım 1: Hızlı Arama (Mevcut Embedding ile)
        Adım 2: (Gerekirse) Gelişmiş Arama (Expansion + Reranking)
        """
        print(f"⚖️ RAG Başlıyor: '{query}'")

        # --- AŞAMA 1: Hızlı Kontrol ---
        docs = await self.retrieve_documents(initial_embedding, limit=5)
        
        # Karar Mekanizması: En iyi sonuç 0.75'ten düşükse Gelişmiş Arama'ya geç
        # Not: Supabase RPC genellikle similarity skoru döner.
        best_score = docs[0]['similarity'] if docs and 'similarity' in docs[0] else 0
        print(f"📊 İlk Arama En İyi Skor: {best_score}")

        if best_score > 0.75:
            print("✅ Hızlı arama yeterli bulundu.")
            return await self.generate_answer(query, docs)

        # --- AŞAMA 2: Derinlemesine Araştırma ---
        print("⚠️ Skor düşük, Gelişmiş Arama (Tier 2) başlatılıyor...")
        
        # 1. Genişlet
        variations = await self._expand_query(query)
        search_queries = [query] + variations
        print(f"🔍 Varyasyonlar: {variations}")

        # 2. Paralel Embedding & Arama
        # Not: embedding_fn main.py'da CPU'da çalışıyor, bloklamaması için to_thread
        all_docs = []
        
        for q in search_queries:
            # Main.py'dan gelen fonksiyonu kullan
            vec = await asyncio.to_thread(self.embedding_fn, q)
            if vec:
                res = await self.retrieve_documents(vec, limit=10)
                all_docs.extend(res)

        # 3. Tekilleştirme (Deduplication)
        unique_docs = {d['id']: d for d in all_docs}.values()
        doc_list = list(unique_docs)
        
        if not doc_list:
            return await self.generate_answer(query, [])

        # 4. Reranking (Yeniden Sıralama)
        passages = [
            {"id": str(d['id']), "text": d['content'], "meta": d.get('metadata')} 
            for d in doc_list
        ]
        
        try:
            rerank_req = RerankRequest(query=query, passages=passages)
            ranked = await asyncio.to_thread(self.ranker.rank, rerank_req)
            
            # En iyi 5'i al (Skor > 0.60 filtresi eklenebilir)
            top_docs_data = [r for r in ranked if r['score'] > 0.60][:5]
            
            # Orijinal formata geri dön
            final_docs = []
            for r in top_docs_data:
                final_docs.append({
                    "content": r['text'],
                    "metadata": r.get('meta')
                })
            print(f"🏆 Rerank Sonrası Seçilen: {len(final_docs)} belge")
            
        except Exception as e:
            logger.error(f"Rerank hatası: {e}")
            final_docs = doc_list[:5]

        return await self.generate_answer(query, final_docs)