'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/utils/cn';

interface NotificationBellProps {
  count?: number;
  isOpen?: boolean;
  onClick?: () => void;
}

export const NotificationBell = ({ 
  count = 0, 
  isOpen = false, 
  onClick 
}: NotificationBellProps) => {
  // Bildirim sayısı 99'dan büyükse '99+' göster
  const displayCount = count > 99 ? '99+' : count;

  return (
    <button
      onClick={onClick}
      className={cn(
        // 1. Container: Yuvarlak, şeffaf, hover efektli ve tıklama animasyonlu
        "relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200",
        "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800",
        "active:scale-95 focus:outline-none"
      )}
      aria-label="Notifications"
    >
      {/* 2. İkon: Lucide Bell */}
      <Bell
        className={cn(
          "w-6 h-6 transition-all duration-200",
          "text-gray-900 dark:text-white", // Tema uyumlu renk
          // Drawer açıksa içi dolu (solid), kapalıysa sadece çizgiler
          isOpen ? "fill-current" : "fill-none",
          "stroke-[1.75px]" // Twitter benzeri ince-orta kalınlık
        )}
      />

      {/* 3. Badge: Bildirim Sayısı */}
      {count > 0 && (
        <span
          className={cn(
            "absolute top-[5px] right-[5px]", // Konumlandırma
            "flex items-center justify-center",
            "min-w-[18px] h-[18px] px-[4px]", // Pill shape için padding
            "bg-red-500 rounded-full",
            "text-[10px] font-bold text-white leading-none",
            
            // 🔥 'Cutout' Efekti: Rozetin etrafına arka plan renginde bir çerçeve ekler.
            // Bu, ikonun üzerinde yüzüyormuş gibi görünmesini sağlar.
            "ring-2 ring-background", 
            
            "select-none animate-in zoom-in duration-300"
          )}
        >
          {displayCount}
        </span>
      )}
    </button>
  );
};