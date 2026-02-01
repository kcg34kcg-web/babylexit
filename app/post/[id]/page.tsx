'use client'; 

import { createClient } from '@/utils/supabase/client'; 
import { useRouter, useParams } from 'next/navigation'; 
import { useEffect, useState } from 'react'; 
import moment from 'moment'; 
import Link from 'next/link'; 
import Image from 'next/image';
import 'moment/locale/tr'; 

import { 
  ArrowLeft, Loader2, User, MapPin, Ticket, QrCode, Clock, MoreHorizontal 
} from 'lucide-react'; 

// Mevcut Bileşenler
import CommentSection from '@/components/CommentSection'; 
import EventLifecycle from '@/components/EventLifecycle';
import ReactionBar from '@/components/ReactionBar';

interface Post { 
  id: string; 
  content: string; 
  user_id: string; 
  created_at: string; 
  image_url?: string;
  // İlişkisel Veriler
  profiles: { full_name: string; avatar_url: string; username: string; }; 
  // Etkinlik Alanları
  is_event?: boolean;
  event_date?: string;
  event_location?: any; 
  // Sayaçlar
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

        // 1. Kullanıcıyı Bul
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);
         
        // 2. Post Verisini Çek
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

  // --- PREMIUM EVENT HERO (BİLET GÖRÜNÜMÜ) ---
  const EventHero = ({ p }: { p: Post }) => {
    const eventDate = p.event_date ? new Date(p.event_date) : new Date();
    // Konum verisi kontrolü
    const locationName = typeof p.event_location === 'object' ? p.event_location?.name : p.event_location;

    return (
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl mb-8 relative group animate-in fade-in slide-in-from-bottom-4">
        
        {/* Dekoratif Efektler */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -z-0 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -z-0 -translate-x-1/2 translate-y-1/2"></div>

        {/* Bilet Üst Çubuğu */}
        <div className="bg-slate-950/50 backdrop-blur-sm px-6 py-3 flex items-center justify-between border-b border-slate-800 z-10 relative">
           <div className="flex items-center gap-2 text-amber-500 text-xs font-black tracking-[0.2em] uppercase">
              <Ticket size={14} />
              <span>Dijital Bilet</span>
           </div>
           <div className="text-slate-500 text-xs font-mono">Bilet ID: #{p.id.slice(0, 8)}</div>
        </div>

        <div className="flex flex-col md:flex-row relative z-10">
            {/* SOL: İçerik */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
                <div>
                   <div className="flex flex-wrap gap-4 mb-6">
                      <div className="flex items-center gap-2 text-slate-300 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                         <User size={16} className="text-blue-400" />
                         <span className="font-semibold text-sm">{p.profiles?.full_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                         <MapPin size={16} className="text-red-400" />
                         <span className="font-semibold text-sm">{locationName || 'Online'}</span>
                      </div>
                   </div>
                   
                   <h1 className="text-2xl md:text-3xl font-black text-white leading-tight mb-4 drop-shadow-lg">
                      {p.content}
                   </h1>
                </div>
            </div>

            {/* ORTA: Yırtık Çizgisi */}
            <div className="relative md:w-1 md:h-auto h-1 w-full flex items-center justify-center">
                 <div className="absolute md:-top-3 -left-3 md:left-auto w-6 h-6 rounded-full bg-slate-950 border border-slate-800 z-20"></div>
                 <div className="absolute md:-bottom-3 -right-3 md:right-auto w-6 h-6 rounded-full bg-slate-950 border border-slate-800 z-20"></div>
                 <div className="w-full h-full md:border-l-2 border-t-2 md:border-t-0 border-dashed border-slate-600/50"></div>
            </div>

            {/* SAĞ: Tarih & QR Alanı */}
            <div className="w-full md:w-80 bg-slate-800/30 p-6 md:p-8 flex flex-col items-center justify-center text-center gap-4 border-l-0 md:border-l border-slate-700/50 relative">
                 <div className="flex flex-col items-center">
                    <span className="text-red-500 font-bold uppercase tracking-widest text-xs mb-1">
                        {moment(eventDate).format('MMMM')}
                    </span>
                    <span className="text-5xl font-black text-white tracking-tighter leading-none">
                        {moment(eventDate).format('DD')}
                    </span>
                    <span className="text-slate-400 text-sm font-medium mt-1 flex items-center gap-1.5 bg-slate-900/50 px-3 py-1 rounded-full border border-slate-700">
                        <Clock size={12} /> {moment(eventDate).format('HH:mm')}
                    </span>
                 </div>

                 <div className="bg-white p-2 rounded-xl shadow-lg mt-2 group-hover:scale-105 transition-transform duration-300">
                     <QrCode size={80} className="text-slate-900" />
                 </div>
                 
                 {/* Canlı Durum Butonu */}
                 <div className="w-full mt-2 scale-90">
                     {/* [DÜZELTME] eventId prop'u eklendi! */}
                     <EventLifecycle 
                        eventId={p.id} 
                        eventDate={p.event_date!} 
                        locationName={locationName} 
                     />
                 </div>
            </div>
        </div>
      </div>
    );
  };

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex justify-center items-center"><Loader2 className="animate-spin text-amber-500 w-8 h-8" /></div>; 
  if (!post) return <div className="min-h-screen bg-slate-950 flex justify-center items-center text-white p-10">İçerik bulunamadı veya silinmiş.</div>; 

  return ( 
    <div className="min-h-screen bg-slate-950 p-4 md:p-8"> 
      <div className="max-w-4xl mx-auto"> 
        
        {/* Navigasyon */}
        <div className="flex items-center justify-between mb-6">
            <Link href="/" className="inline-flex items-center text-slate-400 hover:text-amber-500 transition-colors group"> 
                <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Akışa Dön 
            </Link>
            <button className="text-slate-400 hover:text-white transition-colors">
                <MoreHorizontal size={20} />
            </button>
        </div>

        {/* --- DİNAMİK HEADER: Etkinlik ise Bilet, Değilse Standart Kart --- */}
        {post.is_event ? (
            <EventHero p={post} />
        ) : (
            // Standart Post Görünümü
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-6">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden relative border border-slate-700">
                      <Image 
                        src={post.profiles?.avatar_url || '/default-avatar.png'} 
                        alt="avatar" 
                        fill 
                        className="object-cover"
                      />
                  </div>
                  <div>
                      <div className="text-white font-bold">{post.profiles?.full_name}</div>
                      <div className="text-xs text-slate-500">@{post.profiles?.username} • {moment(post.created_at).fromNow()}</div>
                  </div>
               </div>
               
               <p className="text-slate-300 text-lg whitespace-pre-wrap">{post.content}</p>
               
               {post.image_url && (
                  <div className="mt-4 relative h-64 md:h-96 w-full rounded-xl overflow-hidden border border-slate-800">
                      <Image src={post.image_url} alt="post" fill className="object-cover" />
                  </div>
               )}
            </div>
        )}

        {/* --- ETKİLEŞİM & YORUMLAR --- */} 
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            {/* ReactionBar (Oylama) */}
            <div className="p-4 border-b border-slate-800 bg-slate-900">
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

            {/* Yorumlar Bölümü */}
            <div className="p-4 md:p-6">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    Yorumlar <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{post.comment_count || 0}</span>
                </h3>
                <CommentSection postId={post.id} postOwnerId={post.user_id} />
            </div>
        </div>

      </div> 
    </div> 
  ); 
}