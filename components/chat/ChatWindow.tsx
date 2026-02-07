'use client'

import { useState, useEffect, useOptimistic, startTransition } from 'react';
import { createClient } from '@/utils/supabase/client';
import { sendMessage, markMessagesAsRead, getMessages } from '@/app/actions/chat';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { toast } from 'sonner';

interface ChatWindowProps {
  conversationId: string;
  initialMessages: any[];
  currentUser: any;
  className?: string;
}

export default function ChatWindow({ conversationId, initialMessages, currentUser, className }: ChatWindowProps) {
  // Mesajları state'de tut (en eski en üstte, en yeni en altta)
  const [messages, setMessages] = useState(initialMessages);
  const [page, setPage] = useState(0);
  const supabase = createClient();
  
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage) => [...state, newMessage] // ✅ Yeni mesajı sona ekle
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
        // Eğer mesaj başkasından geldiyse state'e ekle
        if (newMsg.sender_id !== currentUser.id) {
            setMessages((prev: any) => [...prev, newMsg]); // ✅ Sona ekle
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

  // 3. Daha Fazla Mesaj Yükle (Yukarı kaydırınca)
  const loadMore = async () => {
      const nextPage = page + 1;
      try {
          const olderMessages = await getMessages(conversationId, nextPage);
          if (olderMessages.length > 0) {
              setMessages((prev: any) => [...olderMessages, ...prev]); // ✅ Eskileri başa ekle
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
    
    if (!content && (!file || file.size === 0)) return;

    // Optimistic Mesaj Objesi
    const tempId = Math.random().toString();
    const optimisticMsg = {
        id: tempId,
        content: content,
        sender_id: currentUser.id,
        created_at: new Date().toISOString(),
        media_url: file && file.size > 0 ? URL.createObjectURL(file) : null,
        media_type: file && file.size > 0 ? file.type.split('/')[0] : null,
        isOptimistic: true,
        is_read: false
    };

    // ✅ startTransition hatayı çözer
    startTransition(() => {
        addOptimisticMessage(optimisticMsg);
    });

    try {
        const actualMessage = await sendMessage(formData);
        if (actualMessage) {
            // ✅ Sunucudan gelen gerçek mesajı kalıcı state'e ekle
            setMessages((prev) => [...prev, actualMessage]);
        }
    } catch (e) {
        console.error(e);
        toast.error("Mesaj gönderilemedi");
    }
  };

  return (
    // ✅ bg-white ile tam beyaz arka plan
    <div className={`flex flex-col h-full bg-white text-slate-900 relative overflow-hidden ${className}`}>
        {/* Mesaj Listesi */}
        <MessageList 
            messages={optimisticMessages} 
            currentUserId={currentUser.id} 
            onLoadMore={loadMore}
        />

        {/* Girdi Alanı */}
        <div className="border-t border-slate-100 bg-white">
            <ChatInput conversationId={conversationId} onSend={handleSendMessage} />
        </div>
    </div>
  );
}