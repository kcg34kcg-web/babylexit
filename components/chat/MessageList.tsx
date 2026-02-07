'use client'

import { useRef } from 'react';
import { useChatScroll } from '@/hooks/useChatScroll';
import { cn } from '@/utils/cn'; // Projende cn fonksiyonu utils/cn.ts'de mevcut
import { format } from 'date-fns'; // Tarih formatı için (Opsiyonel, yoksa JS Date kullanırız)

interface MessageListProps {
  messages: any[];
  currentUserId: string;
  onLoadMore: () => void;
}

export default function MessageList({ messages, currentUserId, onLoadMore }: MessageListProps) {
    // Scroll Jumping'i engelleyen sihirli hook
    const scrollRef = useChatScroll(messages);
    
    // En tepeye gelince daha fazlasını yükle
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        if (target.scrollTop === 0) {
            onLoadMore();
        }
    };

    return (
        <div 
            ref={scrollRef} 
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-6"
        >
            {/* Yükleme indikatörü (UI geliştirilebilir) */}
            <div className="h-4" /> 

            {messages.map((msg, index) => {
                const isMe = msg.sender_id === currentUserId;
                const isDeleted = msg.deleted_at;
                
                // Ardışık mesajlarda isim/avatar gizlemek için kontrol
                const isSameSenderAsPrevious = index > 0 && messages[index - 1].sender_id === msg.sender_id;

                return (
                    <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        
                        <div 
                            className={cn(
                                "max-w-[75%] rounded-2xl px-4 py-2 relative group",
                                isMe 
                                    ? "bg-blue-600 text-white rounded-br-none" 
                                    : "bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700",
                                msg.isOptimistic && "opacity-70"
                            )}
                        >
                            {isDeleted ? (
                                <p className="italic text-sm text-slate-400 flex items-center gap-2">
                                    <span>🚫</span> Mesaj silindi
                                </p>
                            ) : (
                                <>
                                    {/* Medya Gösterimi (Signed URL) */}
                                    {msg.media_url && (
                                        <div className="mb-2 mt-1">
                                            {msg.media_type?.startsWith('image') ? (
                                                <img 
                                                    src={msg.signedUrl || msg.media_url} 
                                                    alt="attachment" 
                                                    className="rounded-lg max-h-60 object-cover w-full bg-black/20" 
                                                />
                                            ) : (
                                                <a 
                                                    href={msg.signedUrl || msg.media_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-sm underline bg-black/20 p-2 rounded"
                                                >
                                                    📎 Dosyayı Görüntüle
                                                </a>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Metin İçeriği */}
                                    {msg.content && <p className="whitespace-pre-wrap break-words text-[15px]">{msg.content}</p>}
                                </>
                            )}

                            {/* Mesaj Bilgisi (Saat ve Okundu Durumu) */}
                            <div className={cn(
                                "text-[10px] mt-1 flex items-center justify-end gap-1 opacity-60",
                                isMe ? "text-blue-100" : "text-slate-400"
                            )}>
                                {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                                
                                {isMe && (
                                    <span>
                                        {msg.isOptimistic ? '🕒' : (msg.is_read ? '✓✓' : '✓')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}