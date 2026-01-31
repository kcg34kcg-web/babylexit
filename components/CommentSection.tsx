'use client';

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { Send } from "lucide-react";
import toast from "react-hot-toast";
import CommentItem from "./CommentItem";
import { FlatComment } from "@/app/types";
import { buildCommentTree } from "@/utils/commentTree";

interface CommentSectionProps {
  postId: string;
  postOwnerId: string;
}

export default function CommentSection({ postId, postOwnerId }: CommentSectionProps) {
  const supabase = createClient();
  
  const [flatComments, setFlatComments] = useState<FlatComment[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 1. Veri Çekme
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Veriyi yeni view'dan çekiyoruz (Score var)
      const { data, error } = await supabase
        .from("comments_with_stats")
        .select("*")
        .eq("post_id", postId)
        .limit(1000); // Makul bir sınır

      if (error) {
        console.error(error);
        return;
      }

      setFlatComments(data as FlatComment[]);
    };

    init();

    // Realtime Dinleme (Yorum gelince güncelle)
    const channel = supabase.channel(`comments_section:${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, init)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [postId, supabase]);

  // 2. Tree Builder (Sıralama mantığı utils içinde yapılıyor)
  const commentTree = useMemo(() => {
    return buildCommentTree(flatComments);
  }, [flatComments]);

  // 3. Ana Yorum Gönderme (Posta Yorum)
  const handleMainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentUserId) return;
    
    // Optimistic Update için geçici obje oluşturabiliriz ama
    // karmaşıklığı artırmamak için Realtime'a güveniyoruz.
    setSubmitting(true);

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: currentUserId,
      content: input,
      parent_id: null
    });

    setSubmitting(false);
    if (error) {
      toast.error("Hata oluştu");
    } else {
      setInput("");
      toast.success("Müzakere başlatıldı!");
    }
  };

  // 4. Yanıt Gönderme (Çocuklardan gelen istek)
  const handleReplySubmit = async (parentId: string, content: string) => {
    if (!currentUserId) return;

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: currentUserId,
      content: content,
      parent_id: parentId
    });

    if (error) {
      throw error; // Hatayı CommentItem yakalasın
    }
  };

  return (
    <div className="mt-2 space-y-8">
      
      {/* ANA GİRİŞ ALANI (Postun Altındaki İlk Input) */}
      {currentUserId && (
        <form onSubmit={handleMainSubmit} className="relative flex items-center mb-6">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Müzakereyi başlat..."
            disabled={submitting}
            className="w-full bg-white border border-slate-200 rounded-full py-3 pl-5 pr-12 text-sm text-slate-700 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 shadow-sm transition-all"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || submitting}
            className="absolute right-2 p-2 text-white bg-slate-900 rounded-full hover:bg-black disabled:opacity-50 transition-colors shadow-md"
          >
            <Send size={16} />
          </button>
        </form>
      )}

      {/* YORUM AĞACI */}
      <div className="space-y-6">
        {commentTree.map((rootNode) => (
          <CommentItem 
            key={rootNode.id} 
            node={rootNode}
            currentUserId={currentUserId}
            onReply={handleReplySubmit}
            depth={0} 
          />
        ))}

        {commentTree.length === 0 && (
           <p className="text-slate-400 text-center text-xs py-2 italic">
             Henüz ses yok. İlk sen ol.
           </p>
        )}
      </div>
    </div>
  );
}