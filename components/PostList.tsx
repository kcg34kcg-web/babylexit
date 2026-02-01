'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import ReactionBar from './ReactionBar';
import CommentSection from './CommentSection';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
// İKONLAR
import { Sparkles, TrendingUp, BadgeCheck, ShieldCheck, Zap } from 'lucide-react'; 
import Link from 'next/link';

// FİZİK MOTORU
import { motion, useAnimation } from 'framer-motion';

// ACTIONS & COMPONENTS
import { fetchFeed } from '@/app/actions/feed'; 
import WiltedRoseMenu from './WiltedRoseMenu';  

const PegasusIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
     <path d="M12 2C8 2 6 4 6 6V8H5C3.3 8 2 9.3 2 11V14C2 15.7 3.3 17 5 17H6V20C6 21.1 6.9 22 8 22H16C17.1 22 18 21.1 18 20V17H19C20.7 17 22 15.7 22 14V11C22 9.3 20.7 8 19 8H18V6C18 4 16 2 12 2ZM8 18H16V20H8V18ZM18 15H6V11C6 10.4 6.4 10 7 10H17C17.6 10 18 10.4 18 11V15ZM10 6C10 5.4 10.4 5 11 5H13C13.6 5 14 5.4 14 6V8H10V6Z" />
     <path d="M4 12L2 10M20 12L22 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// --- TİP TANIMLARI ---
interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  author_name: string;
  author_avatar: string;
  author_username?: string;
  author_reputation?: number; 
  
  woow_count: number;
  doow_count: number;
  adil_count: number;
  comment_count: number;
  my_reaction: 'woow' | 'doow' | 'adil' | null;
  score?: number;
}

