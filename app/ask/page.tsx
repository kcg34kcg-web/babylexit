'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
// ArrowLeft ikonunu ekledik
import { CheckCircle, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link'; // Link doğrusu bu

export default function AskPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [credits, setCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [newQuestionId, setNewQuestionId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!credits || credits <= 0) {
      toast.error('Yeterli krediniz yok. Lütfen kredi yükleyin.');
      return;
    }
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    const { data, error } = await supabase.rpc('ask_question_transaction', {
      p_title: title,
      p_content: content,
    });

    if (error) {
      toast.error(error.message || 'Hata oluştu.');
      console.error('RPC error:', error);
    } else if (data) {
      // Başarılı olduğunda krediyi güncelle ve modalı aç
      setCredits((prev) => (prev !== null ? prev - 1 : 0));
      setNewQuestionId(data.question_id); // Dönen ID'yi yakala
      setIsSuccess(true);
      toast.success('Soru başarıyla iletildi!');
    }
    setIsSubmitting(false);
  };

  // --- BAŞARI EKRANI ---
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl border border-amber-500/20 text-center max-w-md w-full animate-fade-in">
          <div className="flex justify-center mb-6">
             <CheckCircle size={80} className="text-green-500 animate-bounce" />
          </div>
          <h2 className="text-3xl font-bold text-slate-100 mb-3">Soru İletildi!</h2>
          <p className="text-slate-400 mb-8">Hesabınızdan <span className="text-amber-500 font-bold">1 kredi</span> düşüldü.</p>
          
          <div className="flex flex-col space-y-3">
            <Link href="/" className="bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 px-6 rounded-lg transition-colors">
              Anasayfaya Dön
            </Link>
            {newQuestionId && (
              <Link href={`/questions/${newQuestionId}`} className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-6 rounded-lg transition-colors">
                Soruyu Görüntüle
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- FORM EKRANI ---
  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        
        {/* ÜST MENÜ & GERİ DÖN BUTONU */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
          <Link 
            href="/" 
            className="inline-flex items-center text-slate-400 hover:text-amber-500 transition-colors font-medium"
          >
            <ArrowLeft className="mr-2" size={20} />
            Ana Menüye Dön
          </Link>

          {/* Kredi Göstergesi */}
          <div className="self-end md:self-auto">
             {isLoading ? (
              <div className="bg-slate-900 border border-slate-700 px-4 py-2 rounded-full text-slate-400 text-sm animate-pulse">
                Yükleniyor...
              </div>
            ) : (
              <div className={`px-5 py-2 rounded-full font-bold border ${credits === 0 ? 'bg-red-900/20 border-red-500 text-red-500' : 'bg-slate-900 border-amber-500/50 text-amber-500'}`}>
                Kalan Kredi: {credits} 🪙
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900 p-6 md:p-8 rounded-2xl shadow-xl border border-slate-800">
          <h1 className="text-2xl font-bold text-white mb-6">Hukuki Görüş İste</h1>

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
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 px-4 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all placeholder:text-slate-600 resize-none"
              placeholder="Sorunuzun detaylarını buraya yazın..."
              required
              disabled={isSubmitting || credits === 0}
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-4 rounded-lg text-lg transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-amber-500/20"
            disabled={isSubmitting || credits === 0}
          >
            {isSubmitting ? (
              <><Loader2 className="mr-2 animate-spin" size={24} /> İşleniyor...</>
            ) : (
              'Soruyu Gönder (-1 Kredi)'
            )}
          </button>
          
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