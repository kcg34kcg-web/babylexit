import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { PenTool, TrendingUp, MessageSquare, Plus, ShoppingCart, User, Heart } from 'lucide-react'; // Heart Eklendi
import moment from 'moment';
import 'moment/locale/tr';

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Kullanıcı Bilgisi (Server Side)
  const { data: { user } } = await supabase.auth.getUser();
  let profile = null;

  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    profile = data;
  }

  // 2. Son 5 Soruyu Çek
  const { data: recentQuestions } = await supabase
    .from('questions')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(5);

  moment.locale('tr');

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* KARŞILAMA BÖLÜMÜ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Merhaba, {profile?.full_name || 'Hukukçu'} 👋
          </h1>
          <p className="text-slate-400">Bugün hukuki araştırmalarında neye ihtiyacın var?</p>
        </div>
        
        {/* İstatistik Kartları */}
        <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <div className="bg-slate-900 border border-amber-500/30 px-6 py-3 rounded-xl min-w-[140px]">
            <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">Reputasyon</span>
            <div className="text-2xl font-bold text-amber-500 flex items-center gap-2">
              <TrendingUp size={20} /> {profile?.reputation || 0}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-700 px-6 py-3 rounded-xl min-w-[140px]">
            <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">Kredi</span>
            <div className="text-2xl font-bold text-white flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div> {profile?.credits || 0}
            </div>
          </div>
        </div>
      </div>

      {/* HIZLI AKSİYONLAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>

      {/* GÜNDEM AKIŞI */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="text-amber-500" />
            Gündemdeki Tartışmalar
          </h2>
          <Link href="/questions" className="text-sm text-slate-400 hover:text-amber-500 transition-colors">
            Tümünü Gör →
          </Link>
        </div>

        <div className="space-y-4">
          {recentQuestions && recentQuestions.length > 0 ? (
            recentQuestions.map((q) => (
              <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-amber-500/30 transition-all group relative">
                
                {/* --- FAVORİ BUTONU (YENİ EKLENDİ) --- */}
                {/* Gerçek işlevsellik için buraya Client Component (FavoriteButton) gelecek */}
                <button className="absolute top-6 right-6 text-slate-600 hover:text-pink-500 transition-colors z-10">
                   <Heart size={20} />
                </button>
                {/* ------------------------------------ */}

                <div className="flex justify-between items-start mb-2 pr-10">
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-500 transition-colors line-clamp-1">
                    <Link href={`/questions/${q.id}`}>
                      {q.title}
                    </Link>
                  </h3>
                  <span className="text-xs text-slate-500 whitespace-nowrap ml-4">
                    {moment(q.created_at).fromNow()}
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
                    className="text-sm font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1"
                  >
                    <PenTool size={14} /> Görüş Bildir
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-slate-900 rounded-xl border border-dashed border-slate-800">
              <p className="text-slate-400">Henüz bir tartışma başlatılmamış.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}