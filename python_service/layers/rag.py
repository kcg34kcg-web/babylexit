import os
import json
import asyncio
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field
import google.generativeai as genai
from supabase import create_client, Client
from flashrank import Ranker, RerankRequest

# --- AYARLAR ---
# 0 TL Stratejisi: Google Search'i sadece çok gerektiğinde kullan.
# Eğer API kotan biterse burayı False yap, sistem sadece veritabanından çalışsın.
ENABLE_WEB_SEARCH = True 

# Resmi Kaynaklar (Web araması yaparsa buraya odaklansın)
TRUSTED_LEGAL_SITES = [
    "resmigazete.gov.tr", "mevzuat.gov.tr", "tbmm.gov.tr", 
    "anayasa.gov.tr", "danistay.gov.tr", "yargitay.gov.tr"
]

MODEL_NAME = "gemini-2.0-flash" 
EMBEDDING_MODEL = "models/text-embedding-004" # DİKKAT: Bu model 768 boyutludur.

# --- Veri Modelleri ---

class RagResult(BaseModel):
    found: bool
    source_type: str = Field(description="'internal' veya 'external'")
    context_str: str
    sources: List[str]
    chunks: List[Dict[str, Any]]

class QueryIntent(BaseModel):
    category: Literal["FACTUAL", "INTERNAL"]
    reasoning: str

# --- RAG Katmanı ---

