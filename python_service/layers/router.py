import os
import json
import asyncio
import google.generativeai as genai
from supabase import create_client, Client
from pydantic import BaseModel, Field
from typing import Literal, Optional, List, Dict, Any

# --- Gemini 3.0 Konfigürasyonu ---
# Not: Gemini 3 için model ismi genellikle 'gemini-3-flash-preview' veya 'gemini-3-flash'tır.
# Router için 'thinking_level' parametresini 'low' tutarak hızı artırıyoruz.
MODEL_NAME = "gemini-3-flash-preview" 

class RouteDecision(BaseModel):
    action: Literal["cache_hit", "route"]
    target_layer: Optional[Literal["chitchat", "internal_rag", "web_search", "hybrid_research"]] = None
    cached_response: Optional[str] = None
    confidence: float = Field(default=0.0)
    reasoning: str = Field(default="")

class SemanticRouter:
    def __init__(self):
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if self.gemini_api_key:
            genai.configure(api_key=self.gemini_api_key)
            self.embedding_model = "models/text-embedding-004"
            
            # Gemini 3.0 Flash Modelini Yüklüyoruz
            # JSON modu (response_mime_type) ile structured output garantisi alıyoruz.
            self.classification_model = genai.GenerativeModel(
                model_name=MODEL_NAME,
                generation_config={
                    "response_mime_type": "application/json",
                    # Gemini 3'e özel 'thinking' parametresi SDK tarafından destekleniyorsa buraya eklenebilir.
                    # Şimdilik standart config ile ilerliyoruz.
                }
            )

        if self.supabase_url and self.supabase_key:
            self.supabase: Client = create_client(self.supabase_url, self.supabase_key)

    async def _get_embedding(self, text: str) -> List[float]:
        if not self.gemini_api_key: return []
        try:
            result = await asyncio.to_thread(
                genai.embed_content,
                model=self.embedding_model,
                content=text,
                task_type="retrieval_query"
            )
            return result['embedding']
        except Exception as e:
            print(f"Embedding Hatası: {e}")
            return []

    async def _search_cache(self, embedding: List[float], threshold: float = 0.95) -> Optional[Dict]:
        if not embedding or not hasattr(self, 'supabase'): return None
        try:
            response = await asyncio.to_thread(
                self.supabase.rpc(
                    "match_similar_questions",
                    {"query_embedding": embedding, "match_threshold": threshold, "match_count": 1}
                ).execute
            )
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Cache Hatası: {e}")
            return None

    async def _classify_intent(self, query: str) -> Dict[str, Any]:
        """Gemini 3 Flash ile niyet analizi."""
        if not self.gemini_api_key:
            return {"category": "WEB_SEARCH", "confidence": 0.0}

        prompt = f"""
        SİSTEM: Sen Babylexit'in yüksek hızlı yönlendiricisisin.
        SORU: "{query}"
        
        GÖREV: Soruyu analiz et ve aşağıdaki 4 kategoriden birine sınıflandır.
        1. CHITCHAT (Selamlaşma, genel sohbet)
        2. INTERNAL_RAG (Hukuk, mevzuat, şirket içi kurallar)
        3. WEB_SEARCH (Güncel haberler, döviz, hava durumu, genel kültür)
        4. HYBRID_RESEARCH (Karmaşık, hem iç hem dış bilgi gerektiren sorular)

        ÇIKTI (JSON):
        {{ "category": "KATEGORI_ADI", "confidence": 0.9, "reasoning": "..." }}
        """

        try:
            response = await asyncio.to_thread(self.classification_model.generate_content, prompt)
            return json.loads(response.text)
        except Exception as e:
            print(f"Gemini 3 Sınıflandırma Hatası: {e}")
            return {"category": "WEB_SEARCH", "confidence": 0.0, "reasoning": "Fallback"}

    async def route(self, query: str) -> RouteDecision:
        # 1. Embedding
        embedding = await self._get_embedding(query)

        # 2. Cache
        cache_result = await self._search_cache(embedding, threshold=0.95)
        if cache_result:
            return RouteDecision(
                action="cache_hit",
                cached_response=cache_result.get('answer_content', ''),
                confidence=1.0,
                reasoning="Cache Hit"
            )

        # 3. Sınıflandırma (Gemini 3)
        intent = await self._classify_intent(query)
        category = intent.get("category", "WEB_SEARCH").upper()
        
        target_map = {
            "CHITCHAT": "chitchat",
            "INTERNAL_RAG": "internal_rag",
            "WEB_SEARCH": "web_search",
            "HYBRID_RESEARCH": "hybrid_research"
        }
        target = target_map.get(category, "hybrid_research")

        # Güvenlik Ağı
        if intent.get("confidence", 0) < 0.8 and target != "chitchat":
            target = "hybrid_research"

        return RouteDecision(
            action="route",
            target_layer=target,
            confidence=intent.get("confidence", 0),
            reasoning=intent.get("reasoning", "")
        )