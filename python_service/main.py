import os
import time
import threading
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

# API Kütüphaneleri
from fastapi import FastAPI, HTTPException
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

# --- KATMANLAR ---
from layers.guard import GuardLayer         # Katman 0: Güvenlik
from layers.router import SemanticRouter    # Katman 1: Yönlendirme
from layers.rag import InternalRAGAgent     # Katman 2: Hukuk Uzmanı

# .env yükle
load_dotenv()

# --- KONFIGÜRASYON ---
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
MODEL_NAME = 'BAAI/bge-m3'

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Hata: .env eksik veya hatalı.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Global Değişkenler
embed_model = None  # Yerel BGE-M3 Modeli (Dosya işleme ve RAG araması için)
guard = None        # Güvenlik Katmanı
router = None       # Yönlendirici (Gemini)
rag_agent = None    # Hukuk Uzmanı (RAG)

# --- MODEL YÜKLEME (Yerel) ---
print(f"📥 Yerel AI Modeli Yükleniyor (CPU): {MODEL_NAME} ...")
try:
    embed_model = SentenceTransformer(MODEL_NAME, device='cpu')
    print("✅ Yerel Embedding Modeli Hazır!")
except Exception as e:
    print(f"❌ Model Hatası: {e}")
    exit(1)

# --- YARDIMCI FONKSİYONLAR ---
def get_local_embedding(text: str) -> List[float]:
    """BGE-M3 ile 1024 boyutlu vektör üretir."""
    try:
        embedding = embed_model.encode(text, normalize_embeddings=True)
        return embedding.tolist()
    except Exception as e:
        print(f"Embedding Hatası: {e}")
        return []

def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> List[str]:
    chunks = []
    start = 0
    text_len = len(text)
    while start < text_len:
        end = start + chunk_size
        if end < text_len:
            last_space = text.rfind(' ', start, end)
            if last_space != -1 and last_space > start: end = last_space
        chunk = text[start:end].strip()
        if chunk: chunks.append(chunk)
        start = end - overlap
    return chunks

# --- WORKER (Dosya İşleme - Değişmedi) ---
def process_queue_item(job):
    """Kuyruktaki dosyayı işler ve vektör veritabanına kaydeder."""
    try:
        job_id = job['id']
        file_path = job['file_path']
        print(f"🔄 Worker İşliyor: {file_path}")
        
        supabase.table('file_processing_queue').update({'status': 'processing'}).eq('id', job_id).execute()
        
        res = supabase.storage.from_('raw_uploads').download(file_path)
        file_bytes = res
        
        text = ""
        ftype = job.get('file_type', '').lower()
        
        if 'pdf' in ftype:
            with pdfplumber.open(BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    extracted = page.extract_text()
                    if extracted: text += extracted + "\n"
        elif 'image' in ftype:
            img = Image.open(BytesIO(file_bytes))
            text = pytesseract.image_to_string(img, lang='tur+eng')
        else:
            text = file_bytes.decode('utf-8', errors='ignore')

        if len(text.strip()) < 10: 
            raise ValueError("Dosyadan anlamlı veri okunamadı.")

        chunks = chunk_text(text)
        docs = []
        for i, chunk in enumerate(chunks):
            vec = get_local_embedding(chunk)
            if vec:
                docs.append({
                    'content': chunk,
                    'metadata': {'source': file_path, 'user_id': job['user_id']},
                    'embedding': vec
                })
        
        if docs: 
            supabase.table('documents').insert(docs).execute()
        
        supabase.table('file_processing_queue').update({'status': 'completed'}).eq('id', job_id).execute()
        print(f"✅ Worker Tamamladı: {file_path}")

    except Exception as e:
        print(f"❌ Worker Hatası: {e}")
        supabase.table('file_processing_queue').update({'status': 'failed', 'error_message': str(e)}).eq('id', job['id']).execute()

def run_worker_loop():
    print("👷 Worker Thread Başladı...")
    while True:
        try:
            res = supabase.table('file_processing_queue').select("*").eq('status', 'pending').limit(1).execute()
            if res.data:
                process_queue_item(res.data[0])
            else:
                time.sleep(2)
        except Exception as e:
            print(f"Worker Loop Error: {e}")
            time.sleep(5)

# --- LIFESPAN (Başlatma Ayarları) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    global guard, router, rag_agent
    
    # 1. Guard (Güvenlik)
    print("🛡️ GuardLayer Başlatılıyor...")
    guard = GuardLayer()

    # 2. Router (Beyin)
    print("🧠 Semantic Router Başlatılıyor...")
    router = SemanticRouter()

    # 3. RAG Agent (Hukuk Uzmanı)
    print("⚖️ RAG Agent Başlatılıyor...")
    rag_agent = InternalRAGAgent(supabase)
    
    # 4. Worker (Arka Plan)
    worker_thread = threading.Thread(target=run_worker_loop, daemon=True)
    worker_thread.start()
    
    print("🚀 BABYZLEXIT BACKEND HAZIR!")
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REQUEST MODELLERİ ---
class EmbedRequest(BaseModel):
    text: str

class RouteRequest(BaseModel):
    query: str

# --- ENDPOINTS ---

@app.get("/")
def health_check():
    return {
        "status": "active", 
        "modules": ["Guard", "Router (Gemini)", "RAG Agent", "Local Embedding (BGE-M3)"]
    }

@app.post("/embed")
async def create_embedding(req: EmbedRequest):
    """Dosya yükleme vb. için sadece embedding döner."""
    vector = get_local_embedding(req.text)
    if not vector: raise HTTPException(status_code=500, detail="Embedding failed")
    return {"embedding": vector}

@app.post("/route")
async def route_query(req: RouteRequest):
    """
    ANA GİRİŞ KAPISI:
    1. Güvenlik Kontrolü
    2. Rota Belirleme (Hukuk mu? Sohbet mi?)
    3. Gerekirse RAG Çalıştırma (Cevabı üretme)
    """
    
    # 1. Güvenlik
    security = await guard.analyze_input(req.query)
    if not security.is_safe:
         return {
             "action": "blocked",
             "response": f"Güvenlik Uyarısı: {security.reason}",
             "confidence": 1.0
         }

    safe_query = security.refined_query or req.query
    
    # 2. Yönlendirme (Gemini Düşünüyor)
    decision = await router.route(safe_query)
    
    # Eğer Router "Hukuk" veya "Karmaşık" dediyse -> Avukatı Çağır (RAG)
    if decision.action == "route" and decision.target_layer in ["internal_rag", "hybrid_research"]:
        print(f"🔄 RAG Katmanı Tetikleniyor: {safe_query}")
        
        # RAG için Yerel Embedding Üret (Çünkü veritabanı BGE-M3 ile kayıtlı)
        rag_vector = get_local_embedding(safe_query)
        
        if rag_vector:
            # RAG Agent'a sor
            rag_result = await rag_agent.process(safe_query, rag_vector)
            
            # Cevabı Router sonucunun içine gömüyoruz
            # Frontend sadece 'cached_response' alanına bakarak cevabı gösterebilir
            decision.cached_response = rag_result["answer"]
            
            # Kaynakları reasoning'e ekle (Debug için)
            if rag_result.get("sources"):
                decision.reasoning += f"\n[Referanslar: {', '.join(rag_result['sources'])}]"
        else:
            decision.reasoning += " (Embedding hatası nedeniyle RAG çalıştırılamadı)"

    return decision

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)