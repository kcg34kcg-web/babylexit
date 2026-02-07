'use client'

import { useState, useEffect, useOptimistic } from 'react';
import { createClient } from '@/utils/supabase/client';
import { sendMessage, markMessagesAsRead, getMessages } from '@/app/actions/chat';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { toast } from 'sonner';

interface ChatWindowProps {
  conversationId: string;
  initialMessages: any[];
  currentUser: any;
  className?: string; // ✅ YENİ: Dışarıdan stil verebilmek için eklendi
}

export default function ChatWindow({ conversationId, initialMessages, currentUser, className }: ChatWindowProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [page, setPage] = useState(0);
  const supabase = createClient();
  
  // Optimistic UI
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage) => [...state, newMessage]
  );

  // 1. Realtime Abonelik
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `conversation_id=eq.${conversationId}` 
      }, async (payload) => {
        const newMsg = payload.new;
        if (newMsg.sender_id !== currentUser.id) {
            setMessages((prev: any) => [...prev, newMsg]);
            await markMessagesAsRead(conversationId);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, currentUser.id, supabase]);

  // 2. Okundu İşaretleme
  useEffect(() => {
    markMessagesAsRead(conversationId);
  }, [conversationId]);

  // 3. Daha Fazla Yükle
  const loadMore = async () => {
      const nextPage = page + 1;
      try {
          const olderMessages = await getMessages(conversationId, nextPage);
          if (olderMessages.length > 0) {
              setMessages((prev: any) => [...olderMessages, ...prev]);
              setPage(nextPage);
          }
      } catch (error) {
          console.error("Eski mesajlar yüklenemedi", error);
      }
  };

  // 4. Mesaj Gönderme
  const handleSendMessage = async (formData: FormData) => {
    const content = formData.get('content') as string;
    const file = formData.get('file') as File | null;
    
    const tempId = Math.random().toString();
    addOptimisticMessage({
        id: tempId,
        content: content,
        sender_id: currentUser.id,
        created_at: new Date().toISOString(),
        media_url: file ? URL.createObjectURL(file) : null,
        media_type: file ? file.type : null,
        isOptimistic: true,
        is_read: false
    });

    try {
        await sendMessage(formData);
    } catch (e) {
        toast.error("Mesaj gönderilemedi");
    }
  };

  // ✅ DEĞİŞİKLİK: Sabit yükseklik yerine 'h-full' kullanıldı ve className prop'u eklendi.
  // Bu sayede ChatDialog içinde düzgün görünecek.
  return (
    <div className={`flex flex-col h-full bg-slate-950 text-slate-100 relative overflow-hidden ${className}`}>
        {/* Mesaj Listesi */}
        <MessageList 
            messages={optimisticMessages} 
            currentUserId={currentUser.id} 
            onLoadMore={loadMore}
        />

        {/* Girdi Alanı */}
        <ChatInput conversationId={conversationId} onSend={handleSendMessage} />
    </div>
  );
}