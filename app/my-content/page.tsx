'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import moment from 'moment';
import 'moment/locale/tr';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  MessageSquare, 
  Star, 
  Loader2, 
  Calendar,
  ChevronRight
} from 'lucide-react';

export default function MyContentPage() {
  const [activeTab, setActiveTab] = useState<'questions' | 'answers' | 'starred'>('questions');
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);

      // 1. Kullanıcının Sorularını Çek
      const { data: userQuestions } = await supabase
        .from('questions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (userQuestions) setQuestions(userQuestions);

      // 2. Kullanıcının Cevaplarını Çek (Tahmini Tablo Adı: answers veya replies)
      // Eğer tablo adın farklıysa burayı düzeltmelisin (örn: 'comments')
      const { data: userAnswers } = await supabase
        .from('answers') 
        .select('*, question:questions(title)') // İlişkili sorunun başlığını da al
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (userAnswers) setAnswers(userAnswers);

      setLoading(false);
    };

    fetchData();
    moment.locale('tr');
  }, [supabase, router]);

  // Yıldızlı içerikleri filtrele (Şimdilik veritabanında 'is_starred' kolonu olmadığı için simüle ediyoruz)
  // Gerçek entegrasyonda buraya veritabanından çekilen 'favorites' tablosu bağlanmalı.
  const starredItems = [...questions, ...answers].filter(item => item.is_starred); 

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-amber-500 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto min-h-screen">
      
      {/* BAŞLIK */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="text-indigo-500" />
          İçerik Yönetimi
        </h1>
        <p className="text-slate-400 text-sm mt-1">Sorduğun soruları ve verdiğin cevapları buradan takip et.</p>
      </div>

      {/* SEKMELER (TABS) */}
      <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('questions')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'questions' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Sorduğum Sorular ({questions.length})
        </button>
        <button
          onClick={() => setActiveTab('answers')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'answers' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Verdiğim Cevaplar ({answers.length})
        </button>
        <button
          onClick={() => setActiveTab('starred')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'starred' ? 'bg-slate-800 text-amber-400 shadow' : 'text-slate-400 hover:text-amber-400'
          }`}
        >
          <Star size={16} className={activeTab === 'starred' ? 'fill-amber-400' : ''} />
          Altın Arşiv
        </button>
      </div>

      {/* İÇERİK LİSTESİ */}
      <div className="space-y-4">
        
        {/* SEKME 1: SORULAR */}
        {activeTab === 'questions' && (
          questions.length > 0 ? (
            questions.map((q) => (
              <Link key={q.id} href={`/questions/${q.id}`} className="block group">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/50 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold px-2 py-1 rounded border border-indigo-500/20">SORU</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar size={12}/> {moment(q.created_at).format('DD MMM YYYY')}
                    </span>
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2 group-hover:text-indigo-400 transition-colors line-clamp-1">
                    {q.title}
                  </h3>
                  <p className="text-slate-400 text-sm line-clamp-2">{q.content}</p>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500">Henüz soru sormadınız.</div>
          )
        )}

        {/* SEKME 2: CEVAPLAR */}
        {activeTab === 'answers' && (
          answers.length > 0 ? (
            answers.map((ans) => (
              <Link key={ans.id} href={`/questions/${ans.question_id}`} className="block group">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-emerald-500/50 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded border border-emerald-500/20">CEVAP</span>
                    <span className="text-xs text-slate-500">{moment(ans.created_at).fromNow()}</span>
                  </div>
                  <p className="text-slate-300 text-sm mb-3 line-clamp-3">"{ans.content}"</p>
                  
                  <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800 flex items-center gap-2">
                    <MessageSquare size={14} className="text-slate-500"/>
                    <span className="text-xs text-slate-500 truncate">
                      İlgili Soru: <span className="text-slate-300">{ans.question?.title || 'Bilinmeyen Soru'}</span>
                    </span>
                    <ChevronRight size={14} className="text-slate-600 ml-auto"/>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500">Henüz cevap yazmadınız.</div>
          )
        )}

        {/* SEKME 3: ALTIN (YILDIZLI) */}
        {activeTab === 'starred' && (
          <div className="text-center py-12 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
            <Star size={40} className="mx-auto text-slate-700 mb-3" />
            <p className="text-slate-400">Henüz altın soru veya cevabınız yok.</p>
            <p className="text-xs text-slate-600 mt-2">Kendi içeriklerinizi favorileyerek buraya ekleyebilirsiniz.</p>
          </div>
        )}

      </div>
    </div>
  );
}