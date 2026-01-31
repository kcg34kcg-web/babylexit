"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { Send } from "lucide-react";
import toast from "react-hot-toast";
import CommentItem from "./CommentItem";

// Define the Data Structure
export type CommentData = {
  id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  user_id: string;
  author_name: string;
  author_avatar: string;
  woow_count: number;
  doow_count: number;
  adil_count: number;
  reply_count: number;
  my_reaction?: "woow" | "doow" | "adil" | null;
  children?: CommentData[]; // For the Tree structure
};

interface CommentSectionProps {
  postId: string;
  postOwnerId: string;
}

export default function CommentSection({ postId, postOwnerId }: CommentSectionProps) {
  const supabase = createClient();
  const [flatComments, setFlatComments] = useState<CommentData[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch Data
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      const { data, error } = await supabase
        .from("comments_with_stats")
        .select("*")
        .eq("post_id", postId);

      if (error) return console.error(error);

      // Load User's reactions
      let finalData = data as CommentData[];
      if (user) {
        const { data: myReactions } = await supabase
          .from("comment_reactions")
          .select("comment_id, reaction_type")
          .eq("user_id", user.id)
          .in("comment_id", data.map(c => c.id));

        finalData = data.map(c => ({
          ...c,
          my_reaction: myReactions?.find(r => r.comment_id === c.id)?.reaction_type as any
        }));
      }

      setFlatComments(finalData);
    };

    init();

    // Realtime Listener
    const channel = supabase.channel(`comments_section:${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, init)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_reactions' }, init)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [postId, supabase]);

  // 2. Tree Builder (Recursive Logic)
  // We use useMemo to rebuild the tree whenever the flat list changes.
  const commentTree = useMemo(() => {
    const buildTree = (comments: CommentData[], parentId: string | null = null): CommentData[] => {
      return comments
        .filter(comment => comment.parent_id === parentId)
        .map(comment => ({
          ...comment,
          children: buildTree(comments, comment.id) // Recursion
        }))
        .sort((a, b) => {
          // Sorting Rule: (Woow - Doow) Descending, then Newest
          const scoreA = (a.woow_count || 0) - (a.doow_count || 0);
          const scoreB = (b.woow_count || 0) - (b.doow_count || 0);
          if (scoreA !== scoreB) return scoreB - scoreA;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    };
    return buildTree(flatComments, null); // Start with root comments (parent_id: null)
  }, [flatComments]);

  // 3. Main Comment Submit
  const handleMainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentUserId) return;
    if (currentUserId === postOwnerId) return toast.error("Kendi gönderinize müzakere başlatamazsınız.");

    const tempId = crypto.randomUUID();
    const tempComment: CommentData = {
      id: tempId,
      parent_id: null,
      content: input,
      created_at: new Date().toISOString(),
      user_id: currentUserId,
      author_name: "Ben",
      author_avatar: "",
      woow_count: 0, doow_count: 0, adil_count: 0, reply_count: 0,
      children: []
    };

    setFlatComments(prev => [tempComment, ...prev]); // Optimistic
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
      setFlatComments(prev => prev.filter(c => c.id !== tempId)); // Rollback
    }
  };

  // 4. Reply Handler (Passed down to children)
  const handleReplySubmit = async (parentId: string, content: string) => {
    if (!currentUserId) return;

    const tempId = crypto.randomUUID();
    const tempComment: CommentData = {
      id: tempId,
      parent_id: parentId,
      content: content,
      created_at: new Date().toISOString(),
      user_id: currentUserId,
      author_name: "Ben",
      author_avatar: "",
      woow_count: 0, doow_count: 0, adil_count: 0, reply_count: 0,
      children: []
    };

    setFlatComments(prev => [...prev, tempComment]); // Optimistic Add

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
      {/* Main Input */}
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

      {/* Recursive List */}
      <div className="space-y-4">
        {commentTree.map((comment) => (
          <CommentItem 
            key={comment.id} 
            comment={comment} 
            currentUserId={currentUserId}
            onReply={handleReplySubmit}
            depth={0} // Start at Depth 0
          />
        ))}
      </div>
    </div>
  );
}