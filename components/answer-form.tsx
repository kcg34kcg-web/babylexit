'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, Send, ShieldCheck, AlertTriangle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { checkContentSafety } from '@/app/actions/ai-engine'; // Server action'ı çağırıyoruz

const MAX_CHARS = 1000;

export default function AnswerForm({ questionId }: { questionId: string }) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moderationStatus, setModerationStatus] = useState<'idle' | 'checking' | 'safe' | 'unsafe'>('idle');
  
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    if (content.length > MAX_CHARS) {
      toast.error(`Maksimum ${MAX_CHARS} karakter sınırını aştınız.`);
      return;
    }

    setIsSubmitting(true);
    setModerationStatus('checking');

    try {
      // 1. ADIM: YAPAY ZEKA DENETİMİ
      // İçeriği sunucuya gönderip analiz ettiriyoruz
      const safetyCheck = await checkContentSafety(content);

      if (!safetyCheck.isSafe) {
        setModerationStatus('unsafe');
        setIsSubmitting(false);
        toast.error(safetyCheck.reason || 'Mesajınız topluluk kurallarına uymadığı için engellendi.', {
          icon: '🚫',
          duration: 5000,
          style: {
            border: '1px solid #EF4444',
            padding: '16px',
            color: '#EF4444',
            fontWeight: 'bold'
          },
        });
        return; // İşlem durdurulur
      }

      setModerationStatus('safe');

      // 2. ADIM: VERİTABANINA KAYIT
      // Sadece güvenli ise buraya geçer
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Giriş yapmalısınız.');
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from('answers').insert({
        content,
        question_id: questionId,
        user_id: user.id,
      });

      if (error) {
        throw error;
      }

      toast.success('Görüşünüz yayınlandı! ⚖️');
      setContent('');
      setModerationStatus('idle');
      router.refresh();

    } catch (error) {
      console.error(error);
      toast.error('Bir hata oluştu.');
      setModerationStatus('idle');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl shadow-indigo-900/5 border border-indigo-50 mt-8 relative overflow-hidden group">
      
      {/* Dekoratif Arka Plan */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
      
      <div className="relative z-10">
        <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
          <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
             <FileText size={20} />
          </div>
          Hukuki Görüş Bildir
        </h3>
        <p className="text-slate-500 text-sm mb-6 ml-1">
          Konu hakkındaki hukuki değerlendirmenizi, mevzuat ve içtihatlara dayalı olarak paylaşın.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={MAX_CHARS}
              className={`w-full bg-slate-50 border rounded-2xl p-5 text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none transition-all min-h-[140px] resize-y font-medium text-base shadow-inner ${
                moderationStatus === 'unsafe' 
                  ? 'border-red-400 focus:ring-4 focus:ring-red-500/10' 
                  : 'border-slate-200 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400'
              }`}
              placeholder="Görüşünüzü buraya yazın..."
              disabled={isSubmitting}
            />
            
            {/* Karakter Sayacı */}
            <div className={`absolute bottom-3 right-4 text-xs font-bold px-2 py-1 rounded bg-white/80 backdrop-blur-sm shadow-sm border transition-colors ${
              content.length > MAX_CHARS * 0.9 
                ? 'text-red-500 border-red-200' 
                : 'text-slate-400 border-slate-100'
            }`}>
              {content.length} / {MAX_CHARS}
            </div>
          </div>

          {/* Uyarı / Durum Alanı */}
          <div className="flex items-start gap-2 mt-3 text-[11px] text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100">
             {moderationStatus === 'unsafe' ? (
                <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
             ) : (
                <ShieldCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />
             )}
             <p className={moderationStatus === 'unsafe' ? 'text-red-500 font-bold' : ''}>
               {moderationStatus === 'unsafe' 
                 ? "İçerik güvenlik politikasını ihlal ediyor. Lütfen düzenleyin."
                 : moderationStatus === 'checking'
                 ? "AI içeriğinizi denetliyor..."
                 : "İçeriğiniz yapay zeka tarafından denetlenerek yayınlanacaktır."
               }
             </p>
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="bg-slate-900 hover:bg-orange-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-orange-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-900 active:scale-95 group"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> 
                  {moderationStatus === 'checking' ? 'Denetleniyor...' : 'Yayınlanıyor'}
                </>
              ) : (
                <>
                  Görüşü Yayınla <Send size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}