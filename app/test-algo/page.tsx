'use client';

import { useEffect, useState } from 'react';
import { BabylexitRecommender, AlgoPost } from '@/utils/recommendationAlgorithm';

export default function AlgorithmTestPage() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    runSimulation();
  }, []);

  const log = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  const runSimulation = () => {
    const now = new Date();
    
    // --- SENARYO VERİLERİ ---
    // Kullanıcı Profili: "Anayasa Hukuku" ile ilgileniyor.
    // Alaka Çarpanı: 1.5x
    
    // Post A: İlgili, Yeni (DOKUNULMAZ), Orta Etkileşim
    // 1.5 saat önce atıldı (< 2 saat olduğu için dokunulmazlık devreye girmeli)
    const postA: AlgoPost = {
      id: 'A',
      title: 'İlgili Anayasa Gönderisi (Yeni & Alakalı)',
      woow_count: 15,
      doow_count: 0,
      author_id: 'user1',
      created_at: new Date(now.getTime() - (1.5 * 60 * 60 * 1000)).toISOString()
    };

    // Post B: İlgisiz, Eski (Çürüyen), Yüksek Etkileşim (Viral)
    // 5 saat önce atıldı (Çürüme devrede)
    const postB: AlgoPost = {
      id: 'B',
      title: 'Viral Komik Gönderi (Eski & Alakasız)',
      woow_count: 50, // Çok daha yüksek beğeni
      doow_count: 5,
      author_id: 'user2',
      created_at: new Date(now.getTime() - (5.0 * 60 * 60 * 1000)).toISOString()
    };

    log("--- SİMÜLASYON BAŞLATILIYOR ---");

    // 1. Post A Skor Hesabı
    // Beklenen: Taban(150) * Çarpan(1.5) = 225. Süre < 2 olduğu için Zaman=0.
    // Payda: (0 + 2)^1.8 = 3.48
    // Sonuç: ~64.6
    const scoreA = BabylexitRecommender.calculateScore(postA, 1.5);
    log(`Post A (Alakalı/Yeni) Skoru: ${scoreA}`);

    // 2. Post B Skor Hesabı
    // Beklenen: Taban(425) * Çarpan(1.0) = 425. Zaman=5.
    // Payda: (5 + 2)^1.8 = ~33.09
    // Sonuç: ~12.8
    const scoreB = BabylexitRecommender.calculateScore(postB, 1.0);
    log(`Post B (Viral/Eski) Skoru:   ${scoreB}`);

    // 3. Karşılaştırma ve Doğrulama
    log("--------------------------------");
    if (scoreA > scoreB) {
      log("✅ BAŞARILI: Algoritma doğru çalışıyor.");
      log("Analiz: Daha az beğenisi olan 'Alakalı ve Yeni' içerik, çok beğenilen 'Eski' içeriği geçti.");
      log("Bu, 'Newborn Immunity' ve 'Gravity Decay' mantığının kanıtıdır.");
    } else {
      log("❌ BAŞARISIZ: Matematiksel hata var.");
    }
  };

  return (
    <div className="p-10 max-w-2xl mx-auto font-mono text-sm">
      <h1 className="text-xl font-bold mb-4">Babylexit Algoritma Laboratuvarı</h1>
      <div className="bg-slate-900 text-green-400 p-6 rounded-xl shadow-lg border border-slate-700">
        {logs.map((line, index) => (
          <div key={index} className="mb-2 border-b border-slate-800 pb-1 last:border-0">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}