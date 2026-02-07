'use client'

import { useState, useEffect } from 'react';
import { X, MessageCircle, Loader2, Search, Plus, ArrowLeft, User, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUserConversations, searchUsers } from '@/app/actions/chat'; 
import ChatDialog from './ChatDialog';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface InboxDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export default function InboxDialog({ isOpen, onClose, currentUserId }: InboxDialogProps) {
  const [view, setView] = useState<'list' | 'search'>('list');
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Arama State'leri
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Seçilen sohbet
  const [selectedChat, setSelectedChat] = useState<{id: string, name: string, avatar?: string} | null>(null);

  // 1. Sohbetleri Yükle
  useEffect(() => {
    if (isOpen && view === 'list') {
      setLoading(true);
      getUserConversations().then(data => {
        setConversations(data);
        setLoading(false);
      });
    }
  }, [isOpen, view]);

  // 2. Kullanıcı Arama
  useEffect(() => {
    const timer = setTimeout(async () => {
        if (searchQuery.length >= 2 && view === 'search') {
            setIsSearching(true);
            const results = await searchUsers(searchQuery);
            setSearchResults(results);
            setIsSearching(false);
        } else {
            setSearchResults([]);
        }
    }, 400); 

    return () => clearTimeout(timer);
  }, [searchQuery, view]);

  // Kapanınca sıfırla
  useEffect(() => {
      if(!isOpen) {
          setTimeout(() => {
            setView('list');
            setSearchQuery("");
            setSearchResults([]);
          }, 300);
      }
  }, [isOpen]);

  const handleStartChat = (userId: string, name: string, avatar?: string) => {
      setSelectedChat({ id: userId, name, avatar });
      onClose(); 
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          // Konumlandırma: Masaüstünde sağ alt, mobilde tam ekran
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:justify-end sm:items-end sm:p-6 pointer-events-auto">
            
            {/* Arkaplan Overlay */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            {/* --- PENCERE --- */}
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`
                relative flex flex-col bg-white overflow-hidden shadow-2xl border border-slate-100
                w-full h-[92vh] rounded-t-3xl           /* Mobil */
                sm:w-[400px] sm:h-[600px] sm:rounded-2xl /* Masaüstü */
              `}
            >
              
              {/* --- HEADER --- */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white z-10 shrink-0">
                {view === 'search' ? (
                    <div className="flex items-center gap-3 w-full animate-in slide-in-from-right-4 fade-in">
                        <button onClick={() => setView('list')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                            <ArrowLeft size={22} />
                        </button>
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                autoFocus
                                type="text" 
                                placeholder="Kimi arıyorsun?" 
                                className="w-full bg-slate-100 rounded-full py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                ) : (
                    <>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                           Mesajlar
                        </h2>
                        <div className="flex items-center gap-1">
                            {/* YENİ MESAJ BUTONU */}
                            <button 
                                onClick={() => setView('search')}
                                className="p-2.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-full transition-all active:scale-95 border border-transparent hover:border-blue-100"
                                title="Yeni Mesaj"
                            >
                                <Edit size={20} />
                            </button>
                            <button 
                                onClick={onClose} 
                                className="p-2.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors active:scale-95"
                            >
                                <X size={22} />
                            </button>
                        </div>
                    </>
                )}
              </div>

              {/* --- İÇERİK --- */}
              <div className="flex-1 overflow-y-auto p-2 bg-white custom-scrollbar">
                
                {/* LİSTE GÖRÜNÜMÜ */}
                {view === 'list' && (
                    <div className="space-y-1">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-3">
                                <Loader2 className="animate-spin text-blue-500" size={28} />
                                <span className="text-xs font-medium">Yükleniyor...</span>
                            </div>
                        ) : conversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-center px-8">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <MessageCircle size={36} className="text-slate-300" />
                                </div>
                                <p className="font-bold text-slate-700 text-lg">Henüz mesajın yok</p>
                                <p className="text-sm text-slate-500 mt-2">
                                    Arkadaşlarına ulaşmak için sağ üstteki kaleme veya aşağıdaki butona bas.
                                </p>
                                {/* BOŞ DURUMDA SOHBET BAŞLATMA BUTONU */}
                                <button 
                                    onClick={() => setView('search')}
                                    className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-full text-sm font-medium hover:bg-slate-800 transition-all active:scale-95"
                                >
                                    Sohbet Başlat
                                </button>
                            </div>
                        ) : (
                            conversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => handleStartChat(conv.otherUserId, 'Kullanıcı')} 
                                    className="w-full text-left p-3.5 hover:bg-slate-50 rounded-2xl transition-all flex items-center gap-4 group active:scale-[0.98]"
                                >
                                    <div className="relative">
                                        <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex-shrink-0 flex items-center justify-center border border-slate-100 shadow-sm group-hover:shadow-md transition-shadow">
                                            <User className="text-slate-400" size={24} />
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="font-bold text-slate-900 text-[15px] group-hover:text-blue-600 transition-colors truncate">
                                                Kullanıcı {conv.otherUserId.slice(0, 4)}...
                                            </span>
                                            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap ml-2">
                                                {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true, locale: tr })}
                                            </span>
                                        </div>
                                        <p className="text-sm truncate text-slate-500">
                                            {conv.last_message || '📎 Bir ek gönderildi'}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}

                {/* ARAMA GÖRÜNÜMÜ */}
                {view === 'search' && (
                    <div className="pt-2 animate-in fade-in zoom-in-95 duration-200">
                        {isSearching ? (
                            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500" /></div>
                        ) : searchResults.length > 0 ? (
                            <div className="space-y-1">
                                <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Sonuçlar</p>
                                {searchResults.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleStartChat(user.id, user.full_name, user.avatar_url)}
                                        className="w-full text-left p-3 hover:bg-blue-50 rounded-2xl transition-colors flex items-center gap-3 active:scale-[0.98]"
                                    >
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} className="w-12 h-12 rounded-full object-cover border border-slate-200" alt="" />
                                        ) : (
                                            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg">
                                                {user.full_name?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-bold text-slate-800 text-[15px]">{user.full_name}</p>
                                            <p className="text-xs text-slate-500 font-medium">@{user.username}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : searchQuery.length > 1 ? (
                            <div className="text-center py-16 text-slate-400">
                                <User size={48} className="mx-auto mb-3 text-slate-200" />
                                <p>Kullanıcı bulunamadı.</p>
                            </div>
                        ) : (
                            <div className="text-center py-16 text-slate-400 px-8">
                                <Search size={48} className="mx-auto mb-3 text-slate-200" />
                                <p className="text-sm">Mesaj göndermek istediğin kişinin adını veya kullanıcı adını yaz.</p>
                            </div>
                        )}
                    </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Seçilen Sohbet Penceresi */}
      <ChatDialog 
        isOpen={!!selectedChat}
        onClose={() => setSelectedChat(null)}
        recipientId={selectedChat?.id || ''}
        recipientName={selectedChat?.name || ''}
        recipientAvatar={selectedChat?.avatar}
        currentUser={{ id: currentUserId }}
      />
    </>
  );
}