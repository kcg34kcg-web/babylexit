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
  const [messages, setMessages] = useState(initialMessages);
  const [page, setPage] = useState(0);
  const supabase = createClient();
  
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage) => [...state, newMessage]
  );

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

  useEffect(() => {
    markMessagesAsRead(conversationId);
  }, [conversationId]);

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

  const handleSendMessage = async (formData: FormData) => {
    const content = formData.get('content') as string;
    const file = formData.get('file') as File | null;
    
    if (!content && (!file || file.size === 0)) return;

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

    startTransition(() => {
        addOptimisticMessage(optimisticMsg);
    });

    try {
        const actualMessage = await sendMessage(formData);
        if (actualMessage) {
            setMessages((prev) => [...prev, actualMessage]);
        }
    } catch (e) {
        console.error(e);
        toast.error("Mesaj gönderilemedi");
    }
  };

  return (
    // h-full ile ebeveynin (page.tsx) yüksekliğini tam dolduruyoruz.
    <div className={`flex flex-col h-full w-full bg-white relative ${className}`}>
        
        {/* MESAJ LİSTESİ */}
        {/* flex-1: Boşluğu doldur. */}
        {/* min-h-0: Input büyüdüğünde burası sıkışarak küçülür (Aşağı taşmayı engeller). */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50 relative w-full">
            <MessageList 
                messages={optimisticMessages} 
                currentUserId={currentUser.id} 
                onLoadMore={loadMore}
            />
        </div>

        {/* INPUT ALANI */}
        {/* shrink-0: Input alanı ASLA ezilmez, yüksekliği neyse o kadar yer kaplar. */}
        {/* pb-safe: iPhone'larda alttaki siyah çizgi (Home indicator) için boşluk bırakır. */}
        <div className="shrink-0 w-full bg-white border-t border-slate-100 z-20 pb-[env(safe-area-inset-bottom)]">
            <ChatInput conversationId={conversationId} onSend={handleSendMessage} />
        </div>
    </div>
  );
}