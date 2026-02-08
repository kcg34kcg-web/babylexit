'use client';

import { useState, useEffect } from "react";
import { 
  Users, TrendingUp, ArrowLeft, 
  Gavel, Home, ShoppingCart, Calendar,
  Sparkles, User, Search, MessageCircle, Send,
  Scale, Film // <--- YENİ: Film ikonu eklendi
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import PostList from "@/components/PostList"; 
import { Toaster } from "react-hot-toast";
import Link from "next/link";
import { UserProfile } from "@/app/types";
import CreatePost from "@/components/CreatePost";
import InboxDialog from "@/components/chat/InboxDialog";
import { cn } from "@/utils/cn";

import { NotificationDrawer } from "@/components/notifications/NotificationDrawer";
import { NotificationBell } from "@/components/notifications/NotificationBell"; 
import { useNotifications } from "@/hooks/useNotifications";

// ✅ IMPORTLAR GÜNCELLENDİ
import DailyDebateWidget from "@/components/social/DailyDebateWidget";
import DebateTab from "@/components/social/DebateTab";
import * as HoverCard from '@radix-ui/react-hover-card';
import { getDailyDebate } from "@/app/actions/debate"; // Veriyi ana sayfada çekmek için

export default function LexwoowPage() {
  const router = useRouter();
  const supabase = createClient();
    
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showTransition, setShowTransition] = useState(true);
    
  // ✅ YENİ STATE: Münazara verisini burada tutup Widget'a hazır göndereceğiz
  const [dailyDebateData, setDailyDebateData] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'woow' | 'profile' | 'events' | 'debate'>('woow');
  const [refreshKey, setRefreshKey] = useState(0);

  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const { unreadCount } = useNotifications(user?.id);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const getUserAndProfile = async () => {
      // 1. Kullanıcı Bilgisi
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      if (authUser) {
        const { data: profileData } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url, reputation, is_private')
            .eq('id', authUser.id)
            .single();
        
        if (profileData) setProfile(profileData as any);
      }

      // ✅ 2. PERFORMANS AYARI: Münazara verisini sayfa yüklenirken sessizce çek
      try {
         const debateData = await getDailyDebate();
         setDailyDebateData(debateData);
      } catch (error) {
         console.error("Debate data fetch error", error);
      }
    };

    getUserAndProfile();
    const timer = setTimeout(() => setShowTransition(false), 1200);
    return () => clearTimeout(timer);
  }, [supabase]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 pb-20 selection:bg-amber-100 font-sans relative">
      <Toaster position="top-center" />
      
      {/* MODALLAR */}
      {user && (
        <InboxDialog 
          isOpen={isInboxOpen} 
          onClose={() => setIsInboxOpen(false)} 
          currentUserId={user.id} 
        />
      )}
      {user && (
        <NotificationDrawer 
          isOpen={isNotificationOpen} 
          onClose={() => setIsNotificationOpen(false)} 
          userId={user.id} 
        />
      )}
        
      <AnimatePresence>
        {showTransition && (
          <motion.div exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center text-white">
            <motion.div initial={{ rotate: -45, y: -50 }} animate={{ rotate: 0, y: 0 }} transition={{ type: "spring", stiffness: 300 }} className="text-amber-500">
              <Gavel size={100} />
            </motion.div>
            <h1 className="mt-6 text-2xl font-bold tracking-[0.4em] uppercase text-slate-100">Lexwoow</h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER (Mobil) */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 p-4 shadow-sm lg:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-all active:scale-90">
            <ArrowLeft size={22} />
          </button>
          <div className="relative flex-1">
             <span className="font-bold text-slate-800 ml-2">
                {activeTab === 'debate' ? 'Münazara Arenası' : 'Lexwoow'}
             </span>
          </div>
          <button 
            onClick={() => setIsInboxOpen(true)}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-600 relative transition-all active:scale-90"
          >
             <MessageCircle size={24} />
          </button>
          {user && (
            <NotificationBell 
                count={unreadCount} 
                isOpen={isNotificationOpen}
                onClick={() => setIsNotificationOpen(true)}
            />
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-4 gap-8 mt-6">
        
        {/* SOL KOLON (Sidebar) */}
        <div className="hidden lg:block lg:col-span-1">
           <div className="sticky top-8 space-y-3 max-h-[calc(100vh-2rem)] overflow-y-auto pr-2 scrollbar-hide"> 
              <div className="px-4 mb-2 flex items-center gap-2 text-amber-600">
                 <Gavel size={32} />
                 <span className="font-bold text-2xl tracking-widest text-slate-900">LEXWOOW</span>
              </div>

              <nav className="space-y-1">
                 <button 
                   onClick={() => { setActiveTab('woow'); setSearchTerm(""); setRefreshKey(prev => prev + 1); }} 
                   className={cn(
                     "flex items-center gap-4 px-4 py-3 text-xl font-bold rounded-full transition-all w-full text-left",
                     activeTab === 'woow' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-900 hover:bg-slate-50 border border-slate-100'
                   )}
                 >
                    <div className="w-10 flex justify-center"><Home size={26} /></div>
                    <span>WOOW</span>
                 </button>

                 {/* ✅ GÜNCELLEME: HOVER CARD & PRELOADED DATA */}
                 <HoverCard.Root openDelay={200} closeDelay={100}>
                   
                   {/* 1. Tetikleyici Buton */}
                   <HoverCard.Trigger asChild>
                     <button 
                       onClick={() => { setActiveTab('debate'); setSearchTerm(""); }} 
                       className={cn(
                         "flex items-center gap-4 px-4 py-3 text-xl font-bold rounded-full transition-all w-full text-left outline-none relative",
                         activeTab === 'debate' 
                           ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md' 
                           : 'bg-white text-slate-900 hover:bg-emerald-50 border border-transparent'
                       )}
                     >
                        <div className="w-10 flex justify-center"><Scale size={26} /></div>
                        <span>Münazara</span>
                     </button>
                   </HoverCard.Trigger>
                   
                   {/* 2. Açılan Ön İzleme Penceresi */}
                   <HoverCard.Portal>
                     <HoverCard.Content 
                       side="right"       
                       align="start"      
                       sideOffset={20}    
                       className="z-[9999] w-[320px] outline-none animate-in fade-in zoom-in-95 duration-200"
                     >
                       <HoverCard.Arrow className="fill-slate-800" width={16} height={8} />
                       
                       <div className="rounded-xl overflow-hidden shadow-2xl shadow-slate-900/40 border border-slate-700/50">
                         {/* ✅ OPTİMİZASYON: Veriyi prop olarak gönderiyoruz */}
                         <DailyDebateWidget preloadedData={dailyDebateData} /> 
                       </div>
                       
                     </HoverCard.Content>
                   </HoverCard.Portal>

                 </HoverCard.Root>

                 {/* BİLDİRİMLER */}
                 {user && (
                   <button 
                      onClick={() => setIsNotificationOpen(true)}
                      className={cn(
                        "flex items-center gap-4 px-4 py-3 text-xl font-medium rounded-full transition-all w-full text-left group",
                        "text-slate-600 hover:bg-amber-50"
                      )}
                   >
                      <NotificationBell 
                          count={unreadCount} 
                          asDiv={true} 
                      />
                      
                      <span className={cn(
                        "transition-colors group-hover:text-slate-900",
                        unreadCount > 0 ? "font-bold text-slate-900" : ""
                      )}>
                        Bildirimler
                      </span>
                   </button>
                 )}

                 <button className="flex items-center gap-4 px-4 py-3 text-xl font-medium text-purple-600 hover:bg-purple-50 rounded-full transition-all w-full text-left group">
                    <div className="w-10 flex justify-center"><Sparkles size={26} className="group-hover:rotate-12 transition-transform" /></div>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500 font-bold">Geft-AI</span>
                 </button>

                 <button 
                   onClick={() => { setActiveTab('profile'); setSearchTerm(""); }} 
                   className={cn(
                     "flex items-center gap-4 px-4 py-3 text-xl font-bold rounded-full transition-all w-full text-left",
                     activeTab === 'profile' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-900 hover:bg-slate-50 border border-transparent'
                   )}
                 >
                    <div className="w-10 flex justify-center"><User size={26} /></div>
                    <span>Hesabım</span>
                 </button>

                 <button 
                    onClick={() => setIsInboxOpen(true)}
                    className="flex items-center gap-4 px-4 py-3 text-xl font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-full transition-all w-full text-left"
                 >
                    <div className="w-10 flex justify-center"><MessageCircle size={26} /></div>
                    <span>Mesajlar</span>
                 </button>

                 <Link href="/market" className="flex items-center gap-4 px-4 py-3 text-xl font-medium text-slate-600 hover:bg-slate-100 rounded-full transition-all w-full">
                    <div className="w-10 flex justify-center"><ShoppingCart size={26} /></div>
                    <span>Market</span>
                 </Link>

                 <button 
                   onClick={() => { setActiveTab('events'); setSearchTerm(""); setRefreshKey(prev => prev + 1); }}
                   className={cn(
                     "flex items-center gap-4 px-4 py-3 text-xl font-bold rounded-full transition-all w-full text-left",
                     activeTab === 'events' 
                       ? 'bg-amber-500/10 text-amber-600 border border-amber-200' 
                       : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                   )}
                 >
                    <div className="w-10 flex justify-center"><Calendar size={26} /></div>
                    <span>Etkinlikler</span>
                 </button>
                 
                 {/* --- 🔥 YENİ EKLENEN REELS BUTONU --- */}
                 <button 
                   onClick={() => router.push('/reels')}
                   className="flex items-center gap-4 px-4 py-3 text-xl font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-all w-full text-left group"
                 >
                    <div className="w-10 flex justify-center">
                       <Film size={26} className="group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="font-bold">Reels Akışı</span>
                 </button>
                 {/* ---------------------------------- */}
                 
                 <button onClick={() => router.push('/')} className="flex items-center gap-4 px-4 py-3 text-xl font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-all w-full text-left mt-2">
                    <div className="w-10 flex justify-center"><ArrowLeft size={26} /></div>
                    <span>Ana Menü</span>
                 </button>
              </nav>

              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 w-full text-left",
                  "bg-amber-500 hover:bg-amber-600 text-white",
                  "rounded-full shadow-lg shadow-amber-500/30 transition-all active:scale-95 mt-4 group"
                )}
              >
                <div className="w-10 flex justify-center">
                   <Send size={24} className="group-hover:translate-x-1 transition-transform" /> 
                </div>
                <span className="font-bold text-lg">Görüş Bildir</span>
              </button>
           </div>
        </div>

        {/* ORTA KOLON */}
        <div className="lg:col-span-2 space-y-8 pb-20">
          
          {/* MANTIKSAL AYRIM: Eğer 'debate' sekmesi açıksa farklı içerik göster */}
          {activeTab === 'debate' ? (
            // --- MÜNAZARA ARAYÜZÜ ---
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-black text-xl text-slate-800 tracking-tight flex items-center gap-2">
                     <Scale className="text-emerald-600" />
                     MÜNAZARA ARENASI
                  </h2>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Canlı Tartışma</span>
               </div>
               
               <DebateTab />
            </div>

          ) : (
            // --- STANDART AKIŞ ---
            <>
              {user && activeTab !== 'profile' && (
                <div className="animate-in fade-in slide-in-from-top-4">
                  <CreatePost userId={user.id} />
                </div>
              )}

              <div className="flex items-center gap-3 px-2">
                  <div className="h-[1px] flex-1 bg-slate-200"></div>
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase tracking-[0.3em] font-black">
                    <TrendingUp size={14} className="text-amber-500" />
                    <span>
                      {searchTerm 
                        ? `"${searchTerm}" İÇİN SONUÇLAR` 
                        : activeTab === 'woow' ? 'KÜRSÜ AKIŞI' : activeTab === 'profile' ? 'PROFİLİM' : 'ETKİNLİK GÜNDEMİ'
                      }
                    </span>
                  </div>
                  <div className="h-[1px] flex-1 bg-slate-200"></div>
              </div>

              <PostList 
                key={refreshKey} 
                userId={activeTab === 'profile' ? user?.id : undefined} 
                filter={activeTab === 'events' ? 'events' : 'all'} 
                searchQuery={debouncedSearch} 
              />
            </>
          )}

        </div>

        {/* SAĞ KOLON */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-8 space-y-6">
             <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Kişi, Şehir veya Konu..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-full py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-amber-500/20 text-sm shadow-sm transition-all" 
                />
             </div>

            <div className="bg-white border border-slate-200/80 rounded-[1.5rem] p-6 shadow-sm shadow-slate-200/50">
              <h3 className="font-black text-[11px] mb-6 flex items-center gap-2 text-slate-900 uppercase tracking-widest">
                <Users size={18} className="text-amber-500" /> Aktif Gruplar
              </h3>
              <div className="space-y-6">
                {["#MedipolHukuk", "#FikriMülkiyet", "#StajyerAvukatlar"].map((g) => (
                  <div key={g} className="group cursor-pointer">
                    <p className="text-[14px] font-bold text-slate-700 group-hover:text-amber-600 transition-colors">{g}</p>
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">Meslektaşlar tartışıyor</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </main>
    </div> 
  );
}