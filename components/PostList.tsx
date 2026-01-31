'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import ReactionBar from './ReactionBar';
import CommentSection from './CommentSection'; // 👇 Yorum bileşenini geri çağırdık
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

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

export default function PostList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 👇 Hangi postun yorumlarının açık olduğunu tutan state
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
      const { data, error } = await supabase
        .from('posts_with_stats')
        .select('*');

      if (error) {
        console.error('Postlar çekilemedi:', error);
      } else {
        setPosts(data as Post[]);
      }
      setLoading(false);
    };

    fetchPosts();

    const channel = supabase.channel('realtime_posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 👇 Yorumları açıp kapatan fonksiyon (Toggle)
  const handleToggleComments = (postId: string) => {
    setExpandedPostId(prev => prev === postId ? null : postId);
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Yükleniyor...</div>;
  if (posts.length === 0) return <div className="p-8 text-center text-slate-500">Kürsüde henüz ses yok.</div>;

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <div key={post.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          
          {/* Header */}
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold overflow-hidden">
              {post.author_avatar ? <img src={post.author_avatar} alt="" className="w-full h-full object-cover" /> : post.author_name?.[0]}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{post.author_name}</h3>
              <p className="text-xs text-slate-500">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: tr })}</p>
            </div>
          </div>

          {/* İçerik */}
          <div className="px-4 pb-2">
            <p className="text-slate-700 whitespace-pre-wrap mb-3">{post.content}</p>
            {post.image_url && (
              <div className="relative w-full h-64 mb-3 rounded-lg overflow-hidden border border-slate-100">
                <Image src={post.image_url} alt="Post" fill className="object-cover" />
              </div>
            )}
          </div>

          {/* Reaksiyon Barı */}
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
              
              // 👇 DÜZELTİLDİ: Yönlendirme yok, Yorumları Aç/Kapa var.
              onMuzakereClick={() => handleToggleComments(post.id)}
            />
          </div>

          {/* 👇 Yorum Alanı (Sadece buton tıklandıysa açılır) */}
          {expandedPostId === post.id && (
            <div className="border-t border-slate-100 bg-slate-50/30 px-4 py-4 animate-in slide-in-from-top-2">
              <CommentSection postId={post.id} postOwnerId={post.user_id} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}