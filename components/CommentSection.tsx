"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client"; // Eğer bu çalışmazsa "@/app/utils/supabase/client" dene
import { Send } from "lucide-react";
import toast from "react-hot-toast";

// 👇 DÜZELTİLMİŞ İMPORTLAR (Mutlak Yol Kullanıyoruz)
// Dosyaları app klasörü altına taşıdığımızı varsayıyoruz:

import CommentItem from "./CommentItem"; 
import { FlatComment } from "@/app/types"; // Dosya artık app/types.ts
import { buildCommentTree } from "@/utils/commentTree"; // Dosya app/utils/commentTree.ts

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

      const { data, error } = await supabase
        .from("comments_with_stats")
        .select("*")
        .eq("post_id", postId)
        .order('created_at', { ascending: true }) 
        .range(0, 2000); 

      if (error) {
        console.error(error);
        return;
      }

      setFlatComments(data as FlatComment[]);
    };

    init();

    const channel = supabase.channel(`comments_section:${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, init)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_reactions' }, init)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [postId, supabase]);

  // 2. Ağaç Yapısı (Memoized)
  const commentTree = useMemo(() => {
    // Import hatası düzelince burası otomatik olarak doğru tipi döndürecek
    return buildCommentTree(flatComments);
  }, [flatComments]);

  // 3. Ana Yorum Gönderme
  const handleMainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentUserId) return;
    if (currentUserId === postOwnerId) return toast.error("Kendi gönderinize müzakere başlatamazsınız.");

    const tempId = crypto.randomUUID();
    
    // Optimistic Update
    const tempComment: FlatComment = {
      id: tempId,
      post_id: postId,
      parent_id: null,
      content: input,
      created_at: new Date().toISOString(),
      user_id: currentUserId,
      author_name: "Ben", 
      author_avatar: "",
      woow_count: 0, doow_count: 0, adil_count: 0,
      my_reaction: null
    };

    setFlatComments(prev => [tempComment, ...prev]);
    setInput("");
    setSubmitting(true);

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: currentUserId,
      content: tempComment.content,
      parent_id: null
    });

    setSubmitting(false);
    if (error) {
      toast.error("Hata oluştu");
      setFlatComments(prev => prev.filter(c => c.id !== tempId)); 
    }
  };

  // 4. Yanıt Gönderme
  const handleReplySubmit = async (parentId: string, content: string) => {
    if (!currentUserId) return;

    const tempId = crypto.randomUUID();
    
    const tempComment: FlatComment = {
      id: tempId,
      post_id: postId,
      parent_id: parentId,
      content: content,
      created_at: new Date().toISOString(),
      user_id: currentUserId,
      author_name: "Ben",
      author_avatar: "",
      woow_count: 0, doow_count: 0, adil_count: 0,
      my_reaction: null
    };

    setFlatComments(prev => [...prev, tempComment]);

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: currentUserId,
      content: content,
      parent_id: parentId
    });

    if (error) {
      toast.error("Yanıt gönderilemedi");
      setFlatComments(prev => prev.filter(c => c.id !== tempId));
    }
  };

  return (
    <div className="mt-4 space-y-6">
      {/* Ana Input Formu */}
      {currentUserId && currentUserId !== postOwnerId && (
        <form onSubmit={handleMainSubmit} className="relative flex items-center mb-6">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Müzakereye katıl..."
            disabled={submitting}
            className="w-full bg-white border border-slate-200 rounded-full py-3 pl-5 pr-12 text-sm text-slate-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-sm"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || submitting}
            className="absolute right-2 p-2 text-white bg-amber-500 rounded-full hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
      )}

      {/* Yorum Listesi */}
      <div className="space-y-4">
        {/* rootNode hatasını çözmek için burada tip belirtmeye gerek kalmamalı ama garanti olsun: */}
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
           <p className="text-gray-500 text-center text-sm py-4">
             Henüz müzakere yok. İlk yorumu sen yap!
           </p>
        )}
      </div>
    </div>
  );
}