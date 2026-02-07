'use client'

import { useState, useEffect } from 'react';
import { X, Maximize2, Minimize2, Loader2, Minus } from 'lucide-react'; // Minus ikonu eklendi
import { motion, AnimatePresence } from 'framer-motion';
import ChatWindow from './ChatWindow';
import { getMessages, startConversation } from '@/app/actions/chat';

interface ChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  currentUser: any;
}

export default function ChatDialog({ isOpen, onClose, recipientId, recipientName, recipientAvatar, currentUser }: ChatDialogProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false); // Pencereyi aşağı indirme durumu
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pencere açıldığında sohbeti başlat veya mevcut olanı getir
  useEffect(() => {
    if (isOpen && currentUser && !conversationId) {
      setLoading(true);
      const initChat = async () => {
        try {
          // 1. Konuşma ID'sini sunucudan al (yoksa oluşturur)
          const convId = await startConversation(recipientId);
          setConversationId(convId);

          // 2. İlk mesajları çek
          const msgs = await getMessages(convId, 0);
          setInitialMessages(msgs);
        } catch (error) {
          console.error("Chat başlatılamadı:", error);
        } finally {
          setLoading(false);
        }
      };
      initChat();
    }
  }, [isOpen, recipientId, currentUser, conversationId]);

  // Pencere kapalıysa hiçbir şey render etme (AnimatePresence hariç)
  // Ancak minimize ise sadece başlığı göster
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            y: isMinimized ? 'calc(100% - 60px)' : 0, // Minimize ise aşağı kaydır
            scale: 1,
            // Tam ekransa tüm ekranı kapla, değilse sağ altta dur
            ...isExpanded ? { 
                position: 'fixed', inset: 0, borderRadius: 0, zIndex: 50, height: '100dvh'
            } : { 
                position: 'fixed', bottom: 0, right: 0, width: '100%', maxWidth: '24rem', height: '500px',
                borderTopLeftRadius: '1.5rem', borderTopRightRadius: '1.5rem', zIndex: 40,
                marginRight: '1rem' // Masaüstünde sağdan biraz boşluk
            }
          }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-slate-900 shadow-2xl border-x border-t border-slate-700 overflow-hidden flex flex-col"
        >
          {/* --- HEADER --- */}
          <div 
            className="flex items-center justify-between p-3 bg-slate-800 border-b border-slate-700 cursor-pointer select-none"
            onClick={() => {
                if(isMinimized) setIsMinimized(false); // Tıklayınca yukarı kaldır
            }}
          >
            <div className="flex items-center gap-3">
               <div className="relative">
                   {recipientAvatar ? (
                       <img src={recipientAvatar} className="w-8 h-8 rounded-full object-cover border border-slate-600" alt="" />
                   ) : (
                       <div className="w-8 h-8 rounded-full bg-slate-600" />
                   )}
                   <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-slate-800 rounded-full"></div>
               </div>
               <div>
                   <h3 className="text-sm font-bold text-slate-100">{recipientName}</h3>
                   <span className="text-[10px] text-slate-400 block leading-none">
                       {isMinimized ? 'Sohbeti açmak için tıkla' : 'Aktif'}
                   </span>
               </div>
            </div>

            <div className="flex items-center gap-1">
                {/* Küçültme (Minimize) Butonu */}
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); setIsExpanded(false); }}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
                    title="Aşağı İndir"
                >
                    <Minus size={18} />
                </button>

                {/* Tam Ekran Butonu */}
                {!isMinimized && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
                        title={isExpanded ? "Küçült" : "Tam Ekran"}
                    >
                        {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                )}

                {/* Kapat Butonu */}
                <button 
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-full transition-colors"
                    title="Kapat"
                >
                    <X size={18} />
                </button>
            </div>
          </div>

          {/* --- CONTENT --- */}
          {/* Minimize durumunda içeriği gizle veya render etme */}
          <div className={`flex-1 bg-slate-950 relative ${isMinimized ? 'hidden' : 'block'}`}>
            {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                    <p className="text-xs font-medium">Sohbet yükleniyor...</p>
                </div>
            ) : (
                conversationId && (
                    <ChatWindow 
                        conversationId={conversationId} 
                        initialMessages={initialMessages} 
                        currentUser={currentUser} 
                        className="h-full" // ChatWindow'a tam yükseklik veriyoruz
                    />
                )
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}