import os
import time
import json
from dotenv import load_dotenv
from supabase import create_client, Client

# 1. Ortam Değişkenlerini Yükle
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("❌ HATA: .env dosyasında SUPABASE_URL veya SUPABASE_KEY eksik.")
    exit(1)

# 2. Supabase Bağlantısını Kur
supabase: Client = create_client(url, key)

print("🚀 Python Gözcü Servisi Başlatıldı (Babylexit AI)")
print("📡 Research Jobs tablosu izleniyor...")

def process_job(job):
    """
    Tek bir işi işleyen fonksiyon.
    Şimdilik sadece durumu 'processing' yapıp bekleyecek.
    """
    job_id = job['id']
    query = job['query']
    user_id = job['user_id']

    print(f"\n🔔 YENİ İŞ BULUNDU! ID: {job_id}")
    print(f"📝 Soru: {query}")

    try:
        # A. Durumu 'processing' yap (Lounge ekranı değişsin)
        supabase.table('research_jobs').update({'status': 'processing'}).eq('id', job_id).execute()
        print("✅ Durum 'processing' olarak güncellendi.")

        # --- BURASI SONRA DOLACAK (MELEZ YAPI) ---
        # 1. Google'da Ara
        # 2. Siteleri Oku
        # 3. Özetle
        
        # SİMÜLASYON: Sanki araştırma yapıyormuş gibi 5 saniye bekle
        time.sleep(5) 
        
        simulated_result = f"Python servisi bu soruyu gördü ve işledi: {query}. (Henüz gerçek arama yapmadım)"
        
        # B. Durumu 'completed' yap ve sonucu yaz
        supabase.table('research_jobs').update({
            'status': 'completed',
            'result': simulated_result,
            'sources': [{'title': 'Sistem Testi', 'url': 'python-service'}]
        }).eq('id', job_id).execute()
        
        print("🏁 İş tamamlandı ve veritabanına yazıldı.")

    except Exception as e:
        print(f"❌ İŞLEM HATASI: {e}")
        # Hata durumunda veritabanını güncelle
        supabase.table('research_jobs').update({
            'status': 'failed',
            'result': 'Sistem hatası oluştu.'
        }).eq('id', job_id).execute()

def main_loop():
    """
    Sonsuz döngü. Sürekli yeni iş var mı diye bakar.
    """
    while True:
        try:
            # 'pending' durumundaki işleri çek
            response = supabase.table('research_jobs').select("*").eq('status', 'pending').execute()
            jobs = response.data

            if jobs:
                for job in jobs:
                    process_job(job)
            
            # CPU'yu yormamak için 2 saniye uyu
            time.sleep(2)

        except Exception as e:
            print(f"⚠️ Döngü Hatası: {e}")
            time.sleep(5) # Hata olursa biraz daha uzun bekle

if __name__ == "__main__":
    main_loop()