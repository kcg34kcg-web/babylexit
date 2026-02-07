'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationFlower } from './NotificationFlower';
import { NotificationItem } from './NotificationItem';

// --- Helper Hook: Dışarı Tıklamayı Algıla ---
// DÜZELTME: 'HTMLDivElement | null' tipini kabul edecek şekilde güncellendi.
function useOutsideClick(ref: React.RefObject<HTMLDivElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      // Eğer referans yoksa veya tıklanan yer referansın içindeyse işlem yapma
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler();
    };
    
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

interface NotificationPopoverProps {
  userId?: string;
}

export const NotificationPopover = ({ userId }: NotificationPopoverProps) => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    hasMore, 
    loadMore, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications(userId);

  const [isOpen, setIsOpen] = useState(false);
  
  // Ref tanımı standart olarak null ile başlar
  const containerRef = useRef<HTMLDivElement>(null);

  // Dışarı tıklayınca kapatma fonksiyonunu bağladık
  useOutsideClick(containerRef, () => setIsOpen(false));

  return (
    <div className="relative" ref={containerRef}>
      {/* 1. Trigger (Çiçek İkonu) */}
      <NotificationFlower 
        hasUnread={unreadCount > 0} 
        onClick={() => setIsOpen(!isOpen)} 
      />

      {/* 2. Dropdown Menüsü */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#0f0f12] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
            <h3 className="text-white font-medium">Bildirimler</h3>
            {unreadCount > 0 && (
              <button 
                onClick={() => markAllAsRead()}
                className="text-xs text-pink-400 hover:text-pink-300 transition-colors"
              >
                Tümünü Okundu Say
              </button>
            )}
          </div>

          {/* Liste */}
          <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">Yükleniyor...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center">
                <span className="text-2xl mb-2">🥀</span>
                <p className="text-gray-500 text-sm">Henüz bir hareket yok.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((note) => (
                  <NotificationItem 
                    key={note.id} 
                    notification={note} 
                    onRead={() => markAsRead(note.id)} 
                  />
                ))}
                
                {/* Daha Fazla Yükle Butonu */}
                {hasMore && (
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="p-3 text-xs text-center text-gray-400 hover:text-white transition-colors border-t border-white/5 w-full"
                  >
                    {loading ? 'Yükleniyor...' : 'Daha Eski Bildirimler'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};