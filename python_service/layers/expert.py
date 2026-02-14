import os
import json
import logging
from typing import Dict, Optional, Any
from pydantic import BaseModel, Field
from litellm import completion

# Loglama ayarları
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Çıktı Modeli
class ExpertResult(BaseModel):
    answer: str
    model_used: str
    complexity_score: int
    topic: str
    reasoning: str
    cost: float = 0.0

class ExpertLayer:
    def __init__(self):
        # Varsayılan modeller
        self.default_model = "gemini/gemini-2.0-flash"
        self.pro_model = "gemini/gemini-1.5-pro"
        self.fallback_model = "gemini/gemini-2.0-flash" 

    def measure_complexity(self, query: str, context: str) -> Dict[str, Any]:
        """
        Sorunun zorluk derecesini ve konusunu analiz eder.
        Model: gemini-2.0-flash
        """
        try:
            prompt = f"""
            Aşağıdaki kullanıcı sorusunu ve mevcut bağlamı analiz et.
            
            Soru: {query}
            Mevcut Bağlam (Varsa): {context[:500]}...

            Görevin:
            1. Sorunun hukuki/mantıksal karmaşıklığını 1-10 arasında puanla.
            2. Konuyu belirle (Örn: Ceza Hukuku, Borçlar, Genel Mantık).
            3. Neden bu puanı verdiğini açıkla.

            Lütfen SADECE şu JSON formatında cevap ver:
            {{
                "score": int,
                "topic": "string",
                "reasoning": "string"
            }}
            """

            response = completion(
                model=self.default_model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            data = json.loads(content)
            return data

        except Exception as e:
            logger.error(f"Complexity measurement failed: {e}")
            # Hata durumunda varsayılan orta seviye karmaşıklık döndür
            return {"score": 5, "topic": "General", "reasoning": "Analysis failed, default used."}

    def get_response(self, query: str, context: str = "", complexity_data: Dict = None) -> ExpertResult:
        """
        Karmaşıklığa göre en uygun modeli seçer ve cevabı üretir.
        """
        if complexity_data is None:
            complexity_data = self.measure_complexity(query, context)
        
        score = complexity_data.get("score", 5)
        selected_model = self.default_model
        
        # Model Seçim Mantığı (Router)
        try:
            if score <= 4:
                # Düşük karmaşıklık: Hızlı model
                selected_model = "gemini/gemini-2.0-flash"
            
            elif 4 < score <= 7:
                # Orta karmaşıklık: Pro model
                selected_model = self.pro_model
            
            else:
                # Yüksek karmaşıklık (Score > 7): En zeki modeller zinciri
                if os.getenv("OPENAI_API_KEY"):
                    selected_model = "openai/gpt-4o"
                elif os.getenv("ANTHROPIC_API_KEY"):
                    selected_model = "anthropic/claude-3-5-sonnet"
                else:
                    selected_model = self.pro_model

            logger.info(f"Expert Logic: Score {score} -> Selected {selected_model}")

            system_prompt = (
                f"Sen BabyLexit Baş Danışmanısın. Kullanıcı şu konuda soruyor: {complexity_data.get('topic')}. "
                "İç veri kaynaklarımız (RAG/Web) bu soru için yetersiz kaldı veya konu çok spesifik. "
                "Kendi geniş hukuk ve mantık bilgi birikimini kullanarak detaylı, açıklayıcı ve yönlendirici bir cevap ver. "
                "Cevabının en başına kalın harflerle '**Yapay Zeka yorumudur, dış kaynaklardan teyit edilememiştir.**' uyarısını ekle."
            )

            response = completion(
                model=selected_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Soru: {query}\n\nEk Bağlam: {context}"}
                ]
            )

            answer_text = response.choices[0].message.content
            cost = response._hidden_params.get("response_cost", 0.0) if hasattr(response, "_hidden_params") else 0.0

            return ExpertResult(
                answer=answer_text,
                model_used=selected_model,
                complexity_score=score,
                topic=complexity_data.get("topic", "General"),
                reasoning=complexity_data.get("reasoning", ""),
                cost=cost
            )

        except Exception as e:
            logger.error(f"Expert model failed ({selected_model}): {e}")
            # Fallback (Akıllı yedek başarısız olursa son çare)
            return ExpertResult(
                answer="Üzgünüm, uzman sistem şu an cevap veremiyor. Lütfen sorunuzu basitleştirin.",
                model_used="error-fallback",
                complexity_score=score,
                topic="Error",
                reasoning=str(e)
            )