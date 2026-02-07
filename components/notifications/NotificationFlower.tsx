'use client';

import React from 'react';
import { cn } from '@/utils/cn'; // Senin utils klasöründeki cn fonksiyonu

interface NotificationFlowerProps {
  hasUnread: boolean;
  onClick: () => void;
}

export const NotificationFlower = ({ hasUnread, onClick }: NotificationFlowerProps) => {
  return (
    <button
      onClick={onClick}
      className="relative group focus:outline-none transition-transform active:scale-95"
    >
      {/* Glow Effect - Sadece okunmamış varsa görünür */}
      <div
        className={cn(
          "absolute inset-0 rounded-full blur-md transition-all duration-700",
          hasUnread 
            ? "bg-pink-500/60 opacity-100 scale-125 animate-pulse" 
            : "bg-transparent opacity-0 scale-50"
        )}
      />

      {/* SVG Çiçek İkonu */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "relative z-10 w-7 h-7 transition-all duration-500 ease-in-out",
          hasUnread 
            ? "text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" // Canlı Renk + Neon Parlama
            : "text-gray-400 hover:text-gray-300" // Solgun Renk
        )}
      >
        {/* Çiçek Yaprakları - Duruma göre şekil değiştirebilir veya sadece renk */}
        <path d="M12 7.5a4.5 4.5 0 1 1 4.5 4.5M12 7.5A4.5 4.5 0 1 0 7.5 12M12 7.5V9m-4.5 3a4.5 4.5 0 1 0 4.5 4.5M7.5 12H9" />
        <path d="M16.5 12A4.5 4.5 0 1 1 12 16.5M16.5 12H15" />
        <path d="M12 16.5V19" />
        <path d="M12 19a3 3 0 0 1-3 3h6a3 3 0 0 1-3-3z" />
        <path d="M12 2v5.5" />
      </svg>
    </button>
  );
};