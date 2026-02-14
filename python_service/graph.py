import os
import logging
import asyncio
from typing import TypedDict, Optional, Literal, List
from langgraph.graph import StateGraph, END

# Katmanlar (Import yolları ve isimleri korundu)
from layers.guard import GuardLayer, GuardOutput
from layers.router import RouterLayer
from layers.rag import RagLayer, RagResult
from layers.web import WebLayer, WebResult
from layers.expert import ExpertLayer, ExpertResult
from layers.author import AuthorLayer

# Supabase Client Kurulumu (Mevcut mantık korundu)
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

# --- 1. State Tanımı (Aynen korundu) ---
class AgentState(TypedDict):
    question_id: str
    query: str
    safety_status: str  # 'safe', 'toxic'
    route: str          # 'internal', 'web', 'hybrid'
    rag_result: Optional[RagResult]
    web_result: Optional[WebResult]
    expert_result: Optional[ExpertResult]
    final_report: str
    status: str         # 'processing', 'completed', 'failed'

# --- 2. Node Tanımları ---
guard_layer = GuardLayer()
router_layer = RouterLayer()
rag_layer = RagLayer()
web_layer = WebLayer()
expert_layer = ExpertLayer()
author_layer = AuthorLayer()

async def guard_node(state: AgentState) -> AgentState:
    logger.info("--- NODE: Guard ---")
    # Senkron check metodunu güvenli çağırma
    result = guard_layer.check(state["query"])
    # Hem 'safe' hem 'is_safe' alanlarını kontrol ederek hata payını sıfırlıyoruz
    is_safe = getattr(result, 'safe', getattr(result, 'is_safe', True))
    
    if not is_safe:
        return {
            **state, 
            "safety_status": "toxic", 
            "final_report": "⚠️ Bu içerik güvenlik politikalarımıza uymamaktadır.",
            "status": "failed"
        }
    return {**state, "safety_status": "safe"}

async def router_node(state: AgentState) -> AgentState:
    logger.info("--- NODE: Router ---")
    # decide metodu asenkron olabileceği için kontrol ederek çağırıyoruz
    if asyncio.iscoroutinefunction(router_layer.decide):
        decision = await router_layer.decide(state["query"])
    else:
        decision = router_layer.decide(state["query"])
    return {**state, "route": decision.route}

async def rag_node(state: AgentState) -> AgentState:
    logger.info("--- NODE: RAG ---")
    result = rag_layer.search(state["query"])
    return {**state, "rag_result": result}

async def web_node(state: AgentState) -> AgentState:
    logger.info("--- NODE: Web ---")
    result = web_layer.search(state["query"])
    return {**state, "web_result": result}

def grade_node(state: AgentState) -> dict:
    logger.info("--- NODE: Grader ---")
    rag_found = state.get("rag_result") and getattr(state["rag_result"], 'found', False)
    web_found = state.get("web_result") and getattr(state["web_result"], 'found', False)
    return "sufficient" if (rag_found or web_found) else "insufficient"

async def expert_node(state: AgentState) -> AgentState:
    logger.info("--- NODE: Expert ---")
    context = ""
    if state.get("rag_result"): context += str(state["rag_result"])
    if state.get("web_result"): context += str(state["web_result"])
    result = expert_layer.get_response(state["query"], context=context)
    return {**state, "expert_result": result}

async def author_node(state: AgentState) -> AgentState:
    logger.info("--- NODE: Author ---")
    result = author_layer.write_report(
        query=state["query"],
        rag_result=state.get("rag_result"),
        web_result=state.get("web_result"),
        expert_result=state.get("expert_result")
    )
    return {**state, "final_report": result.final_markdown, "status": "completed"}

async def db_writer_node(state: AgentState) -> AgentState:
    logger.info(f"--- NODE: DB Writer (ID: {state['question_id']}) ---")
    if supabase_client:
        try:
            # Sources verisini güvenli bir şekilde JSON formatına çeviriyoruz
            sources_payload = {
                "rag": state.get("rag_result").dict() if state.get("rag_result") and hasattr(state.get("rag_result"), 'dict') else None,
                "web": state.get("web_result").dict() if state.get("web_result") and hasattr(state.get("web_result"), 'dict') else None,
                "expert": state.get("expert_result").dict() if state.get("expert_result") and hasattr(state.get("expert_result"), 'dict') else None
            }
            supabase_client.table("questions").update({
                "answer": state["final_report"],
                "status": state["status"],
                "sources": sources_payload
            }).eq("id", state["question_id"]).execute()
        except Exception as e:
            logger.error(f"DB Write Error: {e}")
    return state

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
    return "end" if state["safety_status"] == "toxic" else "continue"

workflow.add_conditional_edges("guard_node", check_safety, {"end": "db_writer_node", "continue": "router_node"})

def route_decision_func(state: AgentState):
    route = state["route"]
    if route == "internal": return ["rag_node"]
    elif route == "web": return ["web_node"]
    else: return ["rag_node", "web_node"]

workflow.add_conditional_edges("router_node", route_decision_func, ["rag_node", "web_node"])

def check_sufficiency(state: AgentState):
    rag_found = state.get("rag_result") and getattr(state["rag_result"], 'found', False)
    web_found = state.get("web_result") and getattr(state["web_result"], 'found', False)
    return "author" if (rag_found or web_found) else "expert"

workflow.add_conditional_edges("rag_node", check_sufficiency, {"author": "author_node", "expert": "expert_node"})
workflow.add_conditional_edges("web_node", check_sufficiency, {"author": "author_node", "expert": "expert_node"})

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
        
        # app.ainvoke kullanımı yeni sürüm LangGraph ile tam uyumlu hale getirildi
        result = await app.ainvoke(inputs)
        logger.info(f"Analysis completed for {question_id}")
        return result

    except Exception as e:
        logger.error(f"Critical Error in Pipeline: {e}")
        if supabase_client:
            supabase_client.table("questions").update({
                "status": "failed",
                "answer": f"Sistemde beklenmeyen bir hata oluştu: {str(e)}"
            }).eq("id", question_id).execute()

if __name__ == "__main__":
    # Test bloğu
    asyncio.run(start_analysis("test-uuid"))    