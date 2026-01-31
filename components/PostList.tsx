'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import ReactionBar from './ReactionBar';
import CommentSection from './CommentSection';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

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
}

// --- PostItem Bileşeni (Aynı kalıyor, sadece import kolaylığı için buraya ekliyorum) ---
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
  
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  
  const MAX_LENGTH = 280;
  const isTooLong = post.content.length > MAX_LENGTH;
  const displayContent = isTooLong && !isContentExpanded
    ? post.content.slice(0, MAX_LENGTH) + "..." 
    : post.content;

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
    <div ref={cardRef} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={goToFullView}>
        <div 
          className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold overflow-hidden transition-transform hover:scale-105"
          onClick={goToProfile}
        >
          {post.author_avatar ? <img src={post.author_avatar} alt="" className="w-full h-full object-cover" /> : post.author_name?.[0]}
        </div>
        <div>
          <h3 
            className="font-semibold text-slate-900 hover:underline hover:text-purple-600 transition-colors"
            onClick={goToProfile}
          >
            {post.author_name}
          </h3>
          <p className="text-xs text-slate-500">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: tr })}</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-2">
        <p className="text-slate-700 whitespace-pre-wrap mb-3 leading-relaxed">
          {displayContent}
          {isTooLong && !isContentExpanded && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsContentExpanded(true);
              }}
              className="text-purple-600 font-medium hover:underline ml-1 inline-block"
            >
              Devamını gör
            </button>
          )}
        </p>

        {post.image_url && (
          <div 
            className="relative w-full h-64 mb-3 rounded-lg overflow-hidden border border-slate-100 cursor-pointer"
            onClick={goToFullView}
          >
            <Image src={post.image_url} alt="Post" fill className="object-cover" />
          </div>
        )}
      </div>

      {/* Footer */}
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

      {/* Comments */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/30 px-4 py-4 animate-in slide-in-from-top-2">
          <CommentSection postId={post.id} postOwnerId={post.user_id} />
        </div>
      )}
    </div>
  );
};

// --- GÜNCELLENEN POSTLIST: userId Prop'u Eklendi ---
export default function PostList({ userId }: { userId?: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();

    const fetchPosts = async () => {
      // Dinamik Sorgu Oluşturma
      let query = supabase.from('posts_with_stats').select('*');
      
      // Eğer userId varsa (Profil sayfası), sadece o kullanıcının postlarını getir
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Postlar çekilemedi:', error);
      } else {
        setPosts(data as Post[]);
      }
      setLoading(false);
    };

    fetchPosts();

    // Realtime sadece genel feed için mantıklı olabilir veya profil için de filtrelenebilir
    // Şimdilik basitlik adına genel bırakıyoruz, production'da optimize edilebilir.
    const channel = supabase.channel('realtime_posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, fetchPosts)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]); // userId değişirse tekrar çek

  if (loading) return <div className="p-8 text-center text-slate-400">Yükleniyor...</div>;
  
  if (posts.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
        <p className="text-slate-500 font-medium">Henüz paylaşım yok.</p>
        {userId && <p className="text-sm text-slate-400 mt-1">Bu kullanıcı sessizliğini koruyor.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
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