import os
import time
import threading
import asyncio
import logging
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager
from io import BytesIO

# API Kütüphaneleri
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# AI ve Veritabanı
from supabase import create_client, Client
from dotenv import load_dotenv
import pdfplumber
import pytesseract          # <--- GERİ EKLENDİ
from PIL import Image       # <--- GERİ EKLENDİ
from sentence_transformers import SentenceTransformer

# --- LANGGRAPH ORKESTRASYONU ---
# Graph.py dosyasındaki gelişmiş akışı import ediyoruz
try:
    from graph import start_analysis, app as graph_app
except ImportError:
    # Graph dosyası henüz yoksa hata vermemesi için (Local test)
    start_analysis = None
    graph_app = None
    print("⚠️ UYARI: graph.py bulunamadı. AI motoru sınırlı modda çalışacak.")

# .env yükle
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# --- KONFIGÜRASYON ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
MODEL_NAME = 'BAAI/bge-m3'

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("BabyLexitMain")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("❌ Hata: .env eksik veya hatalı.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Global Değişkenler
embed_model = None

# -----------------------------------------------------------------------------
# 1. DOSYA İŞLEME VE EMBEDDING (OCR GÜNCELLENDİ)
# -----------------------------------------------------------------------------

logger.info(f"📥 Yerel AI Modeli Yükleniyor (CPU): {MODEL_NAME} ...")
try:
    embed_model = SentenceTransformer(MODEL_NAME, device='cpu')
    logger.info("✅ Yerel Embedding Modeli Hazır!")
except Exception as e:
    logger.error(f"❌ Model Hatası: {e}")

def get_local_embedding(text: str) -> List[float]:
    try:
        embedding = embed_model.encode(text, normalize_embeddings=True)
        return embedding.tolist()
    except Exception as e:
        logger.error(f"Embedding Hatası: {e}")
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
    Kullanıcının yüklediği dosyaları işler. (PDF + OCR Resim Desteği)
    """
    try:
        res = supabase.table('file_processing_queue').select("*").eq('status', 'pending').limit(1).execute()
        if not res.data: return False

        job = res.data[0]
        logger.info(f"📂 Dosya İşleniyor: {job['file_path']}")
        
        supabase.table('file_processing_queue').update({'status': 'processing'}).eq('id', job['id']).execute()
        
        # Dosyayı İndir
        file_bytes = supabase.storage.from_('raw_uploads').download(job['file_path'])
        
        text = ""
        # Dosya tipini belirle (Veritabanından veya uzantıdan)
        ftype = job.get('file_type', '').lower()
        if not ftype:
            ftype = job['file_path'].split('.')[-1].lower()
        
        logger.info(f"Tespit edilen dosya tipi: {ftype}")

        # --- DOSYA OKUMA MANTIĞI ---
        if 'pdf' in ftype:
            # PDF İşleme
            try:
                with pdfplumber.open(BytesIO(file_bytes)) as pdf:
                    for page in pdf.pages:
                        text += (page.extract_text() or "") + "\n"
            except Exception as pdf_err:
                logger.error(f"PDF Okuma Hatası: {pdf_err}")
                
        elif ftype in ['jpg', 'jpeg', 'png', 'bmp', 'tiff']:
            # OCR İşleme (Resimden Yazı Okuma)
            try:
                image = Image.open(BytesIO(file_bytes))
                # Türkçe dil desteği için lang='tur' eklenebilir, varsayılan İngilizce+Genel'dir.
                # Eğer sunucuda tur paketi yoksa bu parametreyi kaldır: lang='tur'
                text = pytesseract.image_to_string(image) 
                logger.info("OCR işlemi tamamlandı.")
            except Exception as ocr_err:
                logger.error(f"OCR Hatası (Tesseract yüklü mü?): {ocr_err}")
                raise ValueError("Resim işlenemedi. OCR motoru hatası.")
                
        else:
            # Düz Metin
            text = file_bytes.decode('utf-8', errors='ignore')

        # İçerik Kontrolü
        if len(text.strip()) < 10: 
            raise ValueError(f"Dosyadan anlamlı metin çıkarılamadı (Uzunluk: {len(text)})")

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
        logger.info(f"✅ Dosya Tamamlandı: {job['file_path']}")
        return True

    except Exception as e:
        logger.error(f"❌ Dosya Hatası: {e}")
        if 'job' in locals():
            supabase.table('file_processing_queue').update({'status': 'failed', 'error_message': str(e)}).eq('id', job['id']).execute()
        return False

# -----------------------------------------------------------------------------
# 2. ASYNC HELPER & QUESTION WORKER (LANGGRAPH)
# -----------------------------------------------------------------------------

def run_async(coro):
    """Senkron thread içinde Asenkron fonksiyon çalıştırmak için wrapper."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    if loop.is_running():
        return asyncio.run_coroutine_threadsafe(coro, loop).result()
    else:
        return loop.run_until_complete(coro)

def process_question_queue():
    """Sıradaki soruyu alır ve LangGraph Orkestratörü üzerinden geçirir."""
    try:
        res = supabase.table('questions').select("*").eq('status', 'analyzing').limit(1).execute()
        
        if not res.data: 
            return False

        question = res.data[0]
        logger.info(f"⚖️ Soru Tespit Edildi: {question['id']}")

        if start_analysis:
            run_async(start_analysis(question['id']))
            return True
        else:
            logger.warning("Graph modülü yüklü değil, soru işlenemiyor.")
            return False

    except Exception as e:
        logger.error(f"❌ Soru Worker Hatası: {e}")
        return False

# -----------------------------------------------------------------------------
# 3. ANA DÖNGÜ VE API
# -----------------------------------------------------------------------------

def run_worker_loop():
    logger.info("👷 Worker Thread Başladı (Dosya[OCR] + LangGraph)...")
    while True:
        try:
            did_file = process_file_queue()
            did_question = process_question_queue()

            if not did_file and not did_question:
                time.sleep(2)
                
        except Exception as e:
            logger.error(f"Worker Loop Critical Error: {e}")
            time.sleep(5)

@asynccontextmanager
async def lifespan(app: FastAPI):
    worker_thread = threading.Thread(target=run_worker_loop, daemon=True)
    worker_thread.start()
    
    logger.info("🚀 BABYZLEXIT AI ENGINE (OCR + LangGraph) HAZIR!")
    yield

app = FastAPI(title="BabyLexit AI Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API ENDPOINTS ---

class AnalysisRequest(BaseModel):
    question_id: str

@app.get("/")
def read_root():
    return {"status": "active", "engine": "LangGraph + Gemini 2.0 + OCR"}

@app.post("/analyze")
async def trigger_analysis(request: AnalysisRequest, background_tasks: BackgroundTasks):
    if not request.question_id:
        raise HTTPException(status_code=400, detail="Question ID required")
    
    if start_analysis:
        background_tasks.add_task(start_analysis, request.question_id)
        return {"status": "accepted", "message": "Analysis started immediately"}
    
    return {"status": "error", "message": "Analysis engine not ready"}

class ChatRequest(BaseModel):
    query: str

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    if not graph_app:
        raise HTTPException(status_code=503, detail="AI Engine not ready")
    
    try:
        inputs = {
            "question_id": "api-request",
            "query": req.query,
            "safety_status": "unknown",
            "route": "internal",
            "final_report": "",
            "status": "processing"
        }
        result = await graph_app.ainvoke(inputs)
        return {
            "response": result.get("final_report"),
            "route_used": result.get("route"),
            "sources": {
                "rag": result.get("rag_result").dict() if result.get("rag_result") else None,
                "web": result.get("web_result").dict() if result.get("web_result") else None
            }
        }
    except Exception as e:
        logger.error(f"API Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)