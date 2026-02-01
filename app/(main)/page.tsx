'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import moment from 'moment';
import 'moment/locale/tr';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  MessageSquare, 
  Plus, 
  ShoppingCart, 
  User, 
  Calendar, 
  Loader2, 
  Heart, 
  Search,
  PenTool,
  BookOpen, 
  PlayCircle,
  ArrowRight
} from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  reputation: number;
  credits: number;
}

interface Question {
  id: string;
  title: string;
  content: string;
  user_id: string;
  status: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [favorites, setFavorites] = useState<string[]>([]);

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
      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, reputation, credits')
        .eq('id', user.id)
        .single();
      if (profileData) setProfile(profileData);

      const { data: questionsData } = await supabase
        .from('questions')
        .select(`
          id, title, content, user_id, status, created_at,
          profiles (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (questionsData) setQuestions(questionsData as any);      
      setLoading(false);
    };

    fetchData();
    moment.locale('tr');
  }, [supabase, router]);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); 
    if (favorites.includes(id)) {
      setFavorites(favorites.filter(favId => favId !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

  const filteredQuestions = questions.filter((q) => 
    q.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    q.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto pb-24 bg-slate-50 min-h-screen">
      
      {/* Özel Animasyon Stilleri - Düzeltilmiş Versiyon */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes border-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-border-flow {
          background-size: 200% 200%;
          animation: border-flow 3s ease infinite;
        }
      `}} />

      {/* 1. KARŞILAMA ve İSTATİSTİKLER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Merhaba, {profile?.full_name || user?.email?.split('@')[0]} 👋
          </h1>
          <p className="text-slate-600 font-medium mt-1">Bugün hukuki araştırmalarında neye ihtiyacın var?</p>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          <div className="bg-white border border-slate-200 px-6 py-3 rounded-2xl min-w-[140px] shadow-sm">
            <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Reputasyon</span>
            <div className="text-2xl font-bold text-amber-600 flex items-center gap-2">
              <TrendingUp size={20} /> {profile?.reputation || 0}
            </div>
          </div>
          <div className="bg-white border border-slate-200 px-6 py-3 rounded-2xl min-w-[140px] shadow-sm">
            <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Kredi</span>
            <div className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-600"></div> {profile?.credits || 0}
            </div>
          </div>
        </div>
      </div>

      {/* 2. HIZLI AKSİYONLAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <Link 
          href="/ask" 
          className="bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 p-6 rounded-3xl flex items-center justify-between group transition-all shadow-lg shadow-amber-500/20"
        >
          <div>
            <h3 className="text-white font-bold text-xl mb-1">Soru Sor</h3>
            <p className="text-amber-50 text-sm font-medium opacity-90">Yapay zeka ve topluluktan görüş al.</p>
          </div>
          <div className="bg-white p-3.5 rounded-2xl group-hover:scale-110 transition-transform shadow-md">
            <Plus size={28} className="text-slate-900" /> 
          </div>
        </Link>

        <Link 
          href="/market" 
          className="bg-white border border-slate-200 hover:border-slate-300 p-6 rounded-3xl flex items-center justify-between group transition-all shadow-sm"
        >
          <div>
            <h3 className="text-slate-900 font-bold text-xl mb-1">Market</h3>
            <p className="text-slate-600 text-sm font-medium">Kredi satın al ve özelliklerin kilidini aç.</p>
          </div>
          <div className="bg-slate-100 p-3.5 rounded-2xl text-slate-600 group-hover:text-slate-900 transition-colors">
            <ShoppingCart size={28} />
          </div>
        </Link>
      </div>

      {/* 3. YAYINLAR BANNER (ARKAPLAN DÜZELTİLDİ: AÇIK LACİVERT GRADYAN) */}
      <Link href="/publications" className="block mt-6 group">
        <div className="relative p-[3px] rounded-3xl overflow-hidden shadow-2xl shadow-indigo-900/10 hover:shadow-amber-500/20 transition-shadow duration-300">
          
          {/* Neon Arkaplan Animasyonu */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-300 via-indigo-300 to-amber-400 animate-border-flow"></div>
          
          {/* İçerik Kartı: ARTIK DAHA YUMUŞAK, AÇIK LACİVERT */}
          <div className="relative bg-gradient-to-br from-indigo-900 to-blue-900 rounded-[21px] p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between overflow-hidden">
            
            {/* Hafif Desen */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fb923c 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            <div className="z-10 flex flex-col gap-4 max-w-2xl">
              
              {/* ETİKETLER */}
              <div className="flex gap-2">
                  <span className="bg-amber-500 text-slate-900 text-xs px-3 py-1 rounded-lg flex items-center gap-1.5 font-extrabold shadow-lg uppercase tracking-wide">
                    <BookOpen size={14} /> Makale
                  </span>
                  <span className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg flex items-center gap-1.5 font-extrabold shadow-lg uppercase tracking-wide border border-white/10">
                    <PlayCircle size={14} /> Video
                  </span>
              </div>

              {/* ANA METİN */}
              <div>
                <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-2 drop-shadow-md">
                  Bilgi birikimini artır.
                </h2>
                <p className="text-indigo-100 text-sm sm:text-base font-medium leading-relaxed opacity-95">
                  Bilimsel makaleler, içtihat analizleri ve eğitici hukuk videoları ile uzmanlaş.
                </p>
              </div>
              
              {/* BUTTON */}
              <div className="mt-1 inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl hover:scale-105 transition-transform w-fit cursor-pointer">
                Hemen İncele <ArrowRight size={18} />
              </div>
            </div>

            {/* Dekoratif İkon */}
            <div className="hidden md:flex items-center justify-center w-28 h-28 bg-white/10 rounded-full shadow-2xl backdrop-blur-sm border border-white/10 group-hover:rotate-12 transition-transform duration-500">
              <BookOpen className="text-amber-400 drop-shadow-[0_0_15px_rgba(253,224,71,0.3)]" size={48} />
            </div>
          </div>
        </div>
      </Link>

      {/* 4. GÜNDEM AKIŞI ALANI */}
      <div className="mt-10">
        
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-6 gap-4">
          <div className="w-full md:w-auto self-start md:self-auto">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="text-amber-600 fill-amber-600" />
              Gündemdeki Tartışmalar
            </h2>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:w-72">
                <input 
                  type="text" 
                  placeholder="Ara..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-full py-2.5 pl-10 pr-4 text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none text-sm placeholder:text-slate-500 transition-all shadow-sm"
                />
                <Search className="absolute left-3.5 top-3 text-slate-500" size={16} />
             </div>
             
             <Link href="/questions" className="text-sm font-bold text-slate-600 hover:text-amber-600 transition-colors whitespace-nowrap hidden md:block">
               Tümünü Gör →
             </Link>
          </div>
        </div>

        {/* FEED LİSTESİ */}
        <div className="space-y-4">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((q) => (
              <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-amber-400 transition-all group relative shadow-sm hover:shadow-md">
                
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-1 pr-4">
                    <Link href={`/questions/${q.id}`}>
                      {q.title}
                    </Link>
                  </h3>
                  <span className="text-xs text-slate-500 whitespace-nowrap flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 font-medium">
                    <Calendar size={12}/> {moment(q.created_at).fromNow()}
                  </span>
                </div>
                
                <p className="text-slate-600 text-sm line-clamp-2 mb-5 leading-relaxed font-medium">
                  {q.content}
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-slate-100 pt-4 mt-2 gap-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                    <div className="bg-slate-100 p-1.5 rounded-full text-slate-700"><User size={14} /></div>
                    <span>{q.profiles?.full_name || 'Gizli Üye'}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    
                    {/* FAVORİ BUTONU: Belirgin Hale Getirildi (Dolu İkon + Glow) */}
                    <button 
                      onClick={(e) => toggleFavorite(e, q.id)}
                      className={`p-2.5 rounded-full transition-all duration-200 active:scale-95 border shadow-sm ${
                        favorites.includes(q.id) 
                          ? 'bg-amber-500 border-amber-600 text-white shadow-md shadow-amber-200 ring-2 ring-amber-100' 
                          : 'bg-white border-slate-200 text-slate-400 hover:border-amber-300 hover:text-amber-500'
                      }`}
                      title="Favorile"
                    >
                      <Heart 
                        size={20} 
                        className={favorites.includes(q.id) ? 'fill-white' : ''}
                      />
                    </button>

                    <Link 
                      href={`/questions/${q.id}`}
                      className="text-sm font-bold text-slate-700 hover:text-amber-600 flex items-center gap-2 bg-slate-50 border border-slate-200 px-5 py-2.5 rounded-full hover:bg-orange-50 hover:border-orange-200 transition-all shadow-sm active:scale-95"
                    >
                      <PenTool size={16} /> İncele / Görüş Bildir
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
              <MessageSquare size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600 font-bold">Henüz bir tartışma başlatılmamış.</p>
              <p className="text-slate-500 text-sm mt-1">İlk soruyu sen sorabilirsin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}