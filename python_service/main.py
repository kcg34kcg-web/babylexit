import os
import time
import threading
import asyncio
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager
from datetime import datetime

# API Kütüphaneleri
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# AI ve Veritabanı
from supabase import create_client, Client
from dotenv import load_dotenv
import pdfplumber
import pytesseract
from PIL import Image
from io import BytesIO
from sentence_transformers import SentenceTransformer

# --- YENİ KATMANLAR ---
# Klasör yapısının python_service/layers/ altında olduğunu varsayıyorum
from layers.guard import GuardLayer
from layers.router import RouterLayer, RouteType
from layers.rag import RAGLayer
from layers.web import WebSearchLayer

# .env yükle
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# --- KONFIGÜRASYON ---
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
MODEL_NAME = 'BAAI/bge-m3'

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Hata: .env eksik veya hatalı.")
    # exit(1) # Hata olsa bile sunucuyu çökertmemek için loglayıp devam edebiliriz ama kritik.

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Global Değişkenler
embed_model = None
orchestrator = None # Yeni Orkestratör Sınıfı

# -----------------------------------------------------------------------------
# 1. ORKESTRASYON SINIFI (TÜM BEYİN BURADA)
# -----------------------------------------------------------------------------
class BabyLexitOrchestrator:
    def __init__(self):
        print("🧠 Orkestratör Başlatılıyor...")
        self.guard = GuardLayer()
        self.router = RouterLayer()
        self.rag = RAGLayer()
        self.web = WebSearchLayer()

    async def process_query(self, user_query: str) -> Dict[str, Any]:
        """Sorguyu alır, RAG veya Web'e yönlendirir ve cevabı döner."""
        print(f"\n--- Sorgu İşleniyor: {user_query} ---")
        
        # A. Güvenlik
        guard_result = self.guard.check(user_query)
        if not guard_result.is_safe:
            return {"text": f"Güvenlik Uyarısı: {guard_result.reason}", "sources": [], "route": "BLOCKED"}

        # B. Rota
        route = self.router.route(user_query)
        final_response = ""
        sources = []

        # C. Rota Uygulama
        if route == RouteType.LEGAL_DB:
            print("📚 RAG Aranıyor...")
            rag_result = self.rag.search(user_query)
            if rag_result:
                final_response = rag_result
                sources = ["BabyLexit Knowledge Base"]
            else:
                print("⚠️ DB'de bulunamadı, Web'e gidiliyor...")
                route = RouteType.WEB_SEARCH # Fallback

        if route == RouteType.WEB_SEARCH:
            print("🌐 Web Taranıyor...")
            web_result = await self.web.run(user_query)
            if web_result.found:
                final_response = web_result.summary
                sources = web_result.source_links
            else:
                final_response = "Güvenilir kaynaklarda bilgi bulunamadı."

        elif route == RouteType.GENERAL:
            final_response = "Merhaba! Ben bir hukuk asistanıyım. Size nasıl yardımcı olabilirim?"

        return {
            "text": final_response,
            "sources": sources,
            "route": route.value
        }

# -----------------------------------------------------------------------------
# 2. DOSYA İŞLEME VE EMBEDDING (SENİN KODUNUN AYNI KALDIĞI KISIM)
# -----------------------------------------------------------------------------

# Model Yükleme (Sadece Ingestion için local model kullanıyoruz)
print(f"📥 Yerel AI Modeli Yükleniyor (CPU): {MODEL_NAME} ...")
try:
    embed_model = SentenceTransformer(MODEL_NAME, device='cpu')
    print("✅ Yerel Embedding Modeli Hazır!")
except Exception as e:
    print(f"❌ Model Hatası: {e}")

def get_local_embedding(text: str) -> List[float]:
    try:
        embedding = embed_model.encode(text, normalize_embeddings=True)
        return embedding.tolist()
    except Exception as e:
        print(f"Embedding Hatası: {e}")
        return []

