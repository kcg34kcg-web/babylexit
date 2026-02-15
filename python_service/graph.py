import os
import logging
import asyncio
from typing import TypedDict, Optional, Literal, List
from langgraph.graph import StateGraph, END

# Katmanlar
from layers.guard import GuardLayer
from layers.router import RouterLayer
from layers.rag import RagLayer, RagResult
from layers.web import WebLayer, WebResult
from layers.expert import ExpertLayer, ExpertResult
from layers.author import AuthorLayer

# Supabase Client
try:
    from utils.supabase import supabase_client
except ImportError:
    from supabase import create_client, Client
    url: str = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if url and key:
        supabase_client: Client = create_client(url, key)
    else:
        supabase_client = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("BabyLexitGraph")

# --- 1. State Tanımı ---
class AgentState(TypedDict):
    question_id: str
    query: str
    safety_status: str
    route: str
    rag_result: Optional[RagResult]
    web_result: Optional[WebResult]
    expert_result: Optional[ExpertResult]
    final_report: str
    status: str

# --- 2. Node Tanımları ---
guard_layer = GuardLayer()
router_layer = RouterLayer()
rag_layer = RagLayer()
web_layer = WebLayer()
expert_layer = ExpertLayer()
author_layer = AuthorLayer()

# NOT: Paralel çalışacak node'lar (RAG, Web) SADECE kendi güncelledikleri key'i döndürmelidir.
# {**state} kullanımı paralel kollarda çakışma yaratır.

async def guard_node(state: AgentState) -> dict:
    logger.info("--- NODE: Guard ---")
    result = guard_layer.check(state["query"])
    is_safe = getattr(result, 'safe', getattr(result, 'is_safe', True))
    
    if not is_safe:
        return {
            "safety_status": "toxic", 
            "final_report": "⚠️ Bu içerik güvenlik politikalarımıza uymamaktadır.",
            "status": "failed"
        }
    return {"safety_status": "safe"}

async def router_node(state: AgentState) -> dict:
    logger.info("--- NODE: Router ---")
    if asyncio.iscoroutinefunction(router_layer.decide):
        decision = await router_layer.decide(state["query"])
    else:
        decision = router_layer.decide(state["query"])
    return {"route": decision.route}

async def rag_node(state: AgentState) -> dict:
    logger.info("--- NODE: RAG ---")
    # DÜZELTME 1: await eklendi
    result = await rag_layer.search(state["query"])
    # DÜZELTME 2: Sadece ilgili key dönüyor
    return {"rag_result": result}

async def web_node(state: AgentState) -> dict:
    logger.info("--- NODE: Web ---")
    # DÜZELTME 1: await eklendi
    result = await web_layer.search(state["query"])
    # DÜZELTME 2: Sadece ilgili key dönüyor
    return {"web_result": result}

async def expert_node(state: AgentState) -> dict:
    logger.info("--- NODE: Expert ---")
    context = ""
    if state.get("rag_result"): context += str(state["rag_result"])
    if state.get("web_result"): context += str(state["web_result"])
    result = expert_layer.get_response(state["query"], context=context)
    return {"expert_result": result}

async def author_node(state: AgentState) -> dict:
    logger.info("--- NODE: Author ---")
    result = author_layer.write_report(
        query=state["query"],
        rag_result=state.get("rag_result"),
        web_result=state.get("web_result"),
        expert_result=state.get("expert_result")
    )
    return {"final_report": result.final_markdown, "status": "completed"}

async def db_writer_node(state: AgentState) -> dict:
    logger.info(f"--- NODE: DB Writer (ID: {state.get('question_id')}) ---")
    if supabase_client and state.get("question_id"):
        try:
            def to_dict_safe(obj):
                return obj.dict() if hasattr(obj, 'dict') else (obj.model_dump() if hasattr(obj, 'model_dump') else str(obj))

            sources_payload = {
                "rag": to_dict_safe(state.get("rag_result")) if state.get("rag_result") else None,
                "web": to_dict_safe(state.get("web_result")) if state.get("web_result") else None,
                "expert": to_dict_safe(state.get("expert_result")) if state.get("expert_result") else None
            }
            
            # answer kolonu yok hatası almamak için önce select ile kontrol edilebilir ama
            # şimdilik doğrudan update deniyoruz.
            supabase_client.table("questions").update({
                "answer": state.get("final_report", ""),
                "status": state.get("status", "completed"),
                "sources": sources_payload
            }).eq("id", state["question_id"]).execute()
        except Exception as e:
            logger.error(f"DB Write Error: {e}")
            # Tablo yapısı hatası alırsak loglayalım
    return {} # DB Writer son adım, state güncellemesine gerek yok

# --- 3. Graph Kurulumu ---
workflow = StateGraph(AgentState)
workflow.add_node("guard_node", guard_node)
workflow.add_node("router_node", router_node)
workflow.add_node("rag_node", rag_node)
workflow.add_node("web_node", web_node)
workflow.add_node("expert_node", expert_node)
workflow.add_node("author_node", author_node)
workflow.add_node("db_writer_node", db_writer_node)

workflow.set_entry_point("guard_node")

def check_safety(state: AgentState):
    return "end" if state.get("safety_status") == "toxic" else "continue"

workflow.add_conditional_edges("guard_node", check_safety, {"end": "db_writer_node", "continue": "router_node"})

def route_decision_func(state: AgentState):
    route = state.get("route", "internal")
    if route == "internal": return ["rag_node"]
    elif route == "web": return ["web_node"]
    else: return ["rag_node", "web_node"] # Hybrid

workflow.add_conditional_edges("router_node", route_decision_func, ["rag_node", "web_node"])

# RAG ve Web bittikten sonra Expert'e mi Author'a mı gidecek?
# Şimdilik direkt Author'a bağlayalım (Basitlik için)
# İsterseniz expert_node'u araya sokabilirsiniz.
# Mevcut akış: (RAG/Web) -> Expert -> Author
workflow.add_edge("rag_node", "expert_node")
workflow.add_edge("web_node", "expert_node")

workflow.add_edge("expert_node", "author_node")
workflow.add_edge("author_node", "db_writer_node")
workflow.add_edge("db_writer_node", END)

app = workflow.compile()

# --- 4. Başlatıcı Fonksiyon ---
async def start_analysis(question_id: str):
    logger.info(f"Starting analysis for Question ID: {question_id}")
    if not supabase_client:
        logger.error("Supabase client not initialized")
        return

    try:
        response = supabase_client.table("questions").select("content").eq("id", question_id).single().execute()
        if not response.data:
            logger.error("Question not found in DB")
            return
        
        query = response.data["content"]
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
        
        await app.ainvoke(inputs)
        logger.info(f"Analysis completed for {question_id}")

    except Exception as e:
        logger.error(f"Critical Error in Pipeline: {e}")
        import traceback
        traceback.print_exc()
        if supabase_client:
            try:
                supabase_client.table("questions").update({
                    "status": "failed",
                    "answer": f"Sistemde beklenmeyen bir hata oluştu: {str(e)}"
                }).eq("id", question_id).execute()
            except:
                logger.error("DB update failed during error handling")

if __name__ == "__main__":
    asyncio.run(start_analysis("test-uuid"))