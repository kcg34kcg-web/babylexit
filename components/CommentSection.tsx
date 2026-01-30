"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import ReactionBar from "./ReactionBar";
import { Send } from "lucide-react";
import toast from "react-hot-toast";

interface CommentSectionProps {
  postId: string;
  postOwnerId: string;
}

export default function CommentSection({ postId, postOwnerId }: CommentSectionProps) {
  const supabase = createClient();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Yorumları çekme fonksiyonu
  const fetchComments = useCallback(async () => {
    // Skor (Woow-Doow) farkına göre azalan sırada çekiyoruz
    const { data, error } = await supabase
      .from("comments_with_score")
      .select("*, profiles:user_id ( full_name )")
      .eq("post_id", postId)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) console.error("Yorum çekme hatası:", error);
    setComments(data || []);
  }, [postId, supabase]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      fetchComments();
    };
    init();

    // Realtime: Bu postun yorumları veya o yorumların reaksiyonları değiştiğinde
    const channel = supabase.channel(`sync_comments_${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, fetchComments)
      // Reaksiyon tablosunu dinleyip listeyi güncellemek (score değişimi için) biraz maliyetlidir, 
      // ancak listenin canlı yeniden sıralanması isteniyorsa gereklidir.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, fetchComments) 
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [postId, supabase, fetchComments]);

  const handleSendComment = async () => {
    if (!currentUser) {
        toast.error("Müzakereye katılmak için giriş yapmalısın.");
        return;
    }
    if (!newComment.trim()) return;
    
    // Opsiyonel: Post sahibi kendi postuna yorum yapamaz kuralı (İstekte bu vardı, korunuyor)
    if (currentUser.id === postOwnerId) {
        toast.error("Kendi paylaşımına müzakere başlatamazsın, ancak cevap verebilirsin.");
        // Not: Kullanıcı isteğinde "Kendi paylaşımına müzakere açamazsın" disabled durumu vardı.
        // Eğer cevap hakkı isteniyorsa bu kontrol kaldırılabilir. Mevcut mantığı koruyoruz.
        return;
    }

    setLoading(true);

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: currentUser.id,
      content: newComment
    });

    if (!error) {
      setNewComment("");
      toast.success("Müzakere notun eklendi.");
      fetchComments();
    } else {
        toast.error("Yorum gönderilemedi.");
    }
    setLoading(false);
  };

  const isPostOwner = currentUser?.id === postOwnerId;

  return (
    <div className="pt-4 space-y-5">
      {/* Yorum Yazma Alanı */}
      <div className="flex gap-3 items-end">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={isPostOwner ? "Kendi paylaşımına müzakere açamazsın" : "Müzakereye katıl..."}
          disabled={isPostOwner || loading}
          className="flex-1 bg-white border border-slate-200 rounded-[1.2rem] px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500/50 transition-all disabled:opacity-50 disabled:bg-slate-50 text-slate-700 placeholder:text-slate-400"
          rows={2}
        />
        <button 
          onClick={handleSendComment} 
          disabled={loading || !newComment.trim() || isPostOwner}
          className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-white p-3 rounded-xl transition-all active:scale-90 shadow-md shadow-amber-500/20"
        >
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Send size={18} />}
        </button>
      </div>

      {/* Yorum Listesi */}
      <div className="space-y-4">
        {comments.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-2 italic">Henüz müzakere başlatılmamış.</p>
        )}
        {comments.map((comment) => {
          const isCommentOwner = currentUser?.id === comment.user_id;

          return (
            <div key={comment.id} className="bg-white border border-slate-100 rounded-[1.5rem] p-4 shadow-sm transition-all duration-300 hover:border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                    {comment.profiles?.full_name?.charAt(0) || "M"}
                  </div>
                  <span className="font-bold text-slate-800 text-xs">
                    {comment.profiles?.full_name || "Meslektaş"}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 font-medium">
                  {new Date(comment.created_at).toLocaleDateString("tr-TR", { day: 'numeric', month: 'short' })}
                </span>
              </div>
              
              <p className="text-slate-600 text-[13px] leading-relaxed mb-3 px-1">
                {comment.content}
              </p>

              {/* Yorumlar için ReactionBar */}
              <ReactionBar
                targetType="comment"
                targetId={comment.id}
                isOwner={isCommentOwner}
                // Yorum içinde yorum (nested) olmadığı için onMuzakereClick sadece sayaç arttırır (ReactionBar içinde handle edilir)
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}a