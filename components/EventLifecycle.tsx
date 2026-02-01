'use client';

import { useState, useEffect } from 'react';
import { isPast, isToday, isFuture } from 'date-fns';
import { MapPin, Ticket, Camera, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';

interface EventLifecycleProps {
  eventId: string;
  eventDate: string | Date;
  locationName?: string | null;
}

export default function EventLifecycle({ eventId, eventDate, locationName }: EventLifecycleProps) {
  const supabase = createClient();
  const dateObj = new Date(eventDate);
  
  // State'ler
  const [status, setStatus] = useState<'none' | 'going'>('none');
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState(false); // "Vazgeç" butonu efekti için

  // Tarih Durumları
  const isLive = isToday(dateObj);
  const isEnded = isPast(dateObj) && !isToday(dateObj);
  const isUpcoming = isFuture(dateObj) && !isToday(dateObj);

  // 1. Veritabanından Katılım Durumunu Çek
  useEffect(() => {
    const checkParticipation = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);

      const { data } = await supabase
        .from('event_participants')
        .select('status')
        .eq('user_id', user.id)
        .eq('post_id', eventId)
        .maybeSingle();

      if (data) setStatus('going');
      setLoading(false);
    };

    if (eventId) checkParticipation();
  }, [eventId]);

  // 2. Butona Tıklama (Katıl / İptal Et)
  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Linke tıklamayı engelle
    if (loading) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Katılmak için giriş yapmalısın!");

    // Optimistic UI: Önce ekranı güncelle, sonra arkada işlemi yap
    const oldStatus = status;
    const newStatus = status === 'going' ? 'none' : 'going';
    setStatus(newStatus);

    try {
      if (newStatus === 'going') {
        // Katıl (Insert)
        const { error } = await supabase
          .from('event_participants')
          .insert({ user_id: user.id, post_id: eventId, status: 'going' });
        
        if (error) throw error;
        toast.success("Biletin ayrıldı! 🎉");
      } else {
        // Vazgeç (Delete)
        const { error } = await supabase
          .from('event_participants')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', eventId);
        
        if (error) throw error;
        toast("Katılım iptal edildi.", { icon: '👋' });
      }
    } catch (err) {
      console.error(err);
      setStatus(oldStatus); // Hata olursa eski haline döndür
      toast.error("Bir sorun oluştu.");
    }
  };

  // --- RENDER ---

  if (loading) {
    return (
      <button className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-400 animate-pulse cursor-wait">
        <Loader2 size={14} className="animate-spin" /> Yükleniyor...
      </button>
    );
  }

  // DURUM 1: CANLI ETKİNLİK (Bugün)
  if (isLive) {
    return (
      <button 
        onClick={handleToggle}
        className={cn(
          "mt-3 w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all shadow-sm",
          status === 'going'
            ? "bg-green-100 text-green-700 border border-green-200"
            : "bg-red-600 hover:bg-red-500 text-white animate-pulse shadow-red-200"
        )}
      >
        {status === 'going' ? (
          <> <CheckCircle2 size={14} /> <span>Buradasın</span> </>
        ) : (
          <> <MapPin size={14} className="animate-bounce" /> <span>Check-in Yap</span> </>
        )}
      </button>
    );
  }

  // DURUM 2: GELECEK ETKİNLİK
  if (isUpcoming) {
    return (
      <button 
        onClick={handleToggle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={cn(
          "mt-3 w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all border shadow-sm",
          status === 'going'
            ? hover 
                ? "bg-red-50 text-red-600 border-red-200" // Hoverda kırmızı (Vazgeç)
                : "bg-blue-50 text-blue-600 border-blue-200" // Normalde mavi (Katıldım)
            : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-300"
        )}
      >
        {status === 'going' ? (
          hover ? (
            <> <XCircle size={14} /> <span>Vazgeç</span> </>
          ) : (
            <> <CheckCircle2 size={14} /> <span>Gidiyorum</span> </>
          )
        ) : (
          <> <Ticket size={14} /> <span>Katıl</span> </>
        )}
      </button>
    );
  }

  // DURUM 3: GEÇMİŞ ETKİNLİK
  if (isEnded) {
    return (
      <button disabled className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border border-slate-100 text-slate-400 bg-slate-50 cursor-not-allowed">
        <Camera size={14} /> <span>Sona Erdi</span>
      </button>
    );
  }

  return null;
}