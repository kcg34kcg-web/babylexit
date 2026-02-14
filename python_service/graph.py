import os
import logging
import asyncio
from typing import TypedDict, Optional, Literal, List
from langgraph.graph import StateGraph, END

# Katmanlar (Mevcut olanlar ve yeni yazdıklarımız)
# Not: Bu modüllerin proje içinde import edilebilir olduğunu varsayıyoruz.
from layers.guard import GuardLayer, GuardOutput
from layers.router import RouterLayer
from layers.rag import RagLayer, RagResult
from layers.web import WebLayer, WebResult
from layers.expert import ExpertLayer, ExpertResult
from layers.author import AuthorLayer

# Supabase Client (utils/supabase.py var varsayıyoruz, yoksa os.environ ile kuruyoruz)
try:
    from utils.supabase import supabase_client
except ImportError:
    from supabase import create_client, Client
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_KEY")
    supabase_client: Client = create_client(url, key)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("BabyLexitGraph")

# --- 1. State Tanımı ---
class AgentState(TypedDict):
    question_id: str
    query: str
    safety_status: str  # 'safe', 'toxic'
    route: str          # 'internal', 'web', 'hybrid'
    
    # Katman Sonuçları
    rag_result: Optional[RagResult]
    web_result: Optional[WebResult]
    expert_result: Optional[ExpertResult]
    
    final_report: str
    status: str         # 'processing', 'completed', 'failed'

# --- 2. Node Tanımları ---

# Servisleri initialize et
guard_layer = GuardLayer()
router_layer = RouterLayer()
rag_layer = RagLayer()
web_layer = WebLayer()
expert_layer = ExpertLayer()
author_layer = AuthorLayer()

def guard_node(state: AgentState) -> AgentState:
    """Güvenlik kontrolü yapar."""
    logger.info("--- NODE: Guard ---")
    result = guard_layer.check(state["query"])
    if not result.safe:
        return {
            **state, 
            "safety_status": "toxic", 
            "final_report": "⚠️ Bu içerik güvenlik politikalarımıza uymamaktadır.",
            "status": "failed"
        }
    return {**state, "safety_status": "safe"}

def router_node(state: AgentState) -> AgentState:
    """Sorguyu yönlendirir."""
    logger.info("--- NODE: Router ---")
    decision = router_layer.decide(state["query"])
    return {**state, "route": decision.route}

def rag_node(state: AgentState) -> AgentState:
    """İç veritabanında arama yapar."""
    logger.info("--- NODE: RAG ---")
    result = rag_layer.search(state["query"])
    return {**state, "rag_result": result}

def web_node(state: AgentState) -> AgentState:
    """İnternette arama yapar."""
    logger.info("--- NODE: Web ---")
    result = web_layer.search(state["query"])
    return {**state, "web_result": result}

def grade_node(state: AgentState) -> dict:
    """
    Verinin yeterliliğini kontrol eden mantıksal düğüm (Conditional Edge için).
    State güncellemez, sadece karar verir.
    """
    logger.info("--- NODE: Grader ---")
    rag_found = state.get("rag_result") and getattr(state["rag_result"], 'found', False)
    web_found = state.get("web_result") and getattr(state["web_result"], 'found', False)
    
    if rag_found or web_found:
        return "sufficient"
    return "insufficient"

def expert_node(state: AgentState) -> AgentState:
    """Veri yetersizse uzman modele başvurur."""
    logger.info("--- NODE: Expert ---")
    # Context oluştur (RAG veya Web'den gelen zayıf verileri de ekleyelim)
    context = ""
    if state.get("rag_result"): context += str(state["rag_result"])
    if state.get("web_result"): context += str(state["web_result"])
    
    result = expert_layer.get_response(state["query"], context=context)
    return {**state, "expert_result": result}

def author_node(state: AgentState) -> AgentState:
    """Son raporu yazar."""
    logger.info("--- NODE: Author ---")
    result = author_layer.write_report(
        query=state["query"],
        rag_result=state.get("rag_result"),
        web_result=state.get("web_result"),
        expert_result=state.get("expert_result")
    )
    return {**state, "final_report": result.final_markdown, "status": "completed"}

