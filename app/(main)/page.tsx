'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import moment from 'moment';
import 'moment/locale/tr'; // Türkçe tarih formatı
import { useRouter } from 'next/navigation';
// YENİ: QuickAccessFolders import edildi
import QuickAccessFolders from '@/components/QuickAccessFolders';
import { 
  Search, 
  PenTool, 
  TrendingUp, 
  MessageSquare, 
  Plus, 
  ShoppingCart, 
  User, 
  Calendar,
  Eye,
  Loader2,
  BookOpen,    
  PlayCircle   
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
  const [searchTerm, setSearchTerm] = useState(''); // Arama için State
  
  const supabase = createClient();
  const router = useRouter();

  // Verileri Çek
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // 1. Kullanıcı Kontrolü
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // 2. Profil Bilgileri
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, reputation, credits')
        .eq('id', user.id)
        .single();
      
      if (profileData) setProfile(profileData);

      // 3. Soruları Çek
      const { data: questionsData } = await supabase
        .from('questions')
        .select(`
          id, title, content, user_id, status, created_at,
          profiles (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10); // Son 10 soru

      if (questionsData) setQuestions(questionsData as any);      
      setLoading(false);
    };

    fetchData();
    moment.locale('tr');
  }, [supabase, router]);

  // ARAMA FİLTRESİ (Client-Side)
  const filteredQuestions = questions.filter((q) => 
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
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto pb-24">
      
      {/* KARŞILAMA BÖLÜMÜ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Merhaba, {profile?.full_name || user?.email?.split('@')[0]} 👋
          </h1>
          <p className="text-slate-400">Bugün hukuki araştırmalarında neye ihtiyacın var?</p>
        </div>
        
        {/* İstatistikler */}
        <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          <div className="bg-slate-900 border border-amber-500/30 px-6 py-3 rounded-xl min-w-[140px] shadow-lg">
            <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">Reputasyon</span>
            <div className="text-2xl font-bold text-amber-500 flex items-center gap-2">
              <TrendingUp size={20} /> {profile?.reputation || 0}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-700 px-6 py-3 rounded-xl min-w-[140px] shadow-lg">
            <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">Kredi</span>
            <div className="text-2xl font-bold text-white flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div> {profile?.credits || 0}
            </div>
          </div>
        </div>
      </div>

      {/* --- YENİ EKLENDİ: HIZLI ERİŞİM KLASÖRLERİ --- */}
      <QuickAccessFolders />
      {/* ------------------------------------------- */}

      {/* HIZLI AKSİYONLAR - GÜNCELLENDİ: 3 SÜTUN YAPILDI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. SORU SOR */}
        <Link 
          href="/ask" 
          className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 p-6 rounded-2xl flex items-center justify-between group transition-all shadow-lg shadow-amber-900/20"
        >
          <div>
            <h3 className="text-slate-950 font-bold text-xl mb-1">Soru Sor</h3>
            <p className="text-slate-900/80 text-sm">Yapay zeka ve topluluktan görüş al.</p>
          </div>
          <div className="bg-white/20 p-3 rounded-full group-hover:scale-110 transition-transform text-slate-950">
            <Plus size={28} />
          </div>
        </Link>

        {/* 2. MARKET */}
        <Link 
          href="/market" 
          className="bg-slate-900 border border-slate-800 hover:border-slate-600 p-6 rounded-2xl flex items-center justify-between group transition-all"
        >
          <div>
            <h3 className="text-white font-bold text-xl mb-1">Market</h3>
            <p className="text-slate-400 text-sm">Kredi satın al ve özelliklerin kilidini aç.</p>
          </div>
          <div className="bg-slate-800 p-3 rounded-full text-slate-400 group-hover:text-white transition-colors">
            <ShoppingCart size={28} />
          </div>
        </Link>

        {/* 3. YAYINLAR (YENİ EKLENEN KISIM) */}
        <Link 
          href="/publications" 
          className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-2xl flex items-center justify-between group transition-all relative overflow-hidden"
        >
          <div className="z-10">
            <h3 className="text-white font-bold text-xl mb-1">Yayınlar</h3>
            <div className="flex gap-2 mt-1.5">
              {/* Makale Badge */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-400 font-medium">
                <BookOpen size={10} /> Makale
              </span>
              {/* Video Badge */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
                <PlayCircle size={10} /> Video
              </span>
            </div>
          </div>
          <div className="bg-slate-800 p-3 rounded-full text-slate-400 group-hover:text-indigo-400 transition-colors z-10">
            <BookOpen size={28} />
          </div>
          {/* Hafif arka plan efekti */}
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/5 blur-2xl group-hover:bg-indigo-500/10 transition-all"></div>
        </Link>
      </div>

      {/* GÜNDEM AKIŞI ve ARAMA */}
      <div>
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 self-start md:self-auto">
            <MessageSquare className="text-amber-500" />
            Gündemdeki Tartışmalar
          </h2>

          {/* ARAMA ÇUBUĞU */}
          <div className="relative w-full md:w-80">
            <input 
              type="text" 
              placeholder="Soru veya konu ara..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-full py-2.5 pl-10 pr-4 text-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
            />
            <Search className="absolute left-3.5 top-3 text-slate-500" size={18} />
          </div>
        </div>

        {/* SORU LİSTESİ */}
        <div className="space-y-4">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((q) => (
              <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-amber-500/30 transition-all group shadow-md">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-500 transition-colors line-clamp-1">
                    <Link href={`/questions/${q.id}`}>
                      {q.title}
                    </Link>
                  </h3>
                  <span className="text-xs text-slate-500 whitespace-nowrap ml-4 flex items-center gap-1">
                    <Calendar size={12}/> {moment(q.created_at).fromNow()}
                  </span>
                </div>
                
                <p className="text-slate-400 text-sm line-clamp-2 mb-4">
                  {q.content}
                </p>

                <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <User size={14} />
                    {q.profiles?.full_name || 'Gizli Üye'}
                  </div>
                  
                  <Link 
                    href={`/questions/${q.id}`}
                    className="text-sm font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 bg-slate-800 py-2 px-4 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <Eye size={16} /> İncele / Cevapla
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-slate-900 rounded-xl border border-dashed border-slate-800">
              <p className="text-slate-400">
                {searchTerm ? 'Aradığınız kriterde soru bulunamadı.' : 'Henüz bir tartışma başlatılmamış.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}