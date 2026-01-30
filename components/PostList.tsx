"use client";

import { motion } from "framer-motion";
import {
  Scale,
  ThumbsDown,
  Flame,
  MessageSquare
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import ReactionBar from "./ReactionBar";
import CommentSection from "./CommentSection";

// --- ÖZEL EFEKT TANIMLARI (İYİLEŞTİRİLDİ) ---
const animations = {
  woow: { 
    clicked: { scale: [1, 1.8, 1], rotate: [0, 25, -25, 0], transition: { duration: 0.5 } },
    active: { scale: 1.1, boxShadow: "0 0 20px rgba(251, 191, 36, 0.4)" }
  },
  doow: { 
    clicked: { scale: [1, 1.3, 1], y: [0, 15, 0], transition: { duration: 0.3 } },
    active: { scale: 1.1, boxShadow: "0 0 20px rgba(239, 68, 68, 0.4)" }
  },
  adil: { 
    clicked: { rotate: [0, -40, 40, -20, 20, 0], transition: { duration: 0.7 } },
    active: { scale: 1.1, boxShadow: "0 0 20px rgba(59, 130, 246, 0.4)" }
  },
};

export default function PostList() {
  const supabase = createClient();
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openCommentSections, setOpenCommentSections] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data, error } = await supabase
        .from("posts_with_score")
        .select(`
          *,
          profiles:user_id ( full_name, avatar_url )
        `)
        .order("score", { ascending: false });

      if (!error) {
        setPosts(data || []);
      }
      setLoading(false);
    };
    init();

    const channel = supabase.channel('posts_reactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, init)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, init)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const toggleComments = (postId: string) => {
    setOpenCommentSections(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  if (loading) return <div className="text-center py-10 text-slate-400 text-xs tracking-widest font-bold uppercase">Kürsü Hazırlanıyor...</div>;

  return (
    <div className="space-y-6">
      {posts.map((post) => {
        const isOwner = currentUser?.id === post.user_id;

        return (
          <div key={post.id} className="bg-white border border-slate-200/60 rounded-[2rem] overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-slate-300/50">
           
            {/* ÜST KISIM: Profil Bilgisi */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center text-sm font-bold shadow-md text-white uppercase">
                  {post.profiles?.full_name?.charAt(0) || "B"}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{post.profiles?.full_name || "Meslektaş"}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold font-sans">#{post.category || "Genel"}</p>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-medium italic">
                {new Date(post.created_at).toLocaleDateString("tr-TR")}
              </span>
            </div>

            {/* İÇERİK: Mesaj ve Varsa Resim */}
            <div className="p-5 space-y-4">
              <p className="text-slate-700 text-[15px] leading-relaxed whitespace-pre-wrap font-normal">
                {post.content}
              </p>
             
              {post.image_url && (
                <div className="relative w-full h-72 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shadow-inner">
                  <Image
                    src={post.image_url}
                    alt="Analiz Görseli"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>

            {/* Reaksiyon Bar */}
            <ReactionBar
              targetType="post"
              targetId={post.id}
              isOwner={isOwner}
              onMuzakereClick={() => toggleComments(post.id)}
            />

            {/* Yorum bölümü (Müzakere butonu ile açılır) */}
            {openCommentSections[post.id] && (
              <div className="border-t border-slate-100/30 px-5 pb-5">
                <CommentSection postId={post.id} postOwnerId={post.user_id} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}