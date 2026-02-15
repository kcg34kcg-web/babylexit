import os
import asyncio
from typing import List, Dict, Any, Literal
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from supabase import create_client, Client
from flashrank import Ranker, RerankRequest

# --- AYARLAR ---
ENABLE_WEB_SEARCH = True 
TRUSTED_LEGAL_SITES = [
    "resmigazete.gov.tr", "mevzuat.gov.tr", "tbmm.gov.tr", 
    "anayasa.gov.tr", "danistay.gov.tr", "yargitay.gov.tr"
]

MODEL_NAME = "gemini-2.0-flash" 
EMBEDDING_MODEL = "text-embedding-004"

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
        # API Anahtarlarını al (Hata fırlatma, sadece logla veya None bırak)
        self.google_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
        
        self.client = None
        self.supabase = None
        self.ranker = None
        
        # FlashRank'i hemen başlatmıyoruz, ilk çağrıda yükleyebiliriz veya try-except ile koruyabiliriz
        try:
            print("⚡ FlashRank (CPU) hazırlanıyor...")
            self.ranker = Ranker(model_name="ms-marco-TinyBERT-L-2-v2", cache_dir="./.flashrank_cache")
        except Exception as e:
            print(f"⚠️ Ranker başlatılamadı: {e}")

    def _connect_google(self):
        """Lazy connection for Google GenAI"""
        if not self.client and self.google_api_key:
            self.client = genai.Client(api_key=self.google_api_key)
        return self.client

    def _connect_supabase(self):
        """Lazy connection for Supabase"""
        if not self.supabase and self.supabase_url and self.supabase_key:
            try:
                self.supabase = create_client(self.supabase_url, self.supabase_key)
            except Exception as e:
                print(f"❌ Supabase Bağlantı Hatası: {e}")
        return self.supabase

    async def _get_embedding(self, text: str) -> List[float]:
        client = self._connect_google()
        if not client: return []
        
        loop = asyncio.get_running_loop()
        try:
            # Yeni SDK Embedding Çağrısı
            result = await loop.run_in_executor(
                None, 
                lambda: client.models.embed_content(
                    model=EMBEDDING_MODEL,
                    contents=text,
                    config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY")
                )
            )
            # embeddings özelliği bir liste döner, biz ilkini alıyoruz
            return result.embeddings[0].values
        except Exception as e:
            print(f"⚠️ Embedding Hatası: {e}")
            return []

    async def _classify_intent(self, query: str) -> QueryIntent:
        client = self._connect_google()
        if not client: return QueryIntent(category="INTERNAL", reasoning="No API Key")

        prompt = f"""
        Bu hukuk asistanı için gelen sorguyu analiz et: "{query}"
        1. "INTERNAL": Hukuk analizi, dava, dosya.
        2. "FACTUAL": Genel bilgi (Dolar, Hava, vb.).
        Cevabı JSON ver: {{ "category": "...", "reasoning": "..." }}
        """
        try:
            resp = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            return QueryIntent.model_validate_json(resp.text)
        except:
            return QueryIntent(category="INTERNAL", reasoning="Fail-safe")

    async def _search_supabase(self, query: str) -> List[Dict]:
        sb = self._connect_supabase()
        if not sb: return []

        vector = await self._get_embedding(query)
        if not vector: return []
        
        try:
            res = sb.rpc('match_documents', {
                'query_embedding': vector,
                'match_threshold': 0.5, 
                'match_count': 10
            }).execute()
            return res.data if res.data else []
        except Exception as e:
            print(f"⚠️ DB Hatası: {e}")
            return []

    async def _web_fallback(self, query: str) -> RagResult:
        if not ENABLE_WEB_SEARCH:
            return RagResult(found=False, source_type="none", context_str="", sources=[], chunks=[])
        
        client = self._connect_google()
        if not client: return RagResult(found=False, source_type="error", context_str="", sources=[], chunks=[])

        print(f"🌍 Web Araması Yapılıyor: {query}")
        try:
            # Yeni SDK ile Google Search Tool kullanımı
            google_search_tool = types.Tool(google_search=types.GoogleSearch())
            
            resp = client.models.generate_content(
                model=MODEL_NAME,
                contents=f"Soruyu şu resmi kaynaklara göre cevapla ({', '.join(TRUSTED_LEGAL_SITES)}): {query}",
                config=types.GenerateContentConfig(
                    tools=[google_search_tool]
                )
            )
            
            sources = []
            # Yeni SDK yanıt yapısında grounding metadata ayrıştırma
            if resp.candidates and resp.candidates[0].grounding_metadata:
                 for chunk in resp.candidates[0].grounding_metadata.grounding_chunks:
                    if chunk.web:
                        sources.append(chunk.web.title or chunk.web.uri)

            return RagResult(
                found=True,
                source_type="external",
                context_str=resp.text,
                sources=list(set(sources)),
                chunks=[]
            )
        except Exception as e:
            print(f"❌ Web Search Hatası: {e}")
            return RagResult(found=False, source_type="error", context_str="", sources=[], chunks=[])

    async def process(self, query: str) -> RagResult:
        print(f"🚀 İşleniyor: {query}")
        
        # API Key kontrolü
        if not self._connect_google():
            return RagResult(found=False, source_type="error", context_str="API Key eksik", sources=[], chunks=[])

        intent = await self._classify_intent(query)
        if intent.category == "FACTUAL":
            return await self._web_fallback(query)

        docs = await self._search_supabase(query)
        
        if not docs:
            return await self._web_fallback(query)

        # Rerank
        if self.ranker:
            passages = [
                {"id": str(d['id']), "text": d.get('content', ''), "meta": d.get('metadata', {})} 
                for d in docs
            ]
            rerank_req = RerankRequest(query=query, passages=passages)
            ranked = self.ranker.rerank(rerank_req)
            final = ranked[:5]
        else:
            final = docs[:5]

        if not final or (self.ranker and final[0]['score'] < 0.20):
             return await self._web_fallback(query)

        context = "\n---\n".join([f"Kaynak: {i.get('meta', {}).get('source')}\n{i.get('text', '')}" for i in final])
        
        return RagResult(
            found=True,
            source_type="internal",
            context_str=context,
            sources=[i.get('meta', {}).get('source') for i in final],
            chunks=final
        )