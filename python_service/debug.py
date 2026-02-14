import os
import sys
from dotenv import load_dotenv

# 1. Çevresel Değişkenleri Yükle
load_dotenv()
print("✅ .env yüklendi.")

# 2. Yolları Ayarla
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

print("\n--- GRAPH MODÜLÜ TEST EDİLİYOR ---")
try:
    import graph
    print("✅ BAŞARILI: graph.py sorunsuz yüklendi!")
except Exception as e:
    print(f"\n❌ HATA TESPİT EDİLDİ:")
    print(f"Tür: {type(e).__name__}")
    print(f"Mesaj: {e}")
    print("\n--- DETAYLI HATA ANALİZİ ---")
    import traceback
    traceback.print_exc()

print("\n--- TEST BİTTİ ---")