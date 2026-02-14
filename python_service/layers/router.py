import os
import json
import asyncio
import logging
# Yeni Kütüphane Yapısı
from google import genai
from google.genai import types
from supabase import create_client, Client
from pydantic import BaseModel, Field
from typing import Literal, Optional, List, Dict, Any

logger = logging.getLogger("RouterLayer")

# Graph.py ile uyumlu çıktı modeli
class RouteDecision(BaseModel):
    route: Literal["internal", "web", "hybrid"] # Graph.py bunları bekliyor
    action: Literal["cache_hit", "route"] = "route"
    cached_response: Optional[str] = None
    confidence: float = Field(default=0.0)
    reasoning: str = Field(default="")

class RouterLayer:
    def __init__(self):
        self.gemini_api_key = os.getenv("GOOGLE_API_KEY") # Standart key ismi
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        self.client = None

        if self.gemini_api_key:
            try:
                # v1.0 SDK Client Init
                self.client = genai.Client(api_key=self.gemini_api_key)
            except Exception as e:
                logger.error(f"Router Client başlatılamadı: {e}")

        if self.supabase_url and self.supabase_key:
            try:
                self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
            except Exception as e:
                logger.error(f"Router Supabase bağlantı hatası: {e}")

    async def _get_embedding(self, text: str) -> List[float]:
        if not self.client: return []
        try:
            # Yeni SDK ile embedding çağrısı
            result = await self.client.aio.models.embed_content(
                model="text-embedding-004",
                contents=text
            )
            return result.embeddings[0].values
        except Exception as e:
            logger.error(f"Embedding Hatası: {e}")
            return []

    async def _search_cache(self, embedding: List[float], threshold: float = 0.95) -> Optional[Dict]:
        if not embedding or not hasattr(self, 'supabase'): return None
        try:
            response = self.supabase.rpc(
                "match_similar_questions",
                {"query_embedding": embedding, "match_threshold": threshold, "match_count": 1}
            ).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Cache Hatası: {e}")
            return None

    async def _classify_intent(self, query: str) -> Dict[str, Any]:
        if not self.client:
            return {"category": "web", "confidence": 0.0}

        prompt = f"""
        SİSTEM: Sen Babylexit'in yüksek hızlı yönlendiricisisin.
        SORU: "{query}"
        
        GÖREV: Soruyu analiz et ve aşağıdaki kategorilerden birine sınıflandır.
        1. INTERNAL (Hukuk, mevzuat, şirket içi kurallar)
        2. WEB (Güncel haberler, genel kültür)
        3. HYBRID (Karmaşık, her ikisi de gerekli)

        SADECE JSON dön: {{ "category": "internal" | "web" | "hybrid", "confidence": float, "reasoning": "string" }}
        """

        try:
            response = await self.client.aio.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.0
                )
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Sınıflandırma Hatası: {e}")
            return {"category": "web", "confidence": 0.0, "reasoning": "Fallback"}

    async def decide(self, query: str) -> RouteDecision:
        """Graph.py'nin beklediği ana metod."""
        
        # 1. Önce Cache Kontrolü (Hız için)
        embedding = await self._get_embedding(query)
        cache_result = await self._search_cache(embedding)
        
        if cache_result:
            return RouteDecision(
                route="internal", # Cache hit genellikle internal veridir
                action="cache_hit",
                cached_response=cache_result.get('answer_content', ''),
                confidence=1.0,
                reasoning="Cache Hit"
            )

        # 2. AI Sınıflandırma
        intent = await self._classify_intent(query)
        category = intent.get("category", "web").lower()
        
        # Güvenlik Ağı: Confidence düşükse hybrid'e zorla
        if intent.get("confidence", 0) < 0.7:
            category = "hybrid"

        return RouteDecision(
            route=category,
            action="route",
            confidence=intent.get("confidence", 0),
            reasoning=intent.get("reasoning", "")
        )