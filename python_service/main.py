import os
import time
import threading
import asyncio
import logging
import pathlib
from contextlib import asynccontextmanager
from io import BytesIO

# --- 1. ÇEVRESEL DEĞİŞKENLERİ (ENV) EN BAŞTA YÜKLE ---
from dotenv import load_dotenv

# Loglama ayarları
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("BabyLexitMain")

# .env dosyasını bul ve yükle (Hem mevcut klasöre hem üst klasöre bakar)
current_dir = pathlib.Path(__file__).parent
env_path = current_dir / '.env'

if not env_path.exists():
    logger.warning(f"⚠️  .env dosyası {env_path} konumunda bulunamadı. Üst dizine bakılıyor...")
    env_path = current_dir.parent / '.env'

if env_path.exists():
    load_dotenv(env_path)
    logger.info(f"✅ .env yüklendi: {env_path}")
else:
    logger.error("❌ KRİTİK: .env dosyası hiçbir yerde bulunamadı!")

# --- 2. IMPORTLAR (ENV YÜKLENDİKTEN SONRA) ---
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from supabase import create_client, Client
import pdfplumber
import pytesseract
from PIL import Image
from sentence_transformers import SentenceTransformer

# --- 3. LANGGRAPH ORKESTRASYONU ---
try:
    from graph import start_analysis, app as graph_app
    logger.info("✅ Graph modülü başarıyla yüklendi.")
except Exception as e:
    start_analysis = None
    graph_app = None
    logger.warning(f"⚠️ UYARI: graph.py yüklenemedi veya çalıştırılamadı. Hata: {e}")
    logger.warning("AI motoru sınırlı modda (Sadece Dosya İşleme ve Embedding) çalışacak.")

# --- 4. KONFIGÜRASYON KONTROLÜ ---
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
MODEL_NAME = 'BAAI/bge-m3'

supabase = None
if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("❌ Hata: SUPABASE_URL veya SUPABASE_KEY eksik. Lütfen .env dosyasını kontrol edin.")
else:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("✅ Supabase bağlantısı başarılı.")
    except Exception as e:
        logger.error(f"❌ Supabase Bağlantı Hatası: {e}")

# Global Değişkenler
embed_model = None

# -----------------------------------------------------------------------------
# 5. DOSYA İŞLEME VE EMBEDDING
# -----------------------------------------------------------------------------

logger.info(f"📥 Yerel AI Modeli Yükleniyor (CPU): {MODEL_NAME} ...")
try:
    embed_model = SentenceTransformer(MODEL_NAME, device='cpu')
    logger.info("✅ Yerel Embedding Modeli Hazır!")
except Exception as e:
    logger.error(f"❌ Model Hatası: {e}")

def get_local_embedding(text: str):
    """Metni vektöre çevirir."""
    try:
        if not embed_model: return []
        embedding = embed_model.encode(text, normalize_embeddings=True)
        return embedding.tolist()
    except Exception as e:
        logger.error(f"Embedding Hatası: {e}")
        return []

def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100):
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if chunk: chunks.append(chunk)
        start = end - overlap
    return chunks

def process_file_queue():
    """Kullanıcının yüklediği dosyaları işler. (PDF + OCR Resim Desteği)"""
    if not supabase: return False

    try:
        res = supabase.table('file_processing_queue').select("*").eq('status', 'pending').limit(1).execute()
        if not res.data: return False

        job = res.data[0]
        logger.info(f"📂 Dosya İşleniyor: {job['file_path']}")
        
        supabase.table('file_processing_queue').update({'status': 'processing'}).eq('id', job['id']).execute()
        
        # Dosyayı İndir
        file_bytes = supabase.storage.from_('raw_uploads').download(job['file_path'])
        
        text = ""
        ftype = job.get('file_type', '').lower()
        if not ftype:
            ftype = job['file_path'].split('.')[-1].lower()
        
        # --- DOSYA OKUMA MANTIĞI ---
        if 'pdf' in ftype:
            try:
                with pdfplumber.open(BytesIO(file_bytes)) as pdf:
                    for page in pdf.pages:
                        text += (page.extract_text() or "") + "\n"
            except Exception as pdf_err:
                logger.error(f"PDF Okuma Hatası: {pdf_err}")
                
        elif ftype in ['jpg', 'jpeg', 'png', 'bmp', 'tiff']:
            try:
                image = Image.open(BytesIO(file_bytes))
                text = pytesseract.image_to_string(image) 
            except Exception:
                logger.warning("OCR Hatası veya Tesseract yüklü değil.")
                text = ""
        else:
            text = file_bytes.decode('utf-8', errors='ignore')

        if len(text.strip()) < 10: 
            raise ValueError(f"Dosyadan anlamlı metin çıkarılamadı.")

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
        logger.error(f"❌ Dosya İşleme Hatası: {e}")
        if 'job' in locals() and supabase:
            supabase.table('file_processing_queue').update({'status': 'failed', 'error_message': str(e)}).eq('id', job['id']).execute()
        return False

# -----------------------------------------------------------------------------
# 6. ASYNC HELPER & QUESTION WORKER
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
    if not supabase: return False

    try:
        res = supabase.table('questions').select("*").eq('status', 'analyzing').limit(1).execute()
        if not res.data: return False

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
# 7. ANA DÖNGÜ VE API
# -----------------------------------------------------------------------------

def run_worker_loop():
    logger.info("👷 Worker Thread Başladı...")
    while True:
        try:
            if not supabase:
                time.sleep(10)
                continue
            did_file = process_file_queue()
            did_question = process_question_queue()
            if not did_file and not did_question:
                time.sleep(2)
        except Exception as e:
            logger.error(f"Worker Loop Error: {e}")
            time.sleep(5)

@asynccontextmanager
async def lifespan(app: FastAPI):
    worker_thread = threading.Thread(target=run_worker_loop, daemon=True)
    worker_thread.start()
    logger.info("🚀 BABYZLEXIT AI ENGINE HAZIR!")
    yield

app = FastAPI(title="BabyLexit AI Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API MODELLERİ ---
class AnalysisRequest(BaseModel):
    question_id: str

class EmbedRequest(BaseModel):
    text: str

class ChatRequest(BaseModel):
    query: str

# --- ENDPOINTLER ---

@app.get("/")
def read_root():
    return {"status": "active", "graph": bool(graph_app), "db": bool(supabase)}

@app.post("/analyze")
async def trigger_analysis(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """Soruyu LangGraph ile analiz et (DB tabanlı)."""
    if not request.question_id:
        raise HTTPException(status_code=400, detail="Question ID required")
    
    if start_analysis:
        background_tasks.add_task(start_analysis, request.question_id)
        return {"status": "accepted", "message": "Analysis started"}
    return {"status": "error", "message": "AI Engine not ready"}

@app.post("/embed")
async def embed_endpoint(req: EmbedRequest):
    """(YENİ) Metni vektöre çevir. Next.js tarafından RAG araması için kullanılır."""
    if not embed_model:
        raise HTTPException(status_code=503, detail="Embedding model not loaded")
    
    vector = get_local_embedding(req.text)
    return {"embedding": vector}

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """(OPSİYONEL) Direkt Chat endpoint'i."""
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
        return {"response": result.get("final_report")}
    except Exception as e:
        logger.error(f"API Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)