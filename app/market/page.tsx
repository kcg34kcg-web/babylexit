'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Zap, Star, ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

// Kredi Paketleri
const PACKAGES = [
  { id: 1, name: 'Başlangıç Paketi', credits: 5, price: '₺50', icon: Zap, popular: false },
  { id: 2, name: 'Hukukçu Paketi', credits: 15, price: '₺120', icon: Star, popular: true },
  { id: 3, name: 'Büro Paketi', credits: 50, price: '₺350', icon: ShieldCheck, popular: false },
];

export default function MarketPage() {
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [currentCredits, setCurrentCredits] = useState(0);
  const supabase = createClient();
  const router = useRouter();

  // Krediyi Çek
  const fetchCredits = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
    if (data) setCurrentCredits(data.credits);
    setLoading(false);
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  // Satın Alma Simülasyonu
  const handlePurchase = async (pkg: typeof PACKAGES[0]) => {
    setBuyingId(pkg.id);
    
    // 1. Ödeme Simülasyonu (2 saniye bekle)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 2. Kredi Yükleme (Veritabanı Güncelleme)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Not: Gerçek hayatta bu işlem Backend'de yapılmalı (Güvenlik için).
    // MVP olduğu için burada yapıyoruz.
    const newAmount = currentCredits + pkg.credits;
    
    const { error } = await supabase
      .from('profiles')
      .update({ credits: newAmount })
      .eq('id', user.id);

    if (error) {
      toast.error('Satın alma başarısız oldu.');
    } else {
      toast.success(`${pkg.credits} Kredi hesabınıza eklendi! 🎉`);
      setCurrentCredits(newAmount);
      router.refresh(); // Sayfayı yenile ki menüdeki kredi de güncellensin
    }
    
    setBuyingId(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Üst Bar */}
        <div className="flex justify-between items-center mb-10">
           <Link href="/" className="flex items-center text-slate-400 hover:text-amber-500 transition-colors">
              <ArrowLeft className="mr-2" size={20} /> Ana Sayfa
           </Link>
           <div className="bg-slate-900 border border-amber-500/30 px-5 py-2 rounded-full text-amber-500 font-bold flex items-center gap-2">
              <Zap size={18} />
              Kalan Kredi: {currentCredits}
           </div>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Market</h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Hukuki araştırmalarınızda daha fazla yapay zeka gücüne mi ihtiyacınız var?
            İhtiyacınıza uygun paketi seçin.
          </p>
        </div>

        {/* Paket Kartları */}
        <div className="grid md:grid-cols-3 gap-8">
          {PACKAGES.map((pkg) => (
            <div 
              key={pkg.id} 
              className={`relative bg-slate-900 border rounded-2xl p-8 transition-all hover:transform hover:-translate-y-2 hover:shadow-2xl ${
                pkg.popular 
                  ? 'border-amber-500 shadow-amber-500/10 ring-1 ring-amber-500' 
                  : 'border-slate-800 hover:border-slate-600'
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-amber-500 text-slate-950 text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                  En Popüler
                </div>
              )}

              <div className="flex justify-center mb-6">
                <div className={`p-4 rounded-full ${pkg.popular ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-800 text-slate-400'}`}>
                  <pkg.icon size={32} />
                </div>
              </div>

              <h3 className="text-xl font-bold text-white text-center mb-2">{pkg.name}</h3>
              <div className="text-center mb-6">
                <span className="text-3xl font-bold text-white">{pkg.price}</span>
              </div>

              <ul className="space-y-3 mb-8 text-sm text-slate-400">
                <li className="flex items-center justify-center gap-2">
                  <span className="text-white font-bold">{pkg.credits}</span> Soru Hakkı
                </li>
                <li className="flex items-center justify-center gap-2">
                   Hızlı AI Yanıtı
                </li>
              </ul>

              <button
                onClick={() => handlePurchase(pkg)}
                disabled={buyingId !== null}
                className={`w-full py-3 px-6 rounded-lg font-bold transition-all flex justify-center items-center ${
                  pkg.popular 
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' 
                    : 'bg-slate-800 text-white hover:bg-slate-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {buyingId === pkg.id ? (
                  <><Loader2 className="animate-spin mr-2" /> İşleniyor...</>
                ) : (
                  'Satın Al'
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}