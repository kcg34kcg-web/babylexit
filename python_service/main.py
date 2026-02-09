import os
import time
import json
import requests
from io import BytesIO
from typing import List

# Kütüphaneler
from supabase import create_client, Client
from dotenv import load_dotenv
import pdfplumber
import pytesseract
from PIL import Image

# Yerel Yapay Zeka Beyni
from sentence_transformers import SentenceTransformer

# .env yükle
load_dotenv()

# Konfigürasyon
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Hata: .env dosyasında SUPABASE_URL veya SERVICE_ROLE_KEY eksik.")
    exit(1)

# Supabase Bağlantısı
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- MODEL SEÇİMİ ---
# Seçenek 1 (Premium Kalite): 'BAAI/bge-m3' (RAM > 2GB varsa)
# Seçenek 2 (Hız/Düşük RAM): 'intfloat/multilingual-e5-small' (RAM < 1GB ise)
MODEL_NAME = 'BAAI/bge-m3' 

print(f"📥 Yapay Zeka Modeli Yükleniyor: {MODEL_NAME} ...")
try:
    # device='cpu' (Sunucuda GPU yoksa), GPU varsa 'cuda'
    embed_model = SentenceTransformer(MODEL_NAME, device='cpu')
    print("✅ Model Başarıyla Yüklendi! Göreve Hazır.")
except Exception as e:
    print(f"❌ Model Yükleme Hatası: {e}")
    print("💡 İPUCU: Sunucu RAM'i yetmiyor olabilir. 'intfloat/multilingual-e5-small' deneyin.")
    exit(1)

def get_embedding(text: str) -> List[float]:
    """Metni vektöre çevirir."""
    try:
        # normalize_embeddings=True: Kosinüs benzerliği için önemlidir
        embedding = embed_model.encode(text, normalize_embeddings=True)
        return embedding.tolist()
    except Exception as e:
        print(f"⚠️ Embedding Hatası: {e}")
        return None

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """PDF okuyucu."""
    text_content = ""
    try:
        with pdfplumber.open(BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text_content += extracted + "\n"
    except Exception as e:
        print(f"PDF Okuma Hatası: {e}")
    return text_content

def extract_text_from_image(file_bytes: bytes) -> str:
    """Görsel Okuyucu (OCR)."""
    try:
        image = Image.open(BytesIO(file_bytes))
        # Türkçe ve İngilizce tara
        text = pytesseract.image_to_string(image, lang='tur+eng')
        return text
    except Exception as e:
        print(f"OCR Hatası: {e}")
        return ""

def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> List[str]:
    """Metni akıllıca böler."""
    chunks = []
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = start + chunk_size
        
        # Cümlenin ortasından bölmemek için son boşluğu bul
        if end < text_len:
            last_space = text.rfind(' ', start, end)
            if last_space != -1 and last_space > start:
                end = last_space
        
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        
        start = end - overlap
        
    return chunks

def process_job(job):
    """Kuyruktaki işi alır ve bitirir."""
    job_id = job['id']
    file_path = job['file_path']
    file_type = job['file_type']
    user_id = job['user_id']
    
    print(f"🔄 [Processing] Dosya: {file_path}")
    
    try:
        # 1. Durumu 'processing' yap
        supabase.table('file_processing_queue').update({'status': 'processing'}).eq('id', job_id).execute()
        
        # 2. Dosyayı İndir
        # NOT: Storage bucket adınızın 'raw_uploads' olduğundan emin olun!
        print("⬇️  Dosya indiriliyor...")
        response = supabase.storage.from_('raw_uploads').download(file_path)
        file_bytes = response

        # 3. Metni Çıkar
        raw_text = ""
        if 'pdf' in file_type:
            raw_text = extract_text_from_pdf(file_bytes)
        elif 'image' in file_type or 'png' in file_type or 'jpg' in file_type:
            raw_text = extract_text_from_image(file_bytes)
        elif 'text' in file_type:
            raw_text = file_bytes.decode('utf-8')
        
        if not raw_text or len(raw_text.strip()) < 10:
            raise ValueError("Dosya boş veya okunamadı.")

        print(f"📖 Okunan Karakter: {len(raw_text)}")

        # 4. Parçala (Chunking)
        chunks = chunk_text(raw_text)
        print(f"🧩 Parça Sayısı: {len(chunks)}")
        
        # 5. Vektörleştir ve Kaydet
        docs_to_insert = []
        for i, chunk in enumerate(chunks):
            vector = get_embedding(chunk)
            if vector:
                docs_to_insert.append({
                    'content': chunk,
                    'metadata': {
                        'source': file_path,
                        'chunk_index': i,
                        'user_id': user_id,
                        'type': 'internal_knowledge'
                    },
                    'embedding': vector
                })
        
        if docs_to_insert:
            # Batch Insert (Hız için toplu kayıt)
            supabase.table('documents').insert(docs_to_insert).execute()
        
        # 6. Başarılı
        supabase.table('file_processing_queue').update({
            'status': 'completed',
            'updated_at': 'now()'
        }).eq('id', job_id).execute()
        
        print(f"✅ [Completed] {file_path} hafızaya eklendi.")

    except Exception as e:
        print(f"❌ [Failed] Hata: {e}")
        supabase.table('file_processing_queue').update({
            'status': 'failed',
            'error_message': str(e),
            'updated_at': 'now()'
        }).eq('id', job_id).execute()

def main_loop():
    print(f"🚀 Knowledge Engine Başlatıldı | Model: {MODEL_NAME}")
    print("👀 Kuyruk dinleniyor: file_processing_queue...")
    
    while True:
        try:
            # Bekleyen iş var mı?
            response = supabase.table('file_processing_queue')\
                .select("*")\
                .eq('status', 'pending')\
                .order('created_at', desc=False)\
                .limit(1)\
                .execute()
            
            jobs = response.data
            
            if jobs:
                process_job(jobs[0])
            else:
                # İş yoksa 2 saniye uyu (CPU tasarrufu)
                time.sleep(2)
                
        except Exception as e:
            print(f"⚠️ Döngü Hatası: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main_loop()