'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import moment from 'moment';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; 
import { Search, PenTool, Loader2, ArrowLeft } from 'lucide-react';
import 'moment/locale/tr';

moment.locale('tr');

interface Question {
  id: string;
  title: string;
  content: string;
  user_id: string;
  status: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select(`
            id, title, content, user_id, status, created_at,
            profiles (full_name, avatar_url)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching questions:', error);
        } else {
          setQuestions(data as any);
        }
      } catch (err) {
        console.error('Beklenmedik hata:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const filteredQuestions = questions.filter((q) => 
    q.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    q.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-full p-4 flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      
      {/* --- GERİ DÖN BUTONU --- */}
      <div>
        <button 
            onClick={() => router.back()} 
            className="inline-flex items-center text-slate-400 hover:text-amber-500 transition-colors font-medium group"
        >
            <ArrowLeft className="mr-2 group-hover:-translate-x-1 transition-transform" size={20} />
            Geri Dön
        </button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            {/* YAZIM HATASI DÜZELDİ: "Sorular" */}
            <h1 className="text-3xl font-bold text-slate-200">Hukuki Sorular ve Tartışmalar</h1>
            <p className="text-slate-400 mt-1">Geçmiş vakaları inceleyin veya yeni bir tartışma başlatın.</p>
        </div>

        {/* Arama Çubuğu */}
        <div className="relative w-full md:w-80">
            <input
            type="text"
            placeholder="Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            />
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>
      </div>

      {/* Liste */}
      {filteredQuestions && filteredQuestions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredQuestions.map((question) => (
            <div key={question.id} className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 hover:border-amber-500/30 transition-all duration-300 flex flex-col group h-full">
              
              <div className="flex justify-between items-start mb-4">
                 <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-amber-500 font-bold border border-slate-700">
                        {(question.profiles?.full_name || 'U')[0]}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-300 font-bold">{question.profiles?.full_name || 'Anonim'}</span>
                        <span className="text-[10px] text-slate-500">{moment(question.created_at).fromNow()}</span>
                    </div>
                 </div>
                 <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  question.status === 'open' 
                    ? 'bg-green-500/10 text-green-500' 
                    : 'bg-blue-500/10 text-blue-500'
                }`}>
                  {question.status === 'open' ? 'Açık' : 'Çözüldü'}
                </span>
              </div>

              <h2 className="text-lg font-bold text-slate-100 mb-2 line-clamp-2 group-hover:text-amber-500 transition-colors">
                {question.title}
              </h2>
              <p className="text-slate-400 text-sm mb-6 flex-grow line-clamp-3">
                {question.content}
              </p>

              <Link 
                href={`/questions/${question.id}`}
                className="mt-auto w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold py-3 rounded-lg text-center transition-all flex items-center justify-center gap-2"
              >
                <PenTool size={16} /> 
                İncele ve Cevapla
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
          <p className="text-slate-400 mb-4">Soru bulunamadı.</p>
          <Link href="/ask" className="inline-flex items-center bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-6 rounded-lg transition-all">
            <PenTool size={18} className="mr-2" /> İlk Soruyu Sor
          </Link>
        </div>
      )}
    </div>
  );
}