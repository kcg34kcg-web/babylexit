'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
// import toast from 'react-hot-toast'; // Yerine sonner kullanıyoruz
import { toast } from 'sonner';
import { 
  Loader2, 
  ArrowLeft, 
  Sparkles, 
  Users, 
  Scale, 
  FileText,
  AlertCircle,
  ShieldCheck,
  Search
} from 'lucide-react'; 
import Link from 'next/link';
import { submitQuestion } from '@/app/actions/submit-question';
import { suggestSimilarQuestions } from '@/app/actions/search';

export default function AskPage() {
  // UI State
  const [credits, setCredits] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEffect, setShowEffect] = useState<'ai' | 'community' | null>(null);
  
  const [targetType, setTargetType] = useState<'ai' | 'community' | null>(null);

  // Arama ve Limit State'leri
  const [similarQuestions, setSimilarQuestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Limit Tanımları
  const LIMITS = {
    title: 100,
    content: 1000
  };

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

  // --- 1.1 AKILLI ARAMA ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (title.length > 2) { 
        setIsSearching(true);
        try {
          // Bu fonksiyon yoksa search.ts içinde oluşturmalısın veya bu bloğu kapatabilirsin
          const results = await suggestSimilarQuestions(title);
          setSimilarQuestions(results || []);
        } catch (err) {
          console.error("Arama hatası", err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSimilarQuestions([]);
      }
    }, 800); 

    return () => clearTimeout(delayDebounceFn);
  }, [title]);

  // --- 2. GÖNDERİM FONKSİYONU (YENİLENMİŞ) ---
  const handleClientSubmit = async (formData: FormData) => {
    let targetVal = formData.get('target') as string;
    const activeTarget = targetType || (targetVal as 'ai' | 'community');
    
    // Form verisini hazırla ve eksikse state'ten tamamla
    if (!targetType) setTargetType(activeTarget);
    if (!formData.get('target')) formData.append('target', activeTarget);

    const cost = activeTarget === 'ai' ? 3 : 1;

    // Client tarafı kredi kontrolü
    if (credits !== null && credits < cost) {
      toast.error(`Yetersiz kredi. ${cost} kredi gerekiyor.`);
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast.error('Lütfen tüm alanları doldurun.');
      return;
    }

    setIsSubmitting(true);
    setShowEffect(activeTarget === 'ai' ? 'ai' : 'community');

    try {
      // 1. ADIM: Soruyu Veritabanına Kaydet
      // submitQuestion bize 'jobId' döndürecek (Eğer AI seçildiyse)
      const result = await submitQuestion(formData);

      if (result?.error) {
         toast.error(result.error);
         setIsSubmitting(false);
         setShowEffect(null);
         return;
      } 
      
      if (result?.success && result?.questionId) {
          
          if (activeTarget === 'ai') {
            // --- AI STRATEJİSİ: LOUNGE'A YÖNLENDİRME ---
            // jobId varsa kullanıcıyı Lounge'a gönderiyoruz.
            // Lounge sayfası, jobId'yi görünce API'yi tetikleyip analizi başlatacak.
            
            if (result.jobId) {
              router.push(`/lounge?jobId=${result.jobId}&questionId=${result.questionId}`);
            } else {
              // Fallback: Job oluşmadıysa eski usul gitsin (Soru detayına veya Lounge'a)
              // router.push(`/lounge?questionId=${result.questionId}`); // veya
              toast.success('Analiz sıraya alındı.');
              router.push(`/questions/${result.questionId}`);
            }
            
          } else {
            // --- TOPLULUK STRATEJİSİ ---
            toast.success('Soru topluluğa iletildi!');
            router.push(`/questions/${result.questionId}`); 
          }
      }

    } catch (error) {
      console.error(error);
      toast.error('Beklenmedik bir hata oluştu.');
      setIsSubmitting(false);
      setShowEffect(null);
    }
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 relative overflow-hidden">
      
      {/* KREDİ EFEKTİ */}
      {showEffect && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="animate-float-up text-6xl font-black text-orange-500 drop-shadow-xl bg-white/90 backdrop-blur-sm px-8 py-4 rounded-3xl border border-orange-100">
            -{showEffect === 'ai' ? '3' : '1'} Kredi
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-slate-500 hover:text-orange-600 transition-colors font-bold bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 group"
          >
            <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={18} />
            Panele Dön
          </Link>

          <div className="self-end md:self-auto">
             {isLoading ? (
              <div className="bg-white border border-slate-200 px-4 py-2 rounded-full text-slate-400 text-sm animate-pulse shadow-sm">
                Yükleniyor...
              </div>
            ) : (
              <div className={`px-5 py-2 rounded-full font-bold border flex items-center gap-2 shadow-sm ${credits === 0 ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-orange-100 text-orange-600'}`}>
                <span>Kalan Kredi: {credits}</span>
                <span className="text-xl">🪙</span>
              </div>
            )}
          </div>
        </div>

        <form action={handleClientSubmit} className="bg-white p-6 md:p-10 rounded-[2rem] shadow-xl shadow-indigo-900/5 border border-indigo-50 relative overflow-hidden group">
          
          <div className="absolute top-0 right-0 w-40 h-40 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 -z-10"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 -z-10"></div>

          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
            <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
               <Scale size={32} />
            </div>
            <div>
               <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Yeni Tartışma</h1>
               <span className="text-slate-500 text-sm font-medium">Hukuki sorununa çözüm ara</span>
            </div>
          </div>

          {/* --- BAŞLIK ALANI --- */}
          <div className="mb-6 relative">
            <label className="block text-slate-700 text-sm font-bold mb-2 flex justify-between">
              <span className="flex items-center gap-2">Soru Başlığı <span className="text-red-400">*</span></span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${title.length >= LIMITS.title ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-500'}`}>
                {title.length}/{LIMITS.title}
              </span>
            </label>
            <input
              type="text"
              name="title" 
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, LIMITS.title))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-5 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 outline-none transition-all font-bold text-lg shadow-sm"
              placeholder="Örn: Ev sahibi kirayı %100 artırabilir mi?"
              required
              disabled={isSubmitting}
              autoComplete="off"
            />
            
            {/* BENZER SORULAR PANELİ */}
            {(isSearching || similarQuestions.length > 0) && (
               <div className="mt-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xl animate-in fade-in slide-in-from-top-2 relative z-20">
                 {isSearching ? (
                   <div className="flex items-center gap-2 text-sm text-indigo-500 font-bold">
                     <Loader2 className="animate-spin w-4 h-4" />
                     <span>Benzer konular taranıyor...</span>
                   </div>
                 ) : (
                   <div className="space-y-1">
                     <div className="flex justify-between items-center mb-2 px-2">
                        <p className="text-xs text-orange-600 font-black uppercase tracking-wider flex items-center gap-1">
                          <Search size={12} /> Bunları mı aramak istediniz?
                        </p>
                        <button 
                           type="button" 
                           onClick={() => setSimilarQuestions([])} 
                           className="text-xs text-slate-400 hover:text-slate-600 underline"
                        >
                          Gizle
                        </button>
                     </div>
                     
                     {similarQuestions.map((q) => (
                       <Link 
                         key={q.id} 
                         href={`/questions/${q.id}`}
                         target="_blank"
                         className="flex items-start gap-3 p-3 hover:bg-indigo-50 rounded-xl group transition-all border border-transparent hover:border-indigo-100"
                       >
                         <div className="bg-slate-100 p-2 rounded-lg text-slate-500 group-hover:bg-white group-hover:text-indigo-500 transition-colors">
                            <FileText size={16} />
                         </div>
                         <div>
                           <div className="text-sm text-slate-800 group-hover:text-indigo-700 font-bold mb-0.5 line-clamp-1">
                             {q.title}
                           </div>
                           <div className="text-xs text-slate-500 group-hover:text-indigo-400 font-medium flex items-center gap-2">
                             <span className="font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                               %{Math.round(q.similarity * 1)}
                             </span>
                             <span className="line-clamp-1 opacity-70">{q.content.substring(0, 40)}...</span>
                           </div>
                         </div>
                       </Link>
                     ))}
                   </div>
                 )}
               </div>
            )}
          </div>

          <div className="mb-8">
            <label className="block text-slate-700 text-sm font-bold mb-2 flex justify-between">
              <span className="flex items-center gap-2">Detaylı Açıklama <span className="text-red-400">*</span></span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${content.length >= LIMITS.content ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-500'}`}>
                {content.length}/{LIMITS.content}
              </span>
            </label>
            <textarea
              name="content" 
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, LIMITS.content))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-5 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 outline-none transition-all resize-y font-medium text-base shadow-sm"
              placeholder="Durumu detaylıca anlatın..."
              required
              disabled={isSubmitting}
            ></textarea>
             {content.length < 20 && content.length > 0 && (
              <p className="text-xs text-red-500 font-bold mt-2 ml-1 flex items-center gap-1">
                <AlertCircle size={12}/> Lütfen en az 20 karakter açıklama giriniz.
              </p>
            )}
            
            <div className="mt-4 bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl flex gap-3">
               <ShieldCheck className="text-indigo-500 shrink-0 mt-0.5" size={18} />
               <p className="text-xs text-indigo-800 leading-relaxed font-medium">
                 Sorunuz <strong>Yapay Zeka Moderatörü</strong> tarafından denetlenecektir.
               </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="submit"
              name="target"
              value="community"
              onClick={() => setTargetType('community')}
              disabled={isSubmitting || (credits !== null && credits < 1)}
              className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-slate-100 bg-white hover:border-orange-200 hover:bg-orange-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              <div className="bg-slate-100 p-3 rounded-full text-slate-500 group-hover:bg-orange-500 group-hover:text-white transition-colors mb-2">
                 <Users size={24} />
              </div>
              <span className="font-bold text-slate-900 group-hover:text-orange-700 text-lg">Topluluğa Sor</span>
              <span className="text-orange-500 text-xs font-black bg-orange-100 px-2 py-0.5 rounded mt-1">1 KREDİ</span>
            </button>

            <button
              type="submit"
              name="target"
              value="ai"
              onClick={() => setTargetType('ai')}
              disabled={isSubmitting || (credits !== null && credits < 3)}
              className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-indigo-100 bg-indigo-50/30 hover:border-indigo-500 hover:bg-indigo-50 transition-all group shadow-sm hover:shadow-indigo-200/50 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
            >
              <div className="bg-indigo-100 p-3 rounded-full text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-2 relative z-10">
                 <Sparkles size={24} />
              </div>
              <span className="font-bold text-slate-900 group-hover:text-indigo-700 text-lg relative z-10">Babylexit AI'ya Sor</span>
              <span className="text-indigo-600 text-xs font-black bg-indigo-100 px-2 py-0.5 rounded mt-1 relative z-10">3 KREDİ</span>
              <div className="absolute inset-0 bg-gradient-to-tr from-white via-transparent to-white opacity-50"></div>
            </button>
          </div>

          {/* LOADING OVERLAY */}
          {isSubmitting && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-[2rem]">
              <Loader2 className="animate-spin text-orange-500 w-12 h-12 mb-4" />
              <span className="text-slate-800 font-bold text-lg animate-pulse">
                 {targetType === 'ai' ? 'Lounge Hazırlanıyor...' : 'Topluluğa Gönderiliyor...'}
              </span>
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