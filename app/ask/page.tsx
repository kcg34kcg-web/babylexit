'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, ArrowLeft, AlertCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { submitQuestion } from '@/app/actions/submit-question';

export default function AskPage() {
  // UI State
  const [credits, setCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
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

  // --- 2. GÜNCELLENEN GÖNDERİM FONKSİYONU (Client-Side Logic) ---
  const handleClientSubmit = async (formData: FormData) => {
    // A. Client-Side Validasyon
    if (credits !== null && credits <= 0) {
      toast.error('Yeterli krediniz yok. Lütfen kredi yükleyin.');
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast.error('Lütfen tüm alanları doldurun.');
      return;
    }

    setIsSubmitting(true);

    try {
      // B. Server Action Çağrısı
      // Server Action artık { success: true, questionId: "..." } veya { error: "..." } dönecek.
      const result = await submitQuestion(formData);

      if (result?.error) {
        toast.error(`Hata: ${result.error}`);
        setIsSubmitting(false); // Hata varsa butonu tekrar aktif et
      } else if (result?.success && result?.questionId) {
        // C. Başarılıysa Manuel Yönlendirme
        toast.success('Analiz tamamlandı! Yönlendiriliyorsunuz...');
        
        // Router.push kullanarak "Redirect Error" hatasını önlüyoruz
        router.push(`/questions/${result.questionId}`); 
      }
    } catch (error) {
      console.error(error);
      toast.error('Beklenmedik bir hata oluştu.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        
        {/* ÜST MENÜ & GERİ DÖN BUTONU */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
          <Link 
            href="/" 
            className="inline-flex items-center text-slate-400 hover:text-amber-500 transition-colors font-medium group"
          >
            <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={20} />
            Ana Menüye Dön
          </Link>

          {/* Kredi Göstergesi */}
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

        {/* --- FORM ALANI --- */}
        <form action={handleClientSubmit} className="bg-slate-900 p-6 md:p-8 rounded-2xl shadow-xl border border-slate-800">
          <div className="flex items-center gap-3 mb-6">
             <h1 className="text-2xl font-bold text-white">Yapay Zeka Hukuk Görüşü</h1>
             <span className="px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold border border-blue-600/30 animate-pulse">
                AI-First
             </span>
          </div>

          {/* KREDİ UYARISI */}
          {credits === 0 && !isLoading && (
             <div className="mb-6 bg-red-900/20 border border-red-500/30 p-4 rounded-lg flex items-center gap-3 text-red-400">
                <AlertCircle size={24} />
                <p>Yeterli krediniz yok. Lütfen Market'ten kredi alın.</p>
             </div>
          )}

          <div className="mb-6">
            <label htmlFor="title" className="block text-slate-300 text-sm font-bold mb-2">Başlık</label>
            <input
              type="text"
              id="title"
              name="title" // FormData için gerekli
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all placeholder:text-slate-600"
              placeholder="Örn: Roma Hukukunda Mülkiyet Devri"
              required
              disabled={isSubmitting || credits === 0}
            />
          </div>

          <div className="mb-8">
            <label htmlFor="content" className="block text-slate-300 text-sm font-bold mb-2">Detaylı Açıklama</label>
            <textarea
              id="content"
              name="content" // FormData için gerekli
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all placeholder:text-slate-600 resize-none"
              placeholder="Sorunuzun detaylarını, ilgili kanun maddelerini veya olay örgüsünü buraya yazın..."
              required
              disabled={isSubmitting || credits === 0}
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-4 rounded-lg text-lg transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-amber-500/20"
            disabled={isSubmitting || credits === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 animate-spin" size={24} />
                <span className="animate-pulse">AI Analizi Başlatılıyor...</span>
              </>
            ) : (
              <div className="flex items-center gap-2">
                 <Sparkles size={20} />
                 <span>AI Uzmanına Sor (-1 Kredi)</span>
              </div>
            )}
          </button>
          
          <p className="text-xs text-slate-500 text-center mt-4">
            Sorunuz gönderildiğinde <strong>Babylexit AI</strong> saniyeler içinde analiz edip yanıtlayacaktır.
          </p>

          {credits === 0 && (
             <div className="mt-4 text-center">
                <Link href="/market" className="text-amber-500 hover:underline font-medium">
                   Market'e Git ve Kredi Al →
                </Link>
             </div>
          )}
        </form>
      </div>
    </div>
  );
}