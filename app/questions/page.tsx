'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import moment from 'moment';
import 'moment/locale/tr';
import { 
  Loader2, 
  MessageSquare, 
  User, 
  Calendar, 
  ArrowRight,
  Search,
  ArrowLeft // <-- YENİ: İkon eklendi
} from 'lucide-react';

interface Question {
  id: string;
  title: string;
  content: string;
  created_at: string;
  status: string;
  profiles: {
    full_name: string;
  };
  answers?: { count: number }[]; 
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const supabase = createClient();

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('questions')
        .select(`
          *,
          profiles (full_name),
          answers (count)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Hata:', error);
      } else {
        setQuestions(data as any);
      }
      setLoading(false);
    };

    fetchQuestions();
    moment.locale('tr');
  }, []);

  // Arama Filtresi
  const filteredQuestions = questions.filter(q => 
    q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-amber-500 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8 text-slate-200">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* --- 1. GERİ DÖN BUTONU (YENİ EKLENDİ) --- */}
        <Link 
          href="/" 
          className="inline-flex items-center text-slate-400 hover:text-amber-500 mb-2 transition-all group"
        >
          <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" /> 
          Ana Menüye Dön
        </Link>

        {/* --- 2. BAŞLIK VE ARAMA ALANI --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Topluluk Soruları</h1>
            <p className="text-slate-400">Diğer kullanıcıların sorularını inceleyin ve bilginizi paylaşın.</p>
          </div>
          
          {/* Arama */}
          <div className="relative w-full md:w-80">
             <input 
               type="text" 
               placeholder="Soru ara..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-slate-900 border border-slate-700 rounded-full py-2.5 pl-10 pr-4 text-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
             />
             <Search className="absolute left-3.5 top-3 text-slate-500" size={18} />
          </div>
        </div>

        {/* --- 3. SORU LİSTESİ --- */}
        <div className="grid gap-4">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((q) => (
              <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-amber-500/30 transition-all group shadow-md flex flex-col md:flex-row gap-4">
                
                {/* Sol Taraf: İçerik */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${q.status === 'open' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-slate-700 text-slate-400 border-slate-600'}`}>
                      {q.status === 'open' ? 'Görüşe Açık' : 'Çözüldü'}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar size={12} /> {moment(q.created_at).fromNow()}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-amber-500 transition-colors mb-2">
                    <Link href={`/questions/${q.id}`}>
                      {q.title}
                    </Link>
                  </h3>
                  
                  <p className="text-slate-400 text-sm line-clamp-2 mb-4">
                    {q.content}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <User size={14} />
                      {q.profiles?.full_name || 'Gizli Üye'}
                    </div>
                  </div>
                </div>

                {/* Sağ Taraf: Aksiyon */}
                <div className="flex flex-row md:flex-col items-center justify-between md:justify-center gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 min-w-[140px]">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-1">
                      {/* Supabase count trick: answers bir dizi ise length, değilse 0 */}
                      {Array.isArray(q.answers) ? q.answers.length : 0}
                    </div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Cevap</div>
                  </div>

                  <Link 
                    href={`/questions/${q.id}`}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm w-full md:w-auto justify-center"
                  >
                    Cevapla <ArrowRight size={16} />
                  </Link>
                </div>

              </div>
            ))
          ) : (
             <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
                <MessageSquare size={48} className="mx-auto text-slate-700 mb-4" />
                <p className="text-slate-500 text-lg">Aradığınız kriterde soru bulunamadı.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}