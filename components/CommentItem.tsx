"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Send, CornerDownRight } from "lucide-react";
import toast from "react-hot-toast";
import ReactionBar from "./ReactionBar";
import { CommentData } from "./CommentSection";

interface CommentItemProps {
  comment: CommentData;
  currentUserId: string | null;
  onReply: (parentId: string, content: string) => Promise<void>;
  depth: number;
}

export default function CommentItem({ comment, currentUserId, onReply, depth }: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyInput, setReplyInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Safety Limit: Max Depth 30
  const MAX_DEPTH = 30;
  const canReply = depth < MAX_DEPTH;

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim()) return;
    
    setIsSubmitting(true);
    await onReply(comment.id, replyInput); // Call parent function
    setIsSubmitting(false);
    setIsReplying(false);
    setReplyInput("");
  };

  return (
    <div className="group animate-in fade-in duration-300">
      {/* The Comment Bubble */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative">
        
        {/* Author & Content */}
        <div className="p-4 pb-2">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-[11px] font-black text-slate-500 uppercase">
                {comment.author_name?.charAt(0) || "?"}
              </div>
              <span className="text-xs font-bold text-slate-800">{comment.author_name}</span>
            </div>
            <span className="text-[10px] text-slate-300 font-medium">
              {new Date(comment.created_at).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-[13px] text-slate-600 leading-relaxed ml-9">
            {comment.content}
          </p>
        </div>

        {/* Reaction Bar */}
        <div className="px-2 pb-1">
          <ReactionBar
            targetType="comment" // Polymorphic Reaction
            targetId={comment.id}
            isOwner={currentUserId === comment.user_id}
            initialCommentCount={comment.reply_count} // Show reply count
            onMuzakereClick={() => {
               if (canReply) {
                 setIsReplying(!isReplying);
               } else {
                 toast("Müzakere derinlik sınırına ulaşıldı.");
               }
            }}
          />
        </div>

        {/* Reply Input Form (Toggled by Müzakere button) */}
        {isReplying && (
          <div className="bg-slate-50 p-3 border-t border-slate-100 animate-in slide-in-from-top-2">
            <form onSubmit={handleReplySubmit} className="flex gap-2 items-center">
              <CornerDownRight size={16} className="text-slate-300 ml-2" />
              <input 
                autoFocus
                type="text" 
                value={replyInput}
                onChange={(e) => setReplyInput(e.target.value)}
                placeholder={`${comment.author_name} kişisine yanıt ver...`}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
              />
              <button 
                type="submit"
                disabled={isSubmitting} 
                className="p-2 bg-slate-800 text-white rounded-lg hover:bg-black transition-colors"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Recursive Children Rendering */}
      {/* Only render container if there are children */}
      {comment.children && comment.children.length > 0 && (
        <div className="relative mt-3">
          {/* Visual Indentation Line */}
          <div className="absolute left-4 top-0 bottom-0 w-[2px] bg-slate-100/80 rounded-full" />
          
          <div className="ml-8 space-y-3">
            {comment.children.map((child) => (
              <CommentItem 
                key={child.id}
                comment={child}
                currentUserId={currentUserId}
                onReply={onReply} // Pass the reply handler down the chain
                depth={depth + 1} // Increment Depth
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}