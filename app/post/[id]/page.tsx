'use client'; 

import { createClient } from '@/utils/supabase/client'; 
import { useRouter, useParams } from 'next/navigation'; 
import { useEffect, useState } from 'react'; 
import moment from 'moment'; 
import Link from 'next/link'; 
import Image from 'next/image';
import 'moment/locale/tr'; 

import { 
  ArrowLeft, Loader2, User, MapPin, Ticket, QrCode, Clock, MoreHorizontal, Users 
} from 'lucide-react'; 

import CommentSection from '@/components/CommentSection'; 
import EventLifecycle from '@/components/EventLifecycle';
import ReactionBar from '@/components/ReactionBar';
import AddToCalendarBtn from '@/components/AddToCalendarBtn';

interface Post { 
  id: string; 
  content: string; 
  user_id: string; 
  created_at: string; 
  image_url?: string;
  profiles: { full_name: string; avatar_url: string; username: string; }; 
  is_event?: boolean;
  event_date?: string;
  event_location?: any; 
  woow_count?: number;
  doow_count?: number;
  adil_count?: number;
  comment_count?: number;
  my_reaction?: string;
} 

export default function PostDetailPage() { 
  const params = useParams(); 
  const id = params?.id as string; 
  const router = useRouter();
  const supabase = createClient(); 

  const [post, setPost] = useState<Post | null>(null); 
  const [isLoading, setIsLoading] = useState(true); 
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => { 
    const fetchData = async () => { 
      try { 
        setIsLoading(true); 
        if (!id) return; 

        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);
         
        const { data, error } = await supabase 
          .from('posts') 
          .select(`*, profiles(full_name, avatar_url, username)`) 
          .eq('id', id) 
          .maybeSingle(); 

        if (error) throw error; 
        setPost(data as any); 
         
      } catch (error) { 
        console.error("Detay yükleme hatası:", error); 
      } finally { 
        setIsLoading(false); 
      } 
    };

    fetchData(); 
    moment.locale('tr'); 
  }, [id]); 

  // --- PREMIUM EVENT HERO (Lexwoow Sidebar Stili) ---
  const EventHero = ({ p }: { p: Post }) => {
    const eventDate = p.event_date ? new Date(p.event_date) : new Date();
    const locationName = typeof p.event_location === 'object' ? p.event_location?.name : p.event_location;

    return (
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl mb-8 relative group animate-in fade-in slide-in-from-bottom-4">
        
        {/* Dekoratif Arka Plan (Fuşya/Mor Blob Efekti) */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-100 rounded-full blur-3xl -z-0 translate-x-1/2 -translate-y-1/2 opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-violet-100 rounded-full blur-3xl -z-0 -translate-x-1/2 translate-y-1/2 opacity-50"></div>

        {/* Bilet Üst Çubuğu - LEXWOOW GRADIENT (Sidebar ile Birebir Aynı) */}
        <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 flex items-center justify-between border-b border-white/10 z-10 relative text-white shadow-lg shadow-fuchsia-900/20">
           <div className="flex items-center gap-2 text-xs font-black tracking-[0.2em] uppercase">
              <Ticket size={14} className="text-white/90" />
              <span>Dijital Bilet</span>
           </div>
           <div className="text-white/70 text-xs font-mono">ID: #{p.id.slice(0, 8)}</div>
        </div>

        <div className="flex flex-col md:flex-row relative z-10">
            {/* SOL: İçerik */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
                <div>
                   <div className="flex flex-wrap gap-4 mb-6">
                      <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-fuchsia-300 transition-colors cursor-pointer" onClick={() => router.push(`/profile/${p.user_id}`)}>
                         <User size={16} className="text-fuchsia-600" />
                         <span className="font-bold text-sm">{p.profiles?.full_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                         <MapPin size={16} className="text-violet-600" />
                         <span className="font-bold text-sm">{locationName || 'Online'}</span>
                      </div>
                   </div>
                   
                   <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight mb-4">
                      {p.content}
                   </h1>
                </div>
            </div>

            {/* ORTA: Yırtık Çizgisi */}
            <div className="relative md:w-1 md:h-auto h-1 w-full flex items-center justify-center bg-white">
                 <div className="absolute md:-top-3 -left-3 md:left-auto w-6 h-6 rounded-full bg-[#f8fafc] border border-slate-200 z-20"></div>
                 <div className="absolute md:-bottom-3 -right-3 md:right-auto w-6 h-6 rounded-full bg-[#f8fafc] border border-slate-200 z-20"></div>
                 <div className="w-full h-full md:border-l-2 border-t-2 md:border-t-0 border-dashed border-slate-300"></div>
            </div>

            {/* SAĞ: QR & Aksiyonlar */}
            <div className="w-full md:w-80 bg-slate-50 p-6 md:p-8 flex flex-col items-center justify-center text-center gap-4 border-l-0 md:border-l border-slate-100 relative">
                 <div className="flex flex-col items-center">
                    <span className="text-fuchsia-600 font-bold uppercase tracking-widest text-xs mb-1">
                        {moment(eventDate).format('MMMM')}
                    </span>
                    <span className="text-5xl font-black text-slate-900 tracking-tighter leading-none">
                        {moment(eventDate).format('DD')}
                    </span>
                    <span className="text-slate-500 text-sm font-medium mt-1 flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                        <Clock size={12} className="text-violet-500" /> {moment(eventDate).format('HH:mm')}
                    </span>
                 </div>

                 <div className="bg-white p-2 rounded-xl shadow-md border border-slate-100 group-hover:scale-105 transition-transform duration-300">
                     <QrCode size={80} className="text-slate-900" />
                 </div>
                 
                 <div className="w-full mt-2 scale-95 flex flex-col gap-1">
                     <EventLifecycle 
                        eventId={p.id} 
                        eventDate={p.event_date!} 
                        locationName={locationName} 
                     />
                     <AddToCalendarBtn 
                        eventTitle={p.content.slice(0, 60) + (p.content.length > 60 ? "..." : "")}
                        eventDate={p.event_date!}
                        locationName={locationName}
                     />
                 </div>
            </div>
        </div>
      </div>
    );
  };

  if (isLoading) return <div className="min-h-screen bg-[#f8fafc] flex justify-center items-center"><Loader2 className="animate-spin text-fuchsia-600 w-8 h-8" /></div>; 
  if (!post) return <div className="min-h-screen bg-[#f8fafc] flex justify-center items-center text-slate-500 font-medium">İçerik bulunamadı veya silinmiş.</div>; 

  return ( 
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans text-slate-900"> 
      <div className="max-w-4xl mx-auto"> 
        
        {/* --- NAVİGASYON (Lexwoow'a Dön) --- */}
        <div className="flex items-center justify-between mb-6">
            
            {/* LINK: /social'a gidiyor */}
            <Link href="/social" className="group flex items-center gap-3 px-2 py-2 rounded-xl transition-all hover:bg-white/50"> 
                
                {/* Sol Ok */}
                <div className="bg-white p-2 rounded-full border border-slate-200 shadow-sm group-hover:shadow-md transition-all group-hover:-translate-x-1">
                    <ArrowLeft size={20} className="text-slate-600 group-hover:text-slate-900" />
                </div>

                {/* Lexwoow Logo & Işıltı */}
                <div className="flex items-center gap-2.5">
                    {/* Sidebar'daki ikonun aynısı */}
                    <div className="p-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md shadow-fuchsia-900/30">
                        <Users size={16} className="fill-white" />
                    </div>

                    <div className="flex flex-col leading-none">
                        {/* Gradient Text: Sidebar ile aynı renkler */}
                        <span className="font-black text-lg tracking-widest bg-gradient-to-r from-violet-600 to-fuchsia-600 text-transparent bg-clip-text uppercase">
                            LEXWOOW
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 normal-case tracking-normal group-hover:text-fuchsia-600 transition-colors">
                            'a Dön
                        </span>
                    </div>
                </div>
            </Link>

            <button className="text-slate-400 hover:text-slate-900 transition-colors p-2 hover:bg-white rounded-full hover:shadow-sm">
                <MoreHorizontal size={20} />
            </button>
        </div>

        {/* --- İÇERİK ALANI --- */}
        {post.is_event ? (
            <EventHero p={post} />
        ) : (
            // Standart Post Görünümü
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow mb-6">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-slate-100 overflow-hidden relative border border-slate-100 shadow-sm cursor-pointer" onClick={() => router.push(`/profile/${post.user_id}`)}>
                      <Image src={post.profiles?.avatar_url || '/default-avatar.png'} alt="avatar" fill className="object-cover" />
                  </div>
                  <div>
                      <div className="text-slate-900 font-bold text-lg leading-tight cursor-pointer hover:underline hover:text-fuchsia-700 transition-colors" onClick={() => router.push(`/profile/${post.user_id}`)}>{post.profiles?.full_name}</div>
                      <div className="text-xs text-slate-500 font-medium">@{post.profiles?.username} • {moment(post.created_at).fromNow()}</div>
                  </div>
               </div>
               <p className="text-slate-800 text-lg whitespace-pre-wrap leading-relaxed">{post.content}</p>
               {post.image_url && (
                  <div className="mt-4 relative h-64 md:h-96 w-full rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                      <Image src={post.image_url} alt="post" fill className="object-cover" />
                  </div>
               )}
            </div>
        )}

        {/* Etkileşim & Yorumlar */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <ReactionBar 
                  targetId={post.id}
                  targetType="post"
                  initialCounts={{
                    woow: post.woow_count || 0,
                    doow: post.doow_count || 0,
                    adil: post.adil_count || 0,
                    comment_count: post.comment_count || 0
                  }}
                  initialUserReaction={(post.my_reaction as 'woow' | 'doow' | 'adil') || null}
                  isOwner={currentUserId === post.user_id}
                />
            </div>
            <div className="p-4 md:p-6">
                <h3 className="text-slate-900 font-bold mb-4 flex items-center gap-2 text-lg">
                    Yorumlar <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{post.comment_count || 0}</span>
                </h3>
                <CommentSection postId={post.id} postOwnerId={post.user_id} />
            </div>
        </div>

      </div> 
    </div> 
  ); 
}