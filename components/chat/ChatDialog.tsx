'use client'

import { useState, useEffect } from 'react';
import { X, Maximize2, Minimize2, Loader2, Minus } from 'lucide-react';
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
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pencere açıldığında sohbeti başlat
  useEffect(() => {
    if (isOpen && currentUser && !conversationId) {
      setLoading(true);
      const initChat = async () => {
        try {
          const convId = await startConversation(recipientId);
          setConversationId(convId);
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            y: isMinimized ? 'calc(100% - 60px)' : 0, 
            scale: 1,
            // DÜZELTME: Mobilde '100dvh' yerine 'inset-0' kullanıyoruz.
            // Bu sayede klavye açılınca pencere otomatik boyutlanır.
            ...isExpanded ? { 
                position: 'fixed', inset: 0, borderRadius: 0, zIndex: 50
            } : { 
                position: 'fixed', bottom: 0, right: 0, width: '100%', maxWidth: '24rem', height: '500px',
                borderTopLeftRadius: '1.5rem', borderTopRightRadius: '1.5rem', zIndex: 40,
                marginRight: '1rem', marginBottom: '0' 
            }
          }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          // TEMA GÜNCELLEMESİ: bg-slate-900 yerine bg-white (Beyaz Tema)
          className="bg-white shadow-2xl border-x border-t border-slate-200 overflow-hidden flex flex-col"
        >
          {/* --- HEADER (BEYAZ TEMA) --- */}
          <div 
            className="flex items-center justify-between p-3 bg-white border-b border-slate-100 cursor-pointer select-none"
            onClick={() => {
                if(isMinimized) setIsMinimized(false);
            }}
          >
            <div className="flex items-center gap-3">
               <div className="relative">
                   {recipientAvatar ? (
                       <img src={recipientAvatar} className="w-9 h-9 rounded-full object-cover border border-slate-200" alt="" />
                   ) : (
                       <div className="w-9 h-9 rounded-full bg-orange-100 border border-orange-200" />
                   )}
                   <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
               </div>
               <div>
                   <h3 className="text-sm font-bold text-slate-900">{recipientName}</h3>
                   <span className="text-[11px] text-slate-500 block leading-none mt-0.5">
                       {isMinimized ? 'Sohbeti açmak için tıkla' : 'Çevrimiçi'}
                   </span>
               </div>
            </div>

            <div className="flex items-center gap-1">
                {/* İkon renkleri koyu yapıldı (slate-400 -> slate-500/hover:orange) */}
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); setIsExpanded(false); }}
                    className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors"
                    title="Aşağı İndir"
                >
                    <Minus size={18} />
                </button>

                {!isMinimized && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors"
                        title={isExpanded ? "Küçült" : "Tam Ekran"}
                    >
                        {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                )}

                <button 
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Kapat"
                >
                    <X size={18} />
                </button>
            </div>
          </div>

          {/* --- CONTENT --- */}
          {/* bg-slate-950 yerine bg-white */}
          <div className={`flex-1 bg-white relative overflow-hidden ${isMinimized ? 'hidden' : 'flex flex-col'}`}>
            {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                    <Loader2 className="animate-spin text-orange-500" size={32} />
                    <p className="text-xs font-medium">Sohbet yükleniyor...</p>
                </div>
            ) : (
                conversationId && (
                    <ChatWindow 
                        conversationId={conversationId} 
                        initialMessages={initialMessages} 
                        currentUser={currentUser} 
                        className="h-full w-full" // ChatWindow'un tüm alanı kaplamasını sağla
                    />
                )
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}