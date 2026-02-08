'use client';

import { useEffect, useRef, useState } from 'react';
import VideoItem from './VideoItem';
import { VideoData } from '@/app/types/video';
import { createClient } from '@/utils/supabase/client';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export default function ReelsContainer() {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  
  const supabase = createClient();

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // 1. ADIM: Sadece Videoları Çek (İlişki kurmadan - Hatayı önler)
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (videosError) throw videosError;

      if (!videosData || videosData.length === 0) {
        setVideos([]);
        return;
      }

      // 2. ADIM: Bu videoların sahiplerinin (user_id) listesini çıkar
      const userIds = Array.from(new Set(videosData.map((v) => v.user_id)));

      // 3. ADIM: Profilleri topluca çek
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // 4. ADIM: Verileri JS ile birleştir (Manual Join)
      const formattedVideos: VideoData[] = videosData.map((v: any) => {
        // Videonun sahibini bul
        const user = profilesData?.find((p) => p.id === v.user_id) || { 
          id: 'unknown', 
          username: 'Anonim', 
          avatar_url: '' 
        };

        return {
          id: v.id,
          video_url: v.video_url || `${process.env.NEXT_PUBLIC_R2_DOMAIN}/${v.storage_path}`,
          thumbnail_url: '', 
          description: v.description || '',
          user: {
            id: user.id,
            username: user.username,
            avatar_url: user.avatar_url
          },
          stats: { likes: 0, comments: 0, views: 0 },
          is_liked: false 
        };
      });
      
      setVideos(formattedVideos);

    } catch (err: any) {
      console.error("Video hatası:", JSON.stringify(err, null, 2)); // Hatayı tam gör
      setErrorMsg(err.message || "Videolar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
         <div className="flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-rose-500" size={40} />
            <p className="text-white/50 text-xs tracking-widest uppercase animate-pulse">Veriler İndiriliyor...</p>
         </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center text-white z-50 relative">
            <AlertCircle className="text-red-500 mb-2" size={40} />
            <p className="font-bold">Bağlantı Hatası</p>
            <p className="text-xs text-white/60 mt-1 max-w-xs break-words">{errorMsg}</p>
            <button 
              onClick={fetchVideos} 
              className="mt-4 px-4 py-2 bg-white/10 rounded-full text-xs hover:bg-white/20 transition flex items-center gap-2"
            >
              <RefreshCw size={14} /> Tekrar Dene
            </button>
        </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-white p-6 text-center z-50 relative">
         <div className="w-24 h-24 bg-gradient-to-tr from-slate-800 to-slate-600 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-slate-500/20 border border-slate-400/30">
            <span className="text-5xl">🌑</span>
         </div>
         <p className="text-2xl font-bold mb-2 tracking-tight">Burası Çok Sessiz...</p>
         <p className="text-slate-300 mb-8 max-w-xs mx-auto leading-relaxed">
           Ay yüzeyinde henüz hiç video yok. Sağ üstteki butona basıp ilk videoyu sen yükle!
         </p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar bg-transparent"
    >
      {videos.map((video, index) => (
        <VideoItem 
          key={video.id} 
          data={video} 
          isActive={index === currentVideoIndex} 
        />
      ))}
      
      <div className="snap-start w-full h-32 flex items-center justify-center text-white/30 backdrop-blur-sm">
        <span className="text-xs uppercase tracking-widest">Uzay Boşluğu (Son)</span>
      </div>
    </div>
  );
}