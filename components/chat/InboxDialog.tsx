'use client'

import { useState, useEffect } from 'react';
import { X, MessageCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserConversations } from '@/app/actions/chat';
import ChatDialog from './ChatDialog'; // Seçilen sohbeti açmak için
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface InboxDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export default function InboxDialog({ isOpen, onClose, currentUserId }: InboxDialogProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Seçilen sohbeti açmak için state
  const [selectedChat, setSelectedChat] = useState<{id: string, name: string, avatar?: string} | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getUserConversations().then(data => {
        setConversations(data);
        setLoading(false);
      });
    }
  }, [isOpen]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Arkaplan Overlay */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />

            {/* Pencere */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md h-[600px] bg-white rounded-2xl shadow-2xl z-[70] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <MessageCircle className="text-blue-500" />
                  Mesajlar
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                  <X size={20} />
                </button>
              </div>

              {/* Liste */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-slate-400" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    Henüz mesajınız yok.
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedChat({
                        id: conv.otherUserId, // Burada user ID'yi alıyoruz
                        name: 'Kullanıcı', // Gerçek isim için join yapmak gerekir
                        avatar: undefined 
                      })}
                      className="w-full text-left p-3 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-3 group"
                    >
                      <div className="w-12 h-12 bg-slate-200 rounded-full flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            Kullanıcı
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true, locale: tr })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 truncate">{conv.last_message}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sohbet Penceresi (InboxDialog içinden tetiklenir) */}
      {selectedChat && (
        <ChatDialog 
          isOpen={!!selectedChat}
          onClose={() => setSelectedChat(null)}
          recipientId={selectedChat.id}
          recipientName={selectedChat.name}
          recipientAvatar={selectedChat.avatar}
          currentUser={{ id: currentUserId }}
        />
      )}
    </>
  );
}