// --- 1. PARÇA: POST KARTI ---
const PostItem = ({ 
  post, 
  currentUserId, 
  isExpanded, 
  onToggle 
}: { 
  post: Post, 
  currentUserId: string | null, 
  isExpanded: boolean, 
  onToggle: () => void 
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  const [isVisible, setIsVisible] = useState(true);
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  // Fizik Motoru
  const controls = useAnimation();
  const triggerPhysics = () => {
    controls.start({
      x: [0, -3, 3, -2, 2, 0], 
      scale: [1, 1.015, 1],    
      transition: { duration: 0.35, ease: "easeOut" }
    });
  };
  
  const MAX_LENGTH = 280;
  const isTooLong = post.content.length > MAX_LENGTH;
  const displayContent = isTooLong && !isContentExpanded
    ? post.content.slice(0, MAX_LENGTH) + "..." 
    : post.content;

  // Rozet Render
  const renderBadge = () => {
    const rep = post.author_reputation || 0;
    if (rep >= 5000) return <ShieldCheck size={16} className="text-pink-500 fill-pink-50 ml-1 inline-block align-text-bottom" />;
    if (rep >= 1000) return <Zap size={16} className="text-amber-400 fill-amber-50 ml-1 inline-block align-text-bottom" />;
    if (rep >= 100) return <BadgeCheck size={16} className="text-blue-500 fill-blue-50 ml-1 inline-block align-text-bottom" />;
    return null;
  };

  if (!isVisible) return null;

  /* eslint-disable react-hooks/rules-of-hooks */
  useEffect(() => {
    if (!isExpanded || !cardRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) onToggle(); 
      },
      { threshold: 0 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [isExpanded, onToggle]);

  const goToFullView = () => {
    router.push(`/questions/${post.id}`);
  };

  const goToProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/profile/${post.user_id}`);
  };

  return (
    <motion.div 
      ref={cardRef} 
      animate={controls} 
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow relative group animate-in fade-in slide-in-from-bottom-4"
    >
      
      {/* --- HEADER --- */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={goToFullView}>
            
            {/* AVATAR */}
            <div 
              className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold overflow-hidden border border-slate-100 transition-transform hover:scale-105"
              onClick={goToProfile}
            >
              {post.author_avatar ? (
                <Image src={post.author_avatar} alt="" width={40} height={40} className="object-cover w-full h-full" />
              ) : (
                post.author_name?.[0]?.toUpperCase() || '?'
              )}
            </div>

            {/* KULLANICI BİLGİLERİ */}
            <div className="flex flex-col justify-center">
              {/* 1. Satır: İsim + Rozet */}
              <div className="flex items-center">
                  <h3 
                      className="font-semibold text-slate-900 hover:underline hover:text-amber-600 transition-colors mr-1"
                      onClick={goToProfile}
                  >
                      {post.author_name}
                  </h3>
                  {renderBadge()}
              </div>
              
              {/* 2. Satır: @kullaniciadi - ARTIK GÖRÜNECEK */}
              {post.author_username && (
                 <span className="text-sm text-slate-500 font-medium block -mt-0.5">
                    @{post.author_username}
                 </span>
              )}

              {/* 3. Satır: Tarih */}
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                 <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: tr })}</span>
              </div>
            </div>
        </div>

        {/* MENU */}
        <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <WiltedRoseMenu 
                postId={post.id} 
                authorId={post.user_id} 
                onOptimisticHide={() => setIsVisible(false)} 
            />
        </div>
      </div>

      {/* --- CONTENT --- */}
      <div className="px-4 pb-2">
        <p className="text-slate-700 whitespace-pre-wrap mb-3 leading-relaxed text-[15px]">
          {displayContent}
          {isTooLong && !isContentExpanded && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsContentExpanded(true);
              }}
              className="text-amber-600 font-medium hover:underline ml-1 inline-block"
            >
              Devamını gör
            </button>
          )}
        </p>

        {post.image_url && (
          <div 
            className="relative w-full h-64 mb-3 rounded-xl overflow-hidden border border-slate-100 cursor-pointer shadow-sm"
            onClick={goToFullView}
          >
            <Image src={post.image_url} alt="Post Görseli" fill className="object-cover" />
          </div>
        )}
      </div>

      {/* --- FOOTER --- */}
      <div className="px-4 pb-4 border-t border-slate-50 pt-2 bg-slate-50/50">
        <ReactionBar 
          targetId={post.id}
          targetType="post"
          initialCounts={{
            woow: post.woow_count || 0,
            doow: post.doow_count || 0,
            adil: post.adil_count || 0,
            comment_count: post.comment_count || 0
          }}
          initialUserReaction={post.my_reaction}
          isOwner={currentUserId === post.user_id}
          onMuzakereClick={onToggle} 
          onTriggerPhysics={triggerPhysics}
        />
      </div>

      {/* --- YORUMLAR --- */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/30 px-4 py-4 animate-in slide-in-from-top-2">
          <CommentSection postId={post.id} postOwnerId={post.user_id} />
        </div>
      )}
    </motion.div>
  );
};

// --- 2. PARÇA: POST LİSTESİ (Ana Motor) ---
export default function PostList({ userId }: { userId?: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [spotlight, setSpotlight] = useState<any>(null); 
  const [loading, setLoading] = useState(true);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      
      // 1. Giriş yapan kullanıcıyı Bul
      const { data: { user } } = await supabase.auth.getUser();
      const cUserId = user?.id || null;
      setCurrentUserId(cUserId);

      // 2. Aktif kullanıcının (BENİM) profil detaylarını çek (Fallback için kritik)
      let currentUserProfile: any = null;
      if (cUserId) {
        const { data } = await supabase
          .from('profiles')
          .select('username, full_name, avatar_url, reputation')
          .eq('id', cUserId)
          .single();
        currentUserProfile = data;
      }

      // 3. (YENİ EKLEME) EĞER BİR PROFİL SAYFASINDAYSAK: O profilin sahibinin bilgilerini de çek!
      // Bu adım, "username"in veritabanı view'ında eksik olması durumunu düzeltir.
      let pageOwnerProfile: any = null;
      if (userId) {
         // Eğer kendi profilimdeysem zaten verim var (currentUserProfile)
         if (userId === cUserId && currentUserProfile) {
             pageOwnerProfile = currentUserProfile;
         } else {
             // Başkasının profili ise onun verisini çek
             const { data } = await supabase
               .from('profiles')
               .select('username, full_name, avatar_url, reputation')
               .eq('id', userId)
               .single();
             pageOwnerProfile = data;
         }
      }

      // --- ORTAK MAPPING FONKSİYONU ---
      const mapToPost = (p: any) => {
        // Post'un sahibi ID'si
        const ownerId = p.author_id || p.user_id;
        const isMine = ownerId === cUserId;
        
        // BUG FIX: Veri kaynağı hiyerarşisi
        // 1. Feed'den gelen hazır author verisi (p.author_username)
        // 2. Eğer profil sayfasındaysak ve post o sayfa sahibine aitse -> pageOwnerProfile
        // 3. Eğer post benimse -> currentUserProfile
        // 4. Post tablosundaki raw veri (p.username)
        
        let finalUsername = p.author_username; // Feed'den geliyorsa bunu al
        let finalFullName = p.author_name;
        let finalAvatar = p.author_avatar;
        let finalReputation = p.author_reputation;

        // Profil Sayfası Garantisi:
        if (userId && pageOwnerProfile && ownerId === userId) {
             finalUsername = pageOwnerProfile.username; // Zorla yaz
             finalFullName = pageOwnerProfile.full_name;
             finalAvatar = pageOwnerProfile.avatar_url;
             finalReputation = pageOwnerProfile.reputation;
        } 
        // Feed veya diğer durumlarda fallback (Kendi postlarım için)
        else if (isMine && currentUserProfile) {
             if (!finalUsername) finalUsername = currentUserProfile.username;
             if (!finalFullName) finalFullName = currentUserProfile.full_name;
             if (!finalAvatar) finalAvatar = currentUserProfile.avatar_url;
             if (finalReputation === undefined) finalReputation = currentUserProfile.reputation;
        }
        
        // En son çare raw veriler
        if (!finalUsername) finalUsername = p.username;
        if (!finalFullName) finalFullName = p.full_name;

        return {
            id: p.id,
            user_id: ownerId, 
            content: p.content,
            created_at: p.created_at,
            
            author_name: finalFullName || "İsimsiz",
            author_username: finalUsername, // <-- ARTIK DOLU OLMALI
            author_reputation: finalReputation || 0,
            author_avatar: finalAvatar || p.avatar_url,

            woow_count: p.woow_count,
            doow_count: p.doow_count,
            adil_count: p.adil_count, 
            comment_count: p.comment_count,
            my_reaction: p.my_reaction, 
            image_url: p.image_url,
            score: p.score
        };
      };

      if (cUserId) {
         if (userId) {
            // A) PROFİL SAYFASI
            const { data } = await supabase
                .from('posts_with_stats') 
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            
            if (data) {
                const mapped = data.map(mapToPost);
                setPosts(mapped as Post[]); 
            }
         } 
         else {
            // B) ANA AKIŞ (FEED)
            try {
                const { posts: smartPosts, spotlight: smartSpotlight } = await fetchFeed(cUserId);
                
                const mapped = smartPosts.map(mapToPost);
                setPosts(mapped as Post[]);
                setSpotlight(smartSpotlight);

            } catch (error) {
                console.error("Feed yüklenirken hata:", error);
            }
         }
      }
      setLoading(false);
    };

    init();
  }, [userId]); 

  if (loading) {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map(i => (
             <div key={i} className="bg-white p-6 rounded-2xl h-48 animate-pulse border border-slate-100 shadow-sm" />
            ))}
        </div>
    );
  }
  
  if (posts.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
        <p className="text-slate-500 font-medium">Henüz paylaşım yok.</p>
        <p className="text-sm text-slate-400 mt-1">Sessizliği bozan ilk kişi sen ol.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Spotlight Alanı (Sadece Ana Sayfada) */}
      {!userId && spotlight && (
        <div className="relative overflow-hidden rounded-xl p-0.5 bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 shadow-lg shadow-amber-500/20 group animate-in fade-in slide-in-from-top-4">
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
            <div className="bg-slate-900 rounded-[10px] p-4 flex items-center gap-4 relative">
                <div className="absolute top-0 right-0 p-4 opacity-20 text-yellow-300 animate-pulse">
                    <PegasusIcon className="w-24 h-24 rotate-12" />
                </div>
                <div className="bg-gradient-to-br from-amber-300 to-yellow-600 p-3 rounded-full text-slate-900 shrink-0 shadow-lg shadow-amber-500/40 z-10">
                    <PegasusIcon className="w-6 h-6" />
                </div>
                <div className="relative z-10">
                    <h4 className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400 font-black text-[11px] uppercase tracking-widest mb-1 flex items-center gap-2">
                        GOLDEN TICKET <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping"/>
                    </h4>
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-slate-900 overflow-hidden border border-yellow-300">
                          {spotlight.avatar_url ? <img src={spotlight.avatar_url} className="w-full h-full object-cover" /> : spotlight.username?.[0]}
                       </div>
                       <p className="text-slate-200 text-sm">
                          <Link href={`/profile/${spotlight.id}`} className="font-bold hover:text-amber-400 transition-colors text-white">
                              @{spotlight.username}
                          </Link> 15 dakikalığına vitrinde!
                       </p>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Post Listesi */}
      {posts.map((post) => (
        <PostItem 
          key={post.id} 
          post={post} 
          currentUserId={currentUserId}
          isExpanded={expandedPostId === post.id}
          onToggle={() => setExpandedPostId(prev => prev === post.id ? null : post.id)}
        />
      ))}
    </div>
  );
}