'use client';

import { useEffect, useRef, useState } from 'react';
import VideoItem from './VideoItem';
import { VideoData } from '@/app/types/video';
import { createClient } from '@/utils/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';

export default function ReelsContainer() {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  
  const supabase = createClient();

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        // 1. Basitleştirilmiş Sorgu (Hata Ayıklama İçin)
        // Eğer 'video_likes' tablolarında sorun varsa burası patlıyordu.
        // Şimdilik sadece profili joinliyoruz.
        const { data, error } = await supabase
          .from('videos')
          .select(`
            id, video_url, description, storage_path, created_at,
            user:profiles(id, username, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
            console.error("Supabase Hatası:", error);
            throw error;
        }

        if (data) {
          const formattedVideos: VideoData[] = data.map((v: any) => ({
            id: v.id,
            video_url: v.video_url || `${process.env.NEXT_PUBLIC_R2_DOMAIN}/${v.storage_path}`,
            thumbnail_url: '', 
            description: v.description || '',
            user: {
              id: v.user?.id || 'unknown',
              username: v.user?.username || 'Anonim',
              avatar_url: v.user?.avatar_url || ''
            },
            // İstatistikleri şimdilik manuel 0 veriyoruz (Hatayı aşmak için)
            stats: { likes: 0, comments: 0, views: 0 },
            is_liked: false 
          }));
          
          setVideos(formattedVideos);
        }
      } catch (err: any) {
        console.error("Video çekme hatası detayı:", err);
        setErrorMsg(err.message || "Videolar yüklenirken bir sorun oluştu.");
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  // Scroll Mantığı
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const index = Math.round(container.scrollTop / container.clientHeight);
      if (index !== currentVideoIndex) {
        setCurrentVideoIndex(index);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentVideoIndex]);

  // --- LOADING DURUMU ---
  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
         <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-rose-500" size={40} />
            <p className="text-white/50 text-xs tracking-widest uppercase">Ay Üssüne Bağlanılıyor...</p>
         </div>
      </div>
    );
  }

  // --- HATA DURUMU ---
  if (errorMsg) {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center text-white">
            <AlertCircle className="text-red-500 mb-2" size={40} />
            <p className="font-bold">Bağlantı Hatası</p>
            <p className="text-xs text-white/60 mt-1 max-w-xs">{errorMsg}</p>
        </div>
    );
  }

  // --- BOŞ DURUM ---
  if (videos.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-white p-6 text-center">
         <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4 backdrop-blur-md border border-white/20">
            <span className="text-4xl">🌑</span>
         </div>
         <p className="text-xl font-bold mb-2">Burası Çok Sessiz...</p>
         <p className="text-slate-300 mb-6 max-w-xs mx-auto">Ay yüzeyinde henüz hiç video yok. İlk ayak izini sen bırak!</p>
         {/* Buradaki butonu kaldırdık çünkü ana sayfada (page.tsx) zaten var */}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      // DİKKAT: bg-black yerine bg-transparent yaptık
      className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar bg-transparent"
    >
      {videos.map((video, index) => (
        <VideoItem 
          key={video.id} 
          data={video} 
          isActive={index === currentVideoIndex} 
        />
      ))}
      
      <div className="snap-start w-full h-20 flex items-center justify-center text-white/30 backdrop-blur-sm">
        <span className="text-xs">Daha fazla video yok</span>
      </div>
    </div>
  );
}