class RagLayer:
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY eksik!")
        genai.configure(api_key=self.api_key)
        
        # 1. Router & Chat Modeli (Hızlı ve Ucuz)
        self.llm = genai.GenerativeModel(
            MODEL_NAME,
            generation_config={"response_mime_type": "application/json"}
        )
        
        # 2. Web Arama Modeli (Sadece ihtiyaç anında yüklenir)
        if ENABLE_WEB_SEARCH:
            self.web_model = genai.GenerativeModel(
                MODEL_NAME,
                tools=[{'google_search': {}}]
            )

        # 3. Supabase Bağlantısı
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not self.supabase_url:
            raise ValueError("SUPABASE Credentials eksik!")
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)

        # 4. Reranker (Yerel ve Bedava)
        print("⚡ FlashRank (CPU) yükleniyor...")
        self.ranker = Ranker(model_name="ms-marco-TinyBERT-L-2-v2", cache_dir="./.flashrank_cache")

    async def _get_embedding(self, text: str) -> List[float]:
        """
        Google Embedding (004) kullanır. 
        UYARI: Çıktı 768 boyutludur. Supabase'deki kolonun vector(768) olması ŞARTTIR.
        """
        loop = asyncio.get_running_loop()
        try:
            result = await loop.run_in_executor(
                None, 
                lambda: genai.embed_content(
                    model=EMBEDDING_MODEL,
                    content=text,
                    task_type="retrieval_query"
                )
            )
            return result['embedding']
        except Exception as e:
            print(f"⚠️ Embedding Hatası: {e}")
            return []

    async def _classify_intent(self, query: str) -> QueryIntent:
        """Sorguyu basitçe ikiye ayırır: İçeri mi bakayım, dışarı mı?"""
        prompt = f"""
        Bu hukuk asistanı için gelen sorguyu analiz et: "{query}"
        
        İki seçenek var:
        1. "INTERNAL": Kullanıcının davası, dilekçesi, özel dosyaları veya karmaşık hukuk analizi. (Varsayılan budur)
        2. "FACTUAL": Genel geçer bilgi sorusu (Örn: "Hava nasıl?", "Dolar kaç?", "Bugün tatil mi?").
        
        Cevabı JSON ver: {{ "category": "...", "reasoning": "..." }}
        """
        try:
            resp = await self.llm.generate_content_async(prompt)
            return QueryIntent.model_validate_json(resp.text)
        except:
            return QueryIntent(category="INTERNAL", reasoning="Fail-safe")

    async def _search_supabase(self, query: str) -> List[Dict]:
        """Veritabanında vektör araması yapar."""
        vector = await self._get_embedding(query)
        if not vector: return []
        
        try:
            # Supabase RPC
            # Not: match_documents fonksiyonunun vector(768) kabul ettiğinden emin ol.
            res = self.supabase.rpc('match_documents', {
                'query_embedding': vector,
                'match_threshold': 0.5, 
                'match_count': 10
            }).execute()
            return res.data if res.data else []
        except Exception as e:
            print(f"⚠️ DB Hatası: {e}")
            return []

    async def _web_fallback(self, query: str) -> RagResult:
        """Google Araması yapar (0 TL bütçe için sadece zorunlu hallerde)"""
        if not ENABLE_WEB_SEARCH:
            return RagResult(found=False, source_type="none", context_str="", sources=[], chunks=[])
            
        print(f"🌍 Web Araması Yapılıyor: {query}")
        try:
            # Sadece güvenilir siteleri ekle (Prompt Engineering ile maliyetsiz filtre)
            sites = " OR ".join([f"site:{s}" for s in TRUSTED_LEGAL_SITES])
            prompt = f"Soruyu şu resmi kaynaklara göre cevapla ({sites}): {query}"
            
            resp = await self.web_model.generate_content_async(prompt)
            
            # Kaynakları ayıkla
            sources = []
            if resp.candidates and resp.candidates[0].grounding_metadata:
                for chunk in resp.candidates[0].grounding_metadata.grounding_chunks:
                    if hasattr(chunk, 'web'):
                        sources.append(chunk.web.title or chunk.web.uri)

            return RagResult(
                found=True,
                source_type="external",
                context_str=resp.text,
                sources=list(set(sources)),
                chunks=[]
            )
        except Exception as e:
            print(f"❌ Web Search Kotası/Hatası: {e}")
            return RagResult(found=False, source_type="error", context_str="", sources=[], chunks=[])

    async def process(self, query: str) -> RagResult:
        print(f"🚀 İşleniyor: {query}")
        
        # 1. Router: Saçma sorular için veritabanını yorma
        intent = await self._classify_intent(query)
        if intent.category == "FACTUAL":
            print("💡 Genel bilgi sorusu tespit edildi.")
            return await self._web_fallback(query)

        # 2. Veritabanı Araması (Internal)
        docs = await self._search_supabase(query)
        
        # 3. Sonuç Yoksa -> Web'e Git (Fallback)
        if not docs:
            print("⚠️ Veritabanında bulunamadı -> Web'e gidiliyor.")
            return await self._web_fallback(query)

        # 4. Reranking (Bulunanları Sırala)
        passages = [
            {"id": str(d['id']), "text": d.get('content', ''), "meta": d.get('metadata', {})} 
            for d in docs
        ]
        rerank_req = RerankRequest(query=query, passages=passages)
        ranked = self.ranker.rerank(rerank_req)
        
        # En iyi 5 sonuç
        final = ranked[:5]

        # Eğer Rerank sonucu bile çok kötüyse (Skor < 0.20), Web'e git
        if not final or final[0]['score'] < 0.20:
             print("⚠️ Sonuçlar yetersiz -> Web'e gidiliyor.")
             return await self._web_fallback(query)

        # 5. Internal Cevap Hazırlığı
        context = "\n---\n".join([f"Kaynak: {i['meta'].get('source')}\n{i['text']}" for i in final])
        
        return RagResult(
            found=True,
            source_type="internal",
            context_str=context,
            sources=[i['meta'].get('source') for i in final],
            chunks=final
        )

# Test Bloğu
if __name__ == "__main__":
    async def main():
        rag = RagLayer()
        # Test: Veritabanında olmayan bir şey soralım
        res = await rag.process("İstanbul bugün kaç derece?")
        print(f"Kaynak: {res.source_type}")
        print(res.context_str[:200])

    asyncio.run(main())