import os
import time
import threading
from typing import List, Optional
from contextlib import asynccontextmanager

# API Kütüphaneleri
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware # 1. DEĞİŞİKLİK BURADA: CORS eklendi
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

# --- GÜVENLİK KATMANI ---
# GuardLayer sınıfını import ediyoruz
from layers.guard import GuardLayer

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
embed_model = None
guard = None  # GuardLayer örneği için yer tutucu

# --- MODEL YÜKLEME (Global) ---
print(f"📥 AI Modeli Yükleniyor: {MODEL_NAME} ...")
try:
    # CPU modunda çalıştırıyoruz
    embed_model = SentenceTransformer(MODEL_NAME, device='cpu')
    print("✅ Embedding Modeli Hazır!")
except Exception as e:
    print(f"❌ Model Hatası: {e}")
    exit(1)

# --- YARDIMCI FONKSİYONLAR ---
def get_embedding(text: str) -> List[float]:
    try:
        # BGE-M3 1024 boyutlu vektör üretir
        embedding = embed_model.encode(text, normalize_embeddings=True)
        return embedding.tolist()
    except Exception as e:
        print(f"Embedding Hatası: {e}")
        return None

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

# --- WORKER (ARKA PLAN İŞÇİSİ) ---
def process_queue_item(job):
    """Kuyruktaki dosyayı işler."""
    try:
        job_id = job['id']
        file_path = job['file_path']
        print(f"🔄 Worker İşliyor: {file_path}")
        
        supabase.table('file_processing_queue').update({'status': 'processing'}).eq('id', job_id).execute()
        
        # Dosyayı İndir
        res = supabase.storage.from_('raw_uploads').download(file_path)
        file_bytes = res
        
        # Metni Çıkar
        text = ""
        # Basit dosya türü kontrolü
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
            # Düz metin varsayalım
            text = file_bytes.decode('utf-8', errors='ignore')

        if len(text.strip()) < 10: 
            raise ValueError("Dosyadan anlamlı veri okunamadı.")

        # Chunk ve Embed
        chunks = chunk_text(text)
        docs = []
        for i, chunk in enumerate(chunks):
            vec = get_embedding(chunk)
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
    """Sonsuz döngüde kuyruğu dinler."""
    print("👷 Worker Thread Başladı - Kuyruk Dinleniyor...")
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

# --- FASTAPI SETUP ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    global guard
    
    # 1. GuardLayer Başlat
    print("🛡️ Sentinel GuardLayer Başlatılıyor...")
    guard = GuardLayer()
    
    # 2. Worker Thread Başlat
    worker_thread = threading.Thread(target=run_worker_loop, daemon=True)
    worker_thread.start()
    
    yield
    # Kapanırken yapılacaklar (gerekirse)

app = FastAPI(lifespan=lifespan)

# 2. DEĞİŞİKLİK BURADA: CORS İzni (Next.js'in API'ye erişebilmesi için)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Next.js'in çalıştığı portlar
    allow_credentials=True,
    allow_methods=["*"],  # GET, POST, PUT, DELETE vb. hepsine izin ver
    allow_headers=["*"],  # Tüm headerlara izin ver
)

class EmbedRequest(BaseModel):
    text: str

@app.get("/")
def health_check():
    return {"status": "active", "model": MODEL_NAME, "security": "Sentinel Active"}

@app.post("/embed")
async def create_embedding(req: EmbedRequest):
    """
    Next.js buraya metin atar, vektör alır.
    ARTIK GÜVENLİ: Önce GuardLayer'dan geçer.
    """
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    # 1. Güvenlik Kontrolü (Sentinel)
    security_result = await guard.analyze_input(req.text)

    if not security_result.is_safe:
        print(f"🚨 BLOCKED: {security_result.category} | Reason: {security_result.reason}")
        raise HTTPException(
            status_code=403, 
            detail=f"Input blocked by Security Guard. Reason: {security_result.reason} ({security_result.category})"
        )

    # 2. Güvenli/Temizlenmiş Metni Kullan
    safe_text = security_result.refined_query if security_result.refined_query else req.text
    
    # 3. Embedding Üret
    vector = get_embedding(safe_text)
    
    if not vector:
        raise HTTPException(status_code=500, detail="Embedding generation failed")
    
    return {
        "embedding": vector,
        "original_text": req.text,
        "processed_text": safe_text,
        "is_modified": security_result.category == "MODIFIED"
    }

# --- BAŞLATMA ---
if __name__ == "__main__":
    # Localhost 8000 portunda çalışır
    uvicorn.run(app, host="0.0.0.0", port=8000)