def db_writer_node(state: AgentState) -> AgentState:
    """Sonucu Supabase'e yazar."""
    logger.info(f"--- NODE: DB Writer (ID: {state['question_id']}) ---")
    try:
        supabase_client.table("questions").update({
            "answer": state["final_report"],
            "status": state["status"],
            "sources": {
                "rag": state.get("rag_result").dict() if state.get("rag_result") else None,
                "web": state.get("web_result").dict() if state.get("web_result") else None,
                "expert": state.get("expert_result").dict() if state.get("expert_result") else None
            }
        }).eq("id", state["question_id"]).execute()
    except Exception as e:
        logger.error(f"DB Write Error: {e}")
    
    return state

# --- 3. Graph Kurulumu ---

workflow = StateGraph(AgentState)

# Düğümleri Ekle
workflow.add_node("guard_node", guard_node)
workflow.add_node("router_node", router_node)
workflow.add_node("rag_node", rag_node)
workflow.add_node("web_node", web_node)
workflow.add_node("expert_node", expert_node)
workflow.add_node("author_node", author_node)
workflow.add_node("db_writer_node", db_writer_node)

# Başlangıç
workflow.set_entry_point("guard_node")

# Guard -> Router (Güvenliyse) veya END (Değilse)
def check_safety(state: AgentState):
    if state["safety_status"] == "toxic":
        return "end" # Doğrudan DB Writer'a gönderip bitirebiliriz aslında hata mesajını yazmak için
    return "continue"

workflow.add_conditional_edges(
    "guard_node",
    check_safety,
    {
        "end": "db_writer_node",
        "continue": "router_node"
    }
)

# Router -> (RAG, Web, Hybrid)
def route_decision(state: AgentState):
    route = state["route"]
    if route == "internal":
        return ["rag_node"]
    elif route == "web":
        return ["web_node"]
    else: # hybrid
        return ["rag_node", "web_node"]

workflow.add_conditional_edges(
    "router_node",
    route_decision,
    ["rag_node", "web_node"]
)

# Retrieval -> Grade (Yeterli mi?)
def check_sufficiency(state: AgentState):
    # Bu fonksiyon edge üzerinde çalışır, state'i okur
    rag_found = state.get("rag_result") and getattr(state["rag_result"], 'found', False)
    web_found = state.get("web_result") and getattr(state["web_result"], 'found', False)
    
    if rag_found or web_found:
        return "author"
    return "expert"

# Hem RAG hem Web node'ları Grade kararına gider
workflow.add_conditional_edges("rag_node", check_sufficiency, {"author": "author_node", "expert": "expert_node"})
workflow.add_conditional_edges("web_node", check_sufficiency, {"author": "author_node", "expert": "expert_node"})

# Expert -> Author
workflow.add_edge("expert_node", "author_node")

# Author -> DB Writer
workflow.add_edge("author_node", "db_writer_node")

# DB Writer -> END
workflow.add_edge("db_writer_node", END)

# Compile
app = workflow.compile()

# --- 4. Başlatıcı Fonksiyon ---

async def start_analysis(question_id: str):
    """Süreci başlatan asenkron fonksiyon."""
    logger.info(f"Starting analysis for Question ID: {question_id}")
    
    # 1. Soruyu veritabanından çek
    try:
        response = supabase_client.table("questions").select("content").eq("id", question_id).single().execute()
        if not response.data:
            logger.error("Question not found in DB")
            return
        
        query = response.data["content"]
        
        # 2. Başlangıç State'i
        inputs = {
            "question_id": question_id,
            "query": query,
            "safety_status": "unknown",
            "route": "internal",
            "rag_result": None,
            "web_result": None,
            "expert_result": None,
            "final_report": "",
            "status": "processing"
        }
        
        # 3. Graph'ı çalıştır
        # LangGraph invoke genellikle senkron çalışır ama async desteği de vardır.
        # Burada basitçe invoke kullanıyoruz.
        result = await app.ainvoke(inputs)
        
        logger.info(f"Analysis completed for {question_id}")
        return result

    except Exception as e:
        logger.error(f"Critical Error in Pipeline: {e}")
        # DB'ye hata yaz
        supabase_client.table("questions").update({
            "status": "failed",
            "answer": "Sistemde beklenmeyen bir hata oluştu."
        }).eq("id", question_id).execute()

if __name__ == "__main__":
    # Test için
    asyncio.run(start_analysis("test-uuid-123"))