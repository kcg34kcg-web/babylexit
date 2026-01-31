'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import ReactionBar from './ReactionBar';
import CommentSection from './CommentSection';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { Sparkles, TrendingUp } from 'lucide-react'; 
import Link from 'next/link';

// YENİ ÖZELLİKLER:
import { fetchFeed } from '@/app/actions/feed'; // Algoritma
import WiltedRoseMenu from './WiltedRoseMenu';  // Menü

// Tip Tanımları
interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  author_name: string;
  author_avatar: string;
  woow_count: number;
  doow_count: number;
  adil_count: number;
  comment_count: number;
  my_reaction: 'woow' | 'doow' | 'adil' | null;
  score?: number; // Algoritma puanı
}

// --- 1. PARÇA: POST KARTI (Eski PostItem + Yeni Menü) ---
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
  
  // YENİ: Kartı gizlemek için state
  const [isVisible, setIsVisible] = useState(true);
  
  // ESKİ: İçerik genişletme state'i
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  
  const MAX_LENGTH = 280;
  const isTooLong = post.content.length > MAX_LENGTH;
  const displayContent = isTooLong && !isContentExpanded
    ? post.content.slice(0, MAX_LENGTH) + "..." 
    : post.content;

  // Eğer kullanıcı "İlgilenmiyorum" dediyse kartı DOM'dan sil
  if (!isVisible) return null;

  // ESKİ: Görünürlük izleme (Okundu bilgisi için)
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
    <div ref={cardRef} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow relative group animate-in fade-in slide-in-from-bottom-4">
      
      {/* --- HEADER --- */}
      <div className="p-4 flex items-center justify-between">
        {/* Sol Taraf: Avatar ve İsim */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={goToFullView}>
            <div 
              className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold overflow-hidden border border-slate-100 transition-transform hover:scale-105"
              onClick={goToProfile}
            >
              {post.author_avatar ? (
                <Image src={post.author_avatar} alt="" width={40} height={40} className="object-cover w-full h-full" />
              ) : (
                post.author_name?.[0] || '?'
              )}
            </div>
            <div>
              <h3 
                  className="font-semibold text-slate-900 hover:underline hover:text-amber-600 transition-colors"
                  onClick={goToProfile}
              >
                  {post.author_name || "Gizli Üye"}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                 <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: tr })}</span>
                 {/* Debug için skoru göstermek isterseniz açabilirsiniz */}
                 {/* {post.score && <span className="text-slate-300">• Skor: {post.score.toFixed(1)}</span>} */}
              </div>
            </div>
        </div>

        {/* Sağ Taraf: YENİ WILTED ROSE MENÜSÜ */}
        {/* Mobilde görünür, Masaüstünde hover olunca görünür */}
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

      {/* --- FOOTER: Reaksiyon Barı --- */}
      <div className="px-4 pb-4 border-t border-slate-50 pt-2 bg-slate-50/50">
        <ReactionBar 
          targetId={post.id}
          targetType="post"
          initialCounts={{
            woow: post.woow_count,
            doow: post.doow_count,
            adil: post.adil_count,
            comment_count: post.comment_count
          }}
          initialUserReaction={post.my_reaction}
          isOwner={currentUserId === post.user_id}
          onMuzakereClick={onToggle} 
        />
      </div>

      {/* --- YORUMLAR (Açılır/Kapanır) --- */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/30 px-4 py-4 animate-in slide-in-from-top-2">
          <CommentSection postId={post.id} postOwnerId={post.user_id} />
        </div>
      )}
    </div>
  );
};

// --- 2. PARÇA: POST LİSTESİ (Ana Motor) ---
export default function PostList({ userId }: { userId?: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [spotlight, setSpotlight] = useState<any>(null); // YENİ: Spotlight verisi
  const [loading, setLoading] = useState(true);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      
      // 1. Aktif Kullanıcıyı Bul
      const { data: { user } } = await supabase.auth.getUser();
      const cUserId = user?.id || null;
      setCurrentUserId(cUserId);

      // 2. VERİ ÇEKME İŞLEMİ
      if (cUserId) {
         
         // A) Eğer profil sayfasındaysak (userId var), sadece o kişinin postlarını çek (ESKİ YÖNTEM)
         if (userId) {
            const { data } = await supabase
                .from('posts_with_stats') // View adınızın bu olduğunu varsayıyorum
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            
            if (data) setPosts(data as any[]); 
         } 
         
         // B) Eğer ana sayfadaysak (userId yok), YENİ AKILLI ALGORİTMAYI kullan
         else {
            try {
                // Server Action çağrısı
                const { posts: smartPosts, spotlight: smartSpotlight } = await fetchFeed(cUserId);
                
                // Gelen veriyi arayüz tipine dönüştür (Mapping)
                const mappedPosts = smartPosts.map((p: any) => ({
                    id: p.id,
                    user_id: p.author_id, // SQL'den author_id geliyor olabilir
                    content: p.content,
                    created_at: p.created_at,
                    author_name: p.author_username || p.username || "Gizli Üye",
                    author_avatar: p.author_avatar,
                    woow_count: p.woow_count,
                    doow_count: p.doow_count,
                    adil_count: 0, 
                    comment_count: 0,
                    my_reaction: null, // İlk yüklemede boş
                    image_url: p.image_url,
                    score: p.score
                }));
                
                setPosts(mappedPosts as Post[]);
                setSpotlight(smartSpotlight);

            } catch (error) {
                console.error("Feed yüklenirken hata:", error);
                // Hata olursa boş liste göster, uygulama çökmesin
            }
         }
      }
      setLoading(false);
    };

    init();
  }, [userId]); 

  // Yükleniyor Durumu (Skeleton Loader)
  if (loading) {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map(i => (
             <div key={i} className="bg-white p-6 rounded-2xl h-48 animate-pulse border border-slate-100 shadow-sm" />
            ))}
        </div>
    );
  }
  
  // Hiç Post Yoksa
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
      
      {/* --- YENİ: SPOTLIGHT (ALTIN BİLET) ALANI --- */}
      {/* Sadece ana akışta (userId yoksa) ve spotlight verisi varsa göster */}
      {!userId && spotlight && (
        <div className="bg-gradient-to-r from-purple-900 to-slate-900 border border-purple-500/30 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group shadow-lg shadow-purple-900/20 animate-in fade-in slide-in-from-top-4">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles size={100} />
            </div>
            <div className="bg-purple-500/20 p-3 rounded-full text-purple-400 shrink-0">
                <Sparkles size={24} />
            </div>
            <div className="relative z-10">
                <h4 className="text-purple-300 font-bold text-[10px] uppercase tracking-wider mb-1">
                    Spotlight: 15 Dakikanın Yıldızı
                </h4>
                <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white overflow-hidden border border-purple-400">
                      {spotlight.avatar_url ? <img src={spotlight.avatar_url} className="w-full h-full object-cover" /> : spotlight.username?.[0]}
                   </div>
                   <p className="text-white text-sm">
                      <Link href={`/profile/${spotlight.id}`} className="font-bold hover:underline text-purple-200">
                          @{spotlight.username}
                      </Link> profili şu an vitrinde!
                   </p>
                </div>
            </div>
        </div>
      )}

      {/* --- POST LİSTESİ --- */}
      {posts.map((post) => (
        <PostItem 
          key={post.id} 
          post={post} 
          currentUserId={currentUserId}
          // Yorum bölümünü açıp kapatma mantığı (Accordion)
          isExpanded={expandedPostId === post.id}
          onToggle={() => setExpandedPostId(prev => prev === post.id ? null : post.id)}
        />
      ))}
    </div>
  );
}