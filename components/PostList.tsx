'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import ReactionBar from './ReactionBar';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { MessageCircle } from 'lucide-react';

// Post verisi için Tip Tanımı
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
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Mevcut kullanıcıyı al (isOwner kontrolü için)
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();

    // Postları Çek
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('posts_with_stats') // Oluşturduğumuz SQL View'dan çekiyoruz
        .select('*');

      if (error) {
        console.error('Postlar çekilemedi:', error);
      } else {
        setPosts(data as Post[]);
      }
      setLoading(false);
    };

    fetchPosts();

    // Gerçek Zamanlı Güncelleme (Yeni post gelince listeyi yenile)
    const channel = supabase.channel('realtime_posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center p-8 text-slate-500">
        <p>Henüz kürsüde ses yok. İlk sen ol!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <div key={post.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          
          {/* Header */}
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-lg overflow-hidden">
              {post.author_avatar ? (
                 <img src={post.author_avatar} alt={post.author_name} className="w-full h-full object-cover" />
              ) : (
                 post.author_name?.[0] || "?"
              )}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{post.author_name}</h3>
              <p className="text-xs text-slate-500">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: tr })}
              </p>
            </div>
          </div>

          {/* İçerik */}
          <div className="px-4 pb-2">
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed mb-3">
              {post.content}
            </p>
            
            {/* Varsa Görsel */}
            {post.image_url && (
              <div className="relative w-full h-64 mb-3 rounded-lg overflow-hidden bg-slate-50 border border-slate-100">
                <Image 
                  src={post.image_url} 
                  alt="Post görseli" 
                  fill 
                  className="object-cover"
                />
              </div>
            )}
          </div>

          {/* Alt Bar: Reaksiyonlar */}
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
              onMuzakereClick={() => {
                // Detay sayfasına yönlendirme veya yorumları açma mantığı buraya
                console.log("Müzakere tıklandı:", post.id);
                // Örnek: router.push(`/posts/${post.id}`)
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}