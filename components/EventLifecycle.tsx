'use client';

import { useState } from 'react';
import { isPast, isToday, isFuture } from 'date-fns';
import { MapPin, Ticket, Camera, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface EventLifecycleProps {
  eventDate: string | Date;
  locationName?: string | null;
}

export default function EventLifecycle({ eventDate, locationName }: EventLifecycleProps) {
  const dateObj = new Date(eventDate);
  const [clicked, setClicked] = useState(false);

  // DURUM ANALİZİ
  const isLive = isToday(dateObj);
  const isEnded = isPast(dateObj) && !isToday(dateObj);
  const isUpcoming = isFuture(dateObj) && !isToday(dateObj);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Burada ileride Backend bağlantısı yapılacak (RSVP, Check-in API)
    setClicked(!clicked);
  };

  // --- DURUM 1: CANLI ETKİNLİK (ACİLİYET) ---
  if (isLive) {
    return (
      <button 
        onClick={handleClick}
        className={cn(
          "mt-3 w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-sm",
          clicked 
            ? "bg-green-100 text-green-700 border border-green-200"
            : "bg-red-600 hover:bg-red-500 text-white animate-pulse shadow-red-200"
        )}
      >
        {clicked ? (
          <>
            <CheckCircle2 size={14} />
            <span>Buradasın</span>
          </>
        ) : (
          <>
            <MapPin size={14} className="animate-bounce" />
            <span>Check-in</span>
          </>
        )}
      </button>
    );
  }

  // --- DURUM 2: GELECEK ETKİNLİK (DAVET) ---
  if (isUpcoming) {
    return (
      <button 
        onClick={handleClick}
        className={cn(
          "mt-3 w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all border shadow-sm",
          clicked
            ? "bg-blue-50 text-blue-600 border-blue-200"
            : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-300"
        )}
      >
        {clicked ? (
          <>
            <CheckCircle2 size={14} />
            <span>Gidiyorum</span>
          </>
        ) : (
          <>
            <Ticket size={14} />
            <span>Katıl</span>
          </>
        )}
      </button>
    );
  }

  // --- DURUM 3: GEÇMİŞ ETKİNLİK (ANI) ---
  if (isEnded) {
    return (
      <button 
        onClick={handleClick}
        className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all border border-slate-100 text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-slate-500"
      >
        <Camera size={14} />
        <span>Anı Ekle</span>
      </button>
    );
  }

  return null;
}