'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationFlower } from './NotificationFlower';
import { NotificationList } from './NotificationList';
import { X, CheckCheck } from 'lucide-react';

// Dışarı tıklama hook'u
function useOutsideClick(ref: React.RefObject<HTMLDivElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
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
  align?: 'left' | 'right';
  label?: string;
}

export const NotificationPopover = ({ userId, align = 'right', label }: NotificationPopoverProps) => {
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
  const containerRef = useRef<HTMLDivElement | null>(null);

  useOutsideClick(containerRef, () => setIsOpen(false));

  // Mobilde scroll'u kilitle
  useEffect(() => {
    if (isOpen && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block">
      
      {/* --- TETİKLEYİCİ (TRIGGER) --- */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-4 group focus:outline-none ${label ? 'w-full' : ''}`}
      >
         <div className="pointer-events-none relative">
            <NotificationFlower hasUnread={unreadCount > 0} asDiv={true} />
         </div>
         {label && (
           <span className="text-xl font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
             {label}
           </span>
         )}
      </button>

      {/* --- AÇILIR PENCERE (POPOVER / DRAWER) --- */}
      {isOpen && (
        <>
          {/* MOBİL İÇİN ARKA PLAN KARARTMA (BACKDROP) */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] lg:hidden" onClick={() => setIsOpen(false)} />

          <div 
            className={`
                bg-white shadow-2xl z-[100] flex flex-col
                
                /* MOBİL STİLLERİ: Ekranın ortasında veya tam ekran */
                fixed inset-x-0 bottom-0 top-[10%] rounded-t-2xl  /* Alt çekmece stili (Sheet) */
                lg:top-auto lg:bottom-auto lg:inset-auto /* Masaüstünde sıfırla */
                
                /* MASAÜSTÜ STİLLERİ: Dropdown */
                lg:absolute lg:mt-3 lg:w-[400px] lg:rounded-2xl lg:border lg:border-slate-100
                ${align === 'left' ? 'lg:left-0' : 'lg:right-0'}

                animate-in slide-in-from-bottom-10 lg:zoom-in-95 duration-200
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white rounded-t-2xl">
              <h3 className="text-slate-900 font-bold text-lg flex items-center gap-2">
                Bildirimler
                {unreadCount > 0 && (
                   <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{unreadCount}</span>
                )}
              </h3>
              
              <div className="flex items-center gap-2">
                 {unreadCount > 0 && (
                    <button 
                        onClick={() => markAllAsRead()}
                        title="Tümünü okundu işaretle"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    >
                        <CheckCheck size={20} />
                    </button>
                 )}
                 {/* Kapat Butonu */}
                 <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full lg:hidden"
                 >
                    <X size={24} />
                 </button>
              </div>
            </div>

            {/* Liste Alanı */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 lg:max-h-[500px]">
               <NotificationList 
                 notifications={notifications}
                 loading={loading}
                 hasMore={hasMore}
                 onLoadMore={loadMore}
                 onMarkRead={markAsRead}
               />
            </div>
          </div>
        </>
      )}
    </div>
  );
};