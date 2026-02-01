'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import moment from 'moment';
import 'moment/locale/tr';
import { useRouter } from 'next/navigation';
// Favori aksiyonunu daha sonra bağlayacağız, şimdilik UI odaklıyız
import { 
  Search, 
  TrendingUp, 
  MessageSquare, 
  Plus, 
  ShoppingCart, 
  User, 
  Calendar,
  Eye,
  Loader2,
  BookOpen,    
  PlayCircle,
  Heart,       // YENİ: Favori ikonu
  Zap,         // YENİ: Lexwoow ikonu
  FileText,    // YENİ: Sorularım/Cevaplarım için
  Star         // YENİ: Yıldız ikonu
} from 'lucide-react';

// Tip Tanımlamaları (Mevcut yapıyı koruyoruz)
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
  
  // Favori state'i (Şimdilik lokal simülasyon, Step 3'te veritabanına bağlayacağız)
  const [favorites, setFavorites] = useState<string[]>([]);

  const supabase = createClient();
  const router = useRouter();

  // Veri Çekme İşlemleri (Mevcut kod aynen korunuyor)
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

  const toggleFavorite = (id: string) => {
    // UI Simülasyonu - Step 3'te backend'e bağlanacak
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
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-amber-500 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24">
      
      {/* 1. KARŞILAMA ve İSTATİSTİKLER (Mevcut Yapı) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Merhaba, {profile?.full_name || user?.email?.split('@')[0]} 👋
          </h1>
          <p className="text-slate-400">Hukuk dünyasında bugün neler oluyor?</p>
        </div>
        
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

      {/* 2. YENİ NAVİGASYON GRİDİ (İstediğin Sıralama) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* A. Soru Sor */}
        <Link href="/ask" className="bg-gradient-to-br from-amber-600 to-amber-500 p-5 rounded-2xl flex flex-col justify-between group shadow-lg shadow-amber-900/20 hover:scale-[1.02] transition-transform">
          <div className="bg-white/20 w-10 h-10 rounded-full flex items-center justify-center text-white mb-3">
            <Plus size={24} />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Soru Sor</h3>
            <p className="text-white/80 text-xs">Topluluktan destek al</p>
          </div>
        </Link>

        {/* B. Sorularım / Cevaplarım (YENİ - Cevapla yerine geldi) */}
        <Link href="/my-content" className="bg-slate-800 border border-slate-700 p-5 rounded-2xl flex flex-col justify-between group hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all">
          <div className="bg-indigo-500/10 w-10 h-10 rounded-full flex items-center justify-center text-indigo-400 mb-3 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
            <FileText size={24} />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg leading-tight">Sorularım &<br/>Cevaplarım</h3>
            <p className="text-slate-400 text-xs mt-1">İçeriklerini yönet</p>
          </div>
        </Link>

        {/* C. Favorilerim (YENİ KONUM) */}
        <Link href="/favorites" className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between group hover:border-pink-500/50 transition-all">
          <div className="bg-pink-500/10 w-10 h-10 rounded-full flex items-center justify-center text-pink-500 mb-3 group-hover:scale-110 transition-transform">
            <Heart size={24} />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Favorilerim</h3>
            <p className="text-slate-400 text-xs">Kaydettiklerin</p>
          </div>
        </Link>

        {/* D. Market (Mevcut) */}
        <Link href="/market" className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between group hover:border-emerald-500/50 transition-all">
          <div className="bg-emerald-500/10 w-10 h-10 rounded-full flex items-center justify-center text-emerald-500 mb-3">
            <ShoppingCart size={24} />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Market</h3>
            <p className="text-slate-400 text-xs">Kredi satın al</p>
          </div>
        </Link>
      </div>

      {/* 3. ANA AKIŞ ve LEXWOOW BÖLÜMÜ */}
      <div className="mt-8">
        
        {/* Başlık ve Arama */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 self-start md:self-auto">
            <MessageSquare className="text-amber-500" />
            Ana Akış
          </h2>
          
          <div className="relative w-full md:w-72">
            <input 
              type="text" 
              placeholder="Ara..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-full py-2 pl-10 pr-4 text-slate-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
            />
            <Search className="absolute left-3.5 top-2.5 text-slate-500" size={16} />
          </div>
        </div>

        {/* YENİ LEXWOOW ALANI (Başlığın hemen altında) */}
        <Link href="/lexwoow" className="block mb-8 group">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500 p-[1px] shadow-2xl shadow-fuchsia-900/20">
            <div className="relative bg-slate-950/90 rounded-[23px] p-6 flex items-center justify-between overflow-hidden group-hover:bg-slate-950/80 transition-colors">
              
              {/* Arka plan efektleri */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/20 blur-[80px] rounded-full group-hover:bg-fuchsia-500/30 transition-all"></div>
              
              <div className="z-10 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-transparent bg-clip-text font-black text-3xl tracking-tight">Lexwoow</span>
                  <span className="bg-white/10 border border-white/20 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">AI Asistan</span>
                </div>
                <p className="text-slate-300 text-sm font-medium max-w-md">
                  Hukuki sorularını yapay zekaya sor, saniyeler içinde analiz al. 
                  <span className="text-amber-400 ml-1 underline cursor-pointer">Şimdi dene →</span>
                </p>
              </div>

              {/* Eğlenceli İkon Animasyonu */}
              <div className="hidden md:flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-violet-500 to-fuchsia-500 rounded-2xl shadow-lg transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-300">
                <Zap className="text-white fill-white" size={32} />
              </div>
            </div>
          </div>
        </Link>

        {/* FEED LISTESI (Kalp İkonlu) */}
        <div className="space-y-4">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((q) => (
              <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all group relative">
                
                {/* Kalp İkonu (Sağ Üst) */}
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    toggleFavorite(q.id);
                  }}
                  className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-800 transition-colors z-20"
                >
                  <Heart 
                    size={20} 
                    className={`transition-all ${favorites.includes(q.id) ? 'fill-pink-500 text-pink-500 scale-110' : 'text-slate-600 hover:text-pink-400'}`}
                  />
                </button>

                <div className="flex justify-between items-start mb-2 pr-10">
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-500 transition-colors line-clamp-1">
                    <Link href={`/questions/${q.id}`}>
                      {q.title}
                    </Link>
                  </h3>
                </div>
                
                <p className="text-slate-400 text-sm line-clamp-2 mb-4">
                  {q.content}
                </p>

                <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <User size={14} />
                    {q.profiles?.full_name || 'Gizli Üye'}
                    <span className="w-1 h-1 rounded-full bg-slate-700 mx-1"></span>
                    <Calendar size={12}/> {moment(q.created_at).fromNow()}
                  </div>
                  
                  <Link 
                    href={`/questions/${q.id}`}
                    className="text-sm font-bold text-slate-300 hover:text-white flex items-center gap-2 bg-slate-800 hover:bg-slate-700 py-2 px-4 rounded-lg transition-colors border border-slate-700"
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