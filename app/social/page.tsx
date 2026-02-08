'use client';

import { useState, useEffect } from "react";
import { 
  Users, TrendingUp, ArrowLeft, 
  Gavel, Home, ShoppingCart, Calendar,
  Sparkles, User, Search, MessageCircle, Send,
  Scale, Film 
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

import DailyDebateWidget from "@/components/social/DailyDebateWidget";
import DebateTab from "@/components/social/DebateTab";
import * as HoverCard from '@radix-ui/react-hover-card';
import { getDailyDebate } from "@/app/actions/debate";

export default function LexwoowPage() {
  const router = useRouter();
  const supabase = createClient();
    
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showTransition, setShowTransition] = useState(true);
    
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

      {/* ✅ GRID GÜNCELLEMESİ: 
          Eski: grid-cols-1 lg:grid-cols-4
          Yeni: grid-cols-1 lg:grid-cols-[260px_1fr_300px] 
          Bu sayede sol ve sağ sidebarlar sabit ve daha dar (kompakt) kalır, orta alan genişler.
      */}
      <main className="max-w-[1400px] mx-auto px-4 grid grid-cols-1 lg:grid-cols-[240px_1fr_280px] gap-6 mt-4">
        
        {/* SOL KOLON (Sidebar) */}
        <div className="hidden lg:block">
           {/* ✅ GÜNCELLEME: sticky, h-screen ve overflow-hidden ile tam sığdırma.
               justify-between ekleyerek menüyü ve alt butonları yaydık.
           */}
           <div className="sticky top-0 h-screen py-6 flex flex-col justify-between overflow-hidden"> 
              
              <div>
                <div className="px-3 mb-6 flex items-center gap-2 text-amber-600">
                   <Gavel size={28} /> {/* İkon küçültüldü */}
                   <span className="font-bold text-xl tracking-widest text-slate-900">LEXWOOW</span>
                </div>

                <nav className="space-y-1">
                   {/* Buton boyutları (px-3 py-2) ve yazı boyutları (text-base) küçültüldü */}
                   <button 
                     onClick={() => { setActiveTab('woow'); setSearchTerm(""); setRefreshKey(prev => prev + 1); }} 
                     className={cn(
                       "flex items-center gap-3 px-3 py-2.5 text-base font-bold rounded-full transition-all w-full text-left",
                       activeTab === 'woow' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-900 hover:bg-slate-50 border border-slate-100'
                     )}
                   >
                      <div className="w-8 flex justify-center"><Home size={20} /></div>
                      <span>WOOW</span>
                   </button>

                   <HoverCard.Root openDelay={200} closeDelay={100}>
                     <HoverCard.Trigger asChild>
                       <button 
                         onClick={() => { setActiveTab('debate'); setSearchTerm(""); }} 
                         className={cn(
                           "flex items-center gap-3 px-3 py-2.5 text-base font-bold rounded-full transition-all w-full text-left outline-none relative",
                           activeTab === 'debate' 
                             ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md' 
                             : 'bg-white text-slate-900 hover:bg-emerald-50 border border-transparent'
                         )}
                       >
                          <div className="w-8 flex justify-center"><Scale size={20} /></div>
                          <span>Münazara</span>
                       </button>
                     </HoverCard.Trigger>
                     
                     <HoverCard.Portal>
                       <HoverCard.Content 
                         side="right"       
                         align="start"      
                         sideOffset={10}    
                         className="z-[9999] w-[300px] outline-none animate-in fade-in zoom-in-95 duration-200"
                       >
                         <HoverCard.Arrow className="fill-slate-800" width={16} height={8} />
                         <div className="rounded-xl overflow-hidden shadow-2xl shadow-slate-900/40 border border-slate-700/50">
                           <DailyDebateWidget preloadedData={dailyDebateData} /> 
                         </div>
                       </HoverCard.Content>
                     </HoverCard.Portal>
                   </HoverCard.Root>

                   {user && (
                     <button 
                        onClick={() => setIsNotificationOpen(true)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 text-base font-medium rounded-full transition-all w-full text-left group",
                          "text-slate-600 hover:bg-amber-50"
                        )}
                     >
                        <div className="w-8 flex justify-center">
                            <NotificationBell count={unreadCount} asDiv={true} />
                        </div>
                        <span className={cn("transition-colors group-hover:text-slate-900", unreadCount > 0 ? "font-bold text-slate-900" : "")}>
                          Bildirimler
                        </span>
                     </button>
                   )}

                   <button className="flex items-center gap-3 px-3 py-2.5 text-base font-medium text-purple-600 hover:bg-purple-50 rounded-full transition-all w-full text-left group">
                      <div className="w-8 flex justify-center"><Sparkles size={20} className="group-hover:rotate-12 transition-transform" /></div>
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500 font-bold">Geft-AI</span>
                   </button>

                   <button 
                     onClick={() => { setActiveTab('profile'); setSearchTerm(""); }} 
                     className={cn(
                       "flex items-center gap-3 px-3 py-2.5 text-base font-bold rounded-full transition-all w-full text-left",
                       activeTab === 'profile' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-900 hover:bg-slate-50 border border-transparent'
                     )}
                   >
                      <div className="w-8 flex justify-center"><User size={20} /></div>
                      <span>Hesabım</span>
                   </button>

                   <button 
                      onClick={() => setIsInboxOpen(true)}
                      className="flex items-center gap-3 px-3 py-2.5 text-base font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-full transition-all w-full text-left"
                   >
                      <div className="w-8 flex justify-center"><MessageCircle size={20} /></div>
                      <span>Mesajlar</span>
                   </button>

                   <Link href="/market" className="flex items-center gap-3 px-3 py-2.5 text-base font-medium text-slate-600 hover:bg-slate-100 rounded-full transition-all w-full">
                      <div className="w-8 flex justify-center"><ShoppingCart size={20} /></div>
                      <span>Market</span>
                   </Link>

                   <button 
                     onClick={() => { setActiveTab('events'); setSearchTerm(""); setRefreshKey(prev => prev + 1); }}
                     className={cn(
                       "flex items-center gap-3 px-3 py-2.5 text-base font-bold rounded-full transition-all w-full text-left",
                       activeTab === 'events' 
                         ? 'bg-amber-500/10 text-amber-600 border border-amber-200' 
                         : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                     )}
                   >
                      <div className="w-8 flex justify-center"><Calendar size={20} /></div>
                      <span>Etkinlikler</span>
                   </button>
                   
                   <button 
                     onClick={() => router.push('/reels')}
                     className="flex items-center gap-3 px-3 py-2.5 text-base font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-all w-full text-left group"
                   >
                      <div className="w-8 flex justify-center">
                         <Film size={20} className="group-hover:scale-110 transition-transform" />
                      </div>
                      <span className="font-bold">Reels Akışı</span>
                   </button>
                   
                   <button onClick={() => router.push('/')} className="flex items-center gap-3 px-3 py-2.5 text-base font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-all w-full text-left mt-1">
                      <div className="w-8 flex justify-center"><ArrowLeft size={20} /></div>
                      <span>Ana Menü</span>
                   </button>
                </nav>
              </div>

              {/* Alt Buton: Sabit */}
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 w-full text-left",
                  "bg-amber-500 hover:bg-amber-600 text-white",
                  "rounded-full shadow-lg shadow-amber-500/30 transition-all active:scale-95 mt-2 group"
                )}
              >
                <div className="w-8 flex justify-center">
                   <Send size={20} className="group-hover:translate-x-1 transition-transform" /> 
                </div>
                <span className="font-bold text-base">Görüş Bildir</span>
              </button>
           </div>
        </div>

        {/* ORTA KOLON (Genişletildi) */}
        <div className="space-y-6 pb-20">
          
          {activeTab === 'debate' ? (
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

        {/* SAĞ KOLON (Sidebar) */}
        <div className="hidden lg:block">
          {/* ✅ GÜNCELLEME: sticky, h-screen ve overflow-hidden ile tam sığdırma. */}
          <div className="sticky top-0 h-screen py-6 overflow-hidden space-y-4">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Ara..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-full py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-amber-500/20 text-sm shadow-sm transition-all" 
                />
             </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm shadow-slate-200/50">
              <h3 className="font-black text-[10px] mb-4 flex items-center gap-2 text-slate-900 uppercase tracking-widest">
                <Users size={16} className="text-amber-500" /> Aktif Gruplar
              </h3>
              <div className="space-y-4">
                {["#MedipolHukuk", "#FikriMülkiyet", "#StajyerAvukatlar"].map((g) => (
                  <div key={g} className="group cursor-pointer">
                    <p className="text-sm font-bold text-slate-700 group-hover:text-amber-600 transition-colors">{g}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Meslektaşlar tartışıyor</p>
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