def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> List[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if chunk: chunks.append(chunk)
        start = end - overlap
    return chunks

def process_file_queue():
    """
    Kullanıcının yüklediği dosyaları işler.
    (Bu fonksiyonu senin kodundan aynen korudum)
    """
    try:
        res = supabase.table('file_processing_queue').select("*").eq('status', 'pending').limit(1).execute()
        if not res.data: return False

        job = res.data[0]
        print(f"📂 Dosya İşleniyor: {job['file_path']}")
        
        supabase.table('file_processing_queue').update({'status': 'processing'}).eq('id', job['id']).execute()
        
        # Dosyayı İndir
        file_bytes = supabase.storage.from_('raw_uploads').download(job['file_path'])
        
        text = ""
        ftype = job.get('file_type', '').lower() if job.get('file_type') else 'txt'
        
        # PDF / Text Ayrımı
        if 'pdf' in ftype:
            with pdfplumber.open(BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    text += (page.extract_text() or "") + "\n"
        else:
            text = file_bytes.decode('utf-8', errors='ignore')

        if len(text.strip()) < 10: raise ValueError("Boş içerik")

        # Parçala ve Kaydet
        chunks = chunk_text(text)
        docs = []
        for chunk in chunks:
            vec = get_local_embedding(chunk)
            if vec:
                docs.append({
                    'content': chunk,
                    'metadata': {'source': job['file_path'], 'user_id': job['user_id']},
                    'embedding': vec
                })
        
        if docs: supabase.table('documents').insert(docs).execute()
        
        supabase.table('file_processing_queue').update({'status': 'completed'}).eq('id', job['id']).execute()
        print(f"✅ Dosya Tamamlandı: {job['file_path']}")
        return True

    except Exception as e:
        print(f"❌ Dosya Hatası: {e}")
        if 'job' in locals():
            supabase.table('file_processing_queue').update({'status': 'failed', 'error_message': str(e)}).eq('id', job['id']).execute()
        return False

# -----------------------------------------------------------------------------
# 3. SORU CEVAPLAMA WORKER (GÜNCELLENEN KISIM)
# -----------------------------------------------------------------------------

def run_async(coro):
    """Senkron thread içinde Asenkron fonksiyon çalıştırmak için"""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Eğer zaten bir loop varsa (nadir) future kullan
            return asyncio.run_coroutine_threadsafe(coro, loop).result()
    except RuntimeError:
        pass
        
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

def process_question_queue():
    """
    Sıradaki soruyu alır ve Orchestrator üzerinden geçirir.
    (Artık Web Search ve Guard yeteneklerine sahip!)
    """
    try:
        res = supabase.table('questions').select("*").eq('status', 'analyzing').limit(1).execute()
        if not res.data: return False

        question = res.data[0]
        q_text = f"{question['title']} \n {question['content']}"
        print(f"⚖️ Soru İşleniyor (Orchestrator): {question['title']}")

        if orchestrator:
            # --- YENİ MANTIK BURADA ---
            # Eskiden sadece embedding alıp RAG yapıyorduk.
            # Şimdi Orchestrator'a gönderiyoruz, o karar veriyor (Web mi, DB mi?)
            result = run_async(orchestrator.process_query(q_text))
            
            answer_text = result["text"]
            sources_list = result["sources"] # Kaynakları da alabiliriz
        else:
            answer_text = "Sistem şu an başlatılıyor, lütfen bekleyin."

        # Cevabı Kaydet
        answer_data = {
            "question_id": question['id'],
            "user_id": question['user_id'], # veya bir Bot ID
            "content": answer_text,
            "is_ai_generated": True,
            "is_verified": False,
            "ai_score": 90 if "Web" in str(sources_list) else 85,
            "upvotes": 0,
            "downvotes": 0
        }
        
        supabase.table('answers').insert(answer_data).execute()
        supabase.table('questions').update({'status': 'answered'}).eq('id', question['id']).execute()
        
        print(f"✅ Soru Cevaplandı: {answer_text[:50]}...")
        return True

    except Exception as e:
        print(f"❌ Soru Hatası: {e}")
        return False

# -----------------------------------------------------------------------------
# 4. ANA DÖNGÜ VE API
# -----------------------------------------------------------------------------

def run_worker_loop():
    print("👷 Worker Thread Başladı (Dosya + Akıllı Soru Cevaplama)...")
    while True:
        try:
            did_file = process_file_queue()
            did_question = process_question_queue()

            if not did_file and not did_question:
                time.sleep(2)
                
        except Exception as e:
            print(f"Worker Loop Error: {e}")
            time.sleep(5)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global orchestrator
    
    # Tüm sistemi başlat
    orchestrator = BabyLexitOrchestrator()
    
    # Worker Thread Başlat
    worker_thread = threading.Thread(target=run_worker_loop, daemon=True)
    worker_thread.start()
    
    print("🚀 BABYZLEXIT FULL ENGINE HAZIR!")
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Endpoint'i (Direct Chat için)
class ChatRequest(BaseModel):
    query: str

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Sistem başlatılıyor")
    
    result = await orchestrator.process_query(req.query)
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)