'use client';

import { useState, useEffect } from "react";
import { getDailyDebate, getDebateComments, postDebateComment, voteDailyDebate } from "@/app/actions/debate";
import { toast } from "react-hot-toast";

// Az önce oluşturduğumuz alt bileşenleri çağırıyoruz
import DebateVotingView from "./debate/DebateVotingView";
import DebateResultsView from "./debate/DebateResultsView";

export default function DebateTab() {
  const [debate, setDebate] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Kullanıcı Etkileşim State'leri
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [voting, setVoting] = useState(false);

  // Sayfa açılınca verileri çek
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getDailyDebate();
      if (data) {
        setDebate(data);
        const coms = await getDebateComments(data.id);
        setComments(coms);
      }
    } catch (error) {
      console.error("Veri çekme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  // 1. OY VERME FONKSİYONU
  const handleVote = async (choice: 'A' | 'B') => {
    if (voting) return;
    setVoting(true);

    const res = await voteDailyDebate(debate.id, choice);
    
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Oyunuz kaydedildi! Tartışmaya hoş geldiniz.");
      // Veriyi tazeleyip sonuç ekranını aç (state güncellenecek)
      await loadData();
    }
    setVoting(false);
  };

  // 2. YORUM GÖNDERME FONKSİYONU
  const handleSendComment = async (side: 'A' | 'B', text: string) => {
    if (!text.trim()) return;
    
    setSending(true);
    const res = await postDebateComment(debate.id, text, side);
    
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Görüşünüz paylaşıldı!");
      setCommentText(""); // Input'u temizle
      
      // Yorumları güncelle ki listeye hemen düşsün
      const newComments = await getDebateComments(debate.id);
      setComments(newComments);
    }
    setSending(false);
  };

  // --- RENDER MANTIĞI ---

  // A) Yükleniyor Ekranı
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
       <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin"></div>
       <p className="text-slate-400 text-sm animate-pulse">Arena hazırlanıyor...</p>
    </div>
  );

  // B) Veri Yoksa Hata Ekranı
  if (!debate) return (
    <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-slate-300">
      <p className="text-slate-500 font-medium">Bugün için aktif bir tartışma bulunamadı.</p>
      <p className="text-xs text-slate-400 mt-2">Yarın tekrar kontrol et!</p>
    </div>
  );

  // C) Henüz Oy Vermediyse -> SEÇİM EKRANI
  if (!debate.userVote) {
    return (
      <DebateVotingView 
        topic={debate.topic}
        optionA={debate.option_a}
        optionB={debate.option_b}
        onVote={handleVote}
        isVoting={voting}
      />
    );
  }

  // D) Oy Verdiyse -> SONUÇLAR VE TARTIŞMA EKRANI
  return (
    <DebateResultsView 
      debate={debate}
      commentsA={comments.filter(c => c.side === 'A')}
      commentsB={comments.filter(c => c.side === 'B')}
      handleSendComment={handleSendComment}
      commentText={commentText}
      setCommentText={setCommentText}
      sending={sending}
    />
  );
}