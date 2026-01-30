'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, ArrowLeft, Sparkles, Users, Scale } from 'lucide-react'; 
import Link from 'next/link';
import { submitQuestion } from '@/app/actions/submit-question';

export default function AskPage() {
  // UI State
  const [credits, setCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEffect, setShowEffect] = useState<'ai' | 'community' | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  // --- 1. KREDİ KONTROLÜ ---
  useEffect(() => {
    const fetchCredits = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      if (error) {
        setCredits(0);
      } else {
        setCredits(data?.credits || 0);
      }
      setIsLoading(false);
    };
    fetchCredits();
  }, [supabase, router]);

  // --- 2. GÜNCELLENEN GÖNDERİM FONKSİYONU ---
  const handleClientSubmit = async (formData: FormData) => {
    const target = formData.get('target') as string;
    const cost = target === 'ai' ? 3 : 1;

    // A. Validasyonlar
    if (credits !== null && credits < cost) {
      toast.error(`Yetersiz kredi. Bu işlem için ${cost} kredi gerekiyor.`);
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast.error('Lütfen tüm alanları doldurun.');
      return;
    }

    setIsSubmitting(true);
    if (target === 'ai') setShowEffect('ai');
    else setShowEffect('community');

    try {
      const result = await submitQuestion(formData);

      if (result?.error) {
        toast.error(`Hata: ${result.error}`);
        setIsSubmitting(false);
        setShowEffect(null);
      } else if (result?.success && result?.questionId) {
        toast.success(target === 'ai' ? 'AI Analizi Tamamlandı!' : 'Soru topluluğa iletildi!');
        router.push(`/questions/${result.questionId}`); 
      }
    } catch (error) {
      console.error(error);
      toast.error('Beklenmedik bir hata oluştu.');
      setIsSubmitting(false);
      setShowEffect(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 relative overflow-hidden">
      
      {/* KREDİ DÜŞME EFEKTİ */}
      {showEffect && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="animate-float-up text-6xl font-black text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
            -{showEffect === 'ai' ? '3' : '1'} Kredi
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        
        {/* ÜST MENÜ */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
          <Link 
            href="/" 
            className="inline-flex items-center text-slate-400 hover:text-amber-500 transition-colors font-medium group"
          >
            <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={20} />
            Ana Menüye Dön
          </Link>

          <div className="self-end md:self-auto">
             {isLoading ? (
              <div className="bg-slate-900 border border-slate-700 px-4 py-2 rounded-full text-slate-400 text-sm animate-pulse">
                Yükleniyor...
              </div>
            ) : (
              <div className={`px-5 py-2 rounded-full font-bold border flex items-center gap-2 ${credits === 0 ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-slate-900 border-amber-500/50 text-amber-500'}`}>
                <span>Kalan Kredi: {credits}</span>
                <span>🪙</span>
              </div>
            )}
          </div>
        </div>

        {/* FORM ALANI */}
        <form action={handleClientSubmit} className="bg-slate-900 p-6 md:p-8 rounded-2xl shadow-xl border border-slate-800">
          
          {/* YENİ LOGO VE SARI BAŞLIK ALANI */}
          <div className="flex items-center gap-3 mb-6">
            <Scale className="text-amber-500" size={32} />
            <h1 className="text-3xl font-bold text-amber-500">Jurisdiction Lab</h1>
            <span className="px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold border border-blue-600/30 ml-auto">
              Hibrit Sistem
            </span>
          </div>

          <div className="mb-6">
            <label className="block text-slate-300 text-sm font-bold mb-2">Başlık</label>
            <input
              type="text"
              name="title" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-amber-500 outline-none transition-all"
              placeholder="Örn: Roma Hukukunda Mülkiyet Devri"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="mb-8">
            <label className="block text-slate-300 text-sm font-bold mb-2">Detaylı Açıklama</label>
            <textarea
              name="content" 
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-amber-500 outline-none transition-all resize-none"
              placeholder="Sorunuzun detaylarını buraya yazın..."
              required
              disabled={isSubmitting}
            ></textarea>
          </div>

          {/* İKİ AYRI BUTON ALANI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. TOPLULUK BUTONU */}
            <button
              type="submit"
              name="target"
              value="community"
              disabled={isSubmitting || (credits !== null && credits < 1)}
              className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-orange-500/50 transition-all group disabled:opacity-50"
            >
              <Users className="text-slate-400 group-hover:text-orange-500 mb-2" size={24} />
              <span className="font-bold text-white">Topluluğa Sor</span>
              <span className="text-orange-500 text-sm">1 Kredi</span>
              <p className="text-[10px] text-slate-500 mt-2 text-center">Sadece kullanıcılar yanıtlayabilir</p>
            </button>

            {/* 2. BABYLEXIT AI BUTONU */}
            <button
              type="submit"
              name="target"
              value="ai"
              disabled={isSubmitting || (credits !== null && credits < 3)}
              className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-blue-600 bg-blue-600/10 hover:bg-blue-600 hover:text-white transition-all group shadow-lg shadow-blue-900/20 disabled:opacity-50"
            >
              <Sparkles className="text-blue-400 group-hover:text-white mb-2" size={24} />
              <span className="font-bold text-white group-hover:text-white">BabylexitAI'a Sor</span>
              <span className="text-blue-400 group-hover:text-white text-sm">3 Kredi</span>
              <p className="text-[10px] text-blue-300/60 group-hover:text-white/80 mt-2 text-center">AI Analizi + Topluluk Görüşü</p>
            </button>
          </div>

          {isSubmitting && (
            <div className="mt-6 flex items-center justify-center gap-3 text-amber-500">
              <Loader2 className="animate-spin" />
              <span className="text-sm font-medium animate-pulse">İşleminiz gerçekleştiriliyor...</span>
            </div>
          )}

        </form>
      </div>

      <style jsx>{`
        @keyframes float-up {
          0% { transform: translateY(20px); opacity: 0; scale: 0.8; }
          20% { transform: translateY(0); opacity: 1; scale: 1.2; }
          80% { transform: translateY(-40px); opacity: 1; scale: 1; }
          100% { transform: translateY(-100px); opacity: 0; scale: 0.5; }
        }
        .animate-float-up {
          animation: float-up 2s forwards cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}