import os
import time
import threading
import asyncio
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager
from datetime import datetime

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
from layers.guard import GuardLayer
from layers.router import SemanticRouter
from layers.rag import InternalRAGAgent

# .env yükle (Üst dizini kontrol et)
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

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
guard = None
router = None
rag_agent = None

# --- MODEL YÜKLEME ---
print(f"📥 Yerel AI Modeli Yükleniyor (CPU): {MODEL_NAME} ...")
try:
    embed_model = SentenceTransformer(MODEL_NAME, device='cpu')
    print("✅ Yerel Embedding Modeli Hazır!")
except Exception as e:
    print(f"❌ Model Hatası: {e}")
    exit(1)

# --- YARDIMCI FONKSİYONLAR ---
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

# --- ASYNC WRAPPER ---
def run_async(coro):
    """Senkron thread içinde Asenkron fonksiyon çalıştırmak için"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)

# --- İŞÇİ 1: DOSYA İŞLEME ---
def process_file_queue():
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

# --- İŞÇİ 2: SORU CEVAPLAMA (YENİ EKLENEN KISIM) ---
def process_question_queue():
    try:
        # 1. 'analyzing' durumundaki soruları bul
        res = supabase.table('questions').select("*").eq('status', 'analyzing').limit(1).execute()
        if not res.data: return False

        question = res.data[0]
        q_text = f"{question['title']} \n {question['content']}"
        print(f"⚖️ Soru Analiz Ediliyor: {question['title']}")

        # 2. Embedding Al
        vec = get_local_embedding(q_text)
        
        # 3. RAG Agent'a Sor (Async işlemi Sync içinde çalıştır)
        # Not: Global rag_agent lifespan ile başlatıldığı için burada doğrudan erişilebilir
        if rag_agent:
            result = run_async(rag_agent.process(q_text, vec))
            answer_text = result["answer"]
        else:
            answer_text = "Sistem şu an hukuk modülüne erişemiyor."

        # 4. Cevabı 'answers' Tablosuna Ekle
        answer_data = {
            "question_id": question['id'],
            "user_id": question['user_id'], # Cevabı soruyu soran kişinin adına değil, AI adına eklemek gerekebilir ama şema gereği user_id zorunluysa soran kişiyi veya AI bot ID'sini kullanın.
            "content": answer_text,
            "is_ai_generated": True,
            "is_verified": False,
            "ai_score": 85,
            "upvotes": 0,
            "downvotes": 0
        }
        
        # Eğer sistemde bir 'AI Bot' kullanıcısı varsa onun ID'sini kullanmak daha iyi olur.
        # Yoksa soruyu soran kişiye atıyoruz (geçici çözüm)
        supabase.table('answers').insert(answer_data).execute()

        # 5. Sorunun Durumunu Güncelle
        supabase.table('questions').update({'status': 'answered'}).eq('id', question['id']).execute()
        
        print(f"✅ Soru Cevaplandı ve DB'ye Yazıldı.")
        return True

    except Exception as e:
        print(f"❌ Soru Cevaplama Hatası: {e}")
        # Hata durumunda loop'a girmemesi için durumu değiştirelim veya loglayalım
        # supabase.table('questions').update({'status': 'failed'}).eq('id', question['id']).execute()
        return False

# --- ANA DÖNGÜ ---
def run_worker_loop():
    print("👷 Worker Thread (Dosya + Soru) Başladı...")
    while True:
        try:
            # Önce dosya var mı bak
            did_file = process_file_queue()
            
            # Sonra soru var mı bak
            did_question = process_question_queue()

            # İkisi de yoksa bekle
            if not did_file and not did_question:
                time.sleep(2)
                
        except Exception as e:
            print(f"Worker Loop Error: {e}")
            time.sleep(5)

# --- LIFESPAN ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    global guard, router, rag_agent
    
    print("🛡️ Modüller Başlatılıyor...")
    guard = GuardLayer()
    router = SemanticRouter()
    rag_agent = InternalRAGAgent(supabase)
    
    # Worker Thread Başlat
    worker_thread = threading.Thread(target=run_worker_loop, daemon=True)
    worker_thread.start()
    
    print("🚀 BABYZLEXIT BACKEND & WORKER HAZIR!")
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RouteRequest(BaseModel):
    query: str

@app.post("/route")
async def route_query(req: RouteRequest):
    # API üzerinden de cevap verebilmek için (Chat ekranı vs.)
    vec = get_local_embedding(req.query)
    result = await rag_agent.process(req.query, vec)
    return {"cached_response": result["answer"]}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)