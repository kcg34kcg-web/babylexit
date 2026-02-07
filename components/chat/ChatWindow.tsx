'use client'

import { useState, useEffect, useOptimistic } from 'react';
import { createClient } from '@/utils/supabase/client';
import { sendMessage, markMessagesAsRead, getMessages } from '@/app/actions/chat'; // Server action yollarını kontrol et
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { toast } from 'sonner';

interface ChatWindowProps {
  conversationId: string;
  initialMessages: any[];
  currentUser: any;
}

export default function ChatWindow({ conversationId, initialMessages, currentUser }: ChatWindowProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [page, setPage] = useState(0);
  const supabase = createClient();
  
  // Optimistic UI: Mesaj gönderildiğinde sunucu cevabını beklemeden ekranda göster
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage) => [...state, newMessage]
  );

  // 1. Realtime Abonelik (Anlık Mesajlaşma)
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
        
        // Eğer mesajı başkası attıysa listeye ekle
        // (Kendi attıklarımızı zaten optimistic veya action cevabıyla yönetiyoruz)
        if (newMsg.sender_id !== currentUser.id) {
            // Güvenlik için Signed URL almamız gerekebilir,
            // ancak anlık hız için önce ekleyip sonra arka planda güncelleyebiliriz
            // Şimdilik doğrudan ekliyoruz:
            setMessages((prev: any) => [...prev, newMsg]);
            
            // "Ghost" Notification Fix: Mesajı gördüğümüz an okundu işaretle
            await markMessagesAsRead(conversationId);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, currentUser.id, supabase]);

  // 2. Sayfa açıldığında "Okundu" olarak işaretle
  useEffect(() => {
    markMessagesAsRead(conversationId);
  }, [conversationId]);

  // 3. Daha Fazla Mesaj Yükle (Infinite Scroll Up)
  const loadMore = async () => {
      const nextPage = page + 1;
      try {
          // Server Action'dan eski mesajları çek
          const olderMessages = await getMessages(conversationId, nextPage);
          if (olderMessages.length > 0) {
              setMessages((prev: any) => [...olderMessages, ...prev]);
              setPage(nextPage);
          }
      } catch (error) {
          console.error("Eski mesajlar yüklenemedi", error);
      }
  };

  // 4. Mesaj Gönderme İşleyicisi
  const handleSendMessage = async (formData: FormData) => {
    const content = formData.get('content') as string;
    const file = formData.get('file') as File | null;
    
    // Optimistic Ekleme (Anında UI tepkisi)
    const tempId = Math.random().toString();
    addOptimisticMessage({
        id: tempId,
        content: content,
        sender_id: currentUser.id,
        created_at: new Date().toISOString(),
        media_url: file ? URL.createObjectURL(file) : null, // Geçici önizleme
        media_type: file ? file.type : null,
        isOptimistic: true,
        is_read: false
    });

    try {
        await sendMessage(formData);
        // Not: Gerçek veriyi tekrar fetch etmeye gerek yok, 
        // Realtime veya revalidatePath (server action'da var) bunu halledecek.
    } catch (e) {
        toast.error("Mesaj gönderilemedi");
        // Hata durumunda optimistic mesajı geri almak için state yönetimi karmaşıklaşabilir,
        // şimdilik basit tutuyoruz.
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-[100dvh] bg-slate-950 text-slate-100 relative">
        {/* Mesaj Alanı */}
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