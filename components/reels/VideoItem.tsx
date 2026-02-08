'use client';

import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play } from 'lucide-react';
import { cn } from '@/utils/cn';
import { VideoData } from '@/app/types/video';

interface VideoItemProps {
  data: VideoData;
  isActive: boolean; // Ekranda görünen video bu mu?
}

export default function VideoItem({ data, isActive }: VideoItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  // Aktiflik Durumu Değişince (Ekrana girince/çıkınca)
  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive) {
      // Ekrana girdi: Oynat
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((error) => {
            console.log("Otomatik oynatma engellendi (Kullanıcı etkileşimi bekleniyor):", error);
            setIsPlaying(false);
          });
      }
    } else {
      // Ekrandan çıktı: Durdur ve başa sar
      videoRef.current.pause();
      videoRef.current.currentTime = 0; // Başa sar (TikTok mantığı)
      setIsPlaying(false);
    }
  }, [isActive]);

  const toggleMute = () => setIsMuted(!isMuted);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    // DÜZELTME: bg-black yerine bg-transparent yaptık
    <div className="relative w-full h-[100dvh] snap-start bg-transparent overflow-hidden flex items-center justify-center">
      
      {/* 1. VİDEO KATMANI */}
      <video
        ref={videoRef}
        src={data.video_url}
        poster={data.thumbnail_url}
        // DÜZELTME: object-cover yerine max-h-full max-w-full yaparak
        // eğer video dikey değilse yanlardan taşmamasını, arka planın görünmesini sağladık.
        // Tam ekran dolması isteniyorsa 'object-cover' geri alınabilir.
        className="h-full w-full object-cover"
        loop
        playsInline // iOS için kritik
        muted={isMuted} // Tarayıcı politikası için başlangıçta true olmalı
        onClick={togglePlay}
        preload="auto" // Progressive MP4 için önemli
      />

      {/* 2. OVERLAY (Koyu Gradyan) - Yazıların okunması için */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

      {/* 3. OYNAT/DURDUR İKONU (Ortada beliren) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 p-4 rounded-full backdrop-blur-sm">
            <Play className="w-8 h-8 text-white fill-white" />
          </div>
        </div>
      )}

      {/* 4. SAĞ TARAFTAKİ AKSİYON BUTONLARI */}
      <div className="absolute right-4 bottom-20 flex flex-col items-center gap-6 z-20">
        {/* Profil Resmi */}
        <div className="relative group cursor-pointer">
          <div className="w-12 h-12 rounded-full border-2 border-white p-[1px] overflow-hidden">
             <Image 
               src={data.user.avatar_url || '/placeholder.png'} 
               alt={data.user.username} 
               width={48} 
               height={48} 
               className="object-cover w-full h-full rounded-full"
             />
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-500 rounded-full p-0.5">
             <div className="w-3 h-3 bg-red-500 rounded-full animate-ping absolute" />
             <div className="w-3 h-3 bg-red-500 rounded-full relative" />
          </div>
        </div>

        {/* Beğeni */}
        <div className="flex flex-col items-center gap-1 cursor-pointer">
          <div className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition">
             <Heart 
               size={28} 
               className={cn("transition-colors", data.is_liked ? "fill-red-500 text-red-500" : "text-white")} 
             />
          </div>
          <span className="text-white text-xs font-bold drop-shadow-md">{data.stats.likes}</span>
        </div>

        {/* Yorum */}
        <div className="flex flex-col items-center gap-1 cursor-pointer">
          <div className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition">
             <MessageCircle size={28} className="text-white" />
          </div>
          <span className="text-white text-xs font-bold drop-shadow-md">{data.stats.comments}</span>
        </div>

        {/* Paylaş */}
        <div className="flex flex-col items-center gap-1 cursor-pointer">
          <div className="p-2 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition">
             <Share2 size={28} className="text-white" />
          </div>
          <span className="text-white text-xs font-bold drop-shadow-md">Paylaş</span>
        </div>
        
        {/* Ses Kontrolü */}
        <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="mt-4 p-2 bg-black/50 rounded-full">
            {isMuted ? <VolumeX className="text-white" size={20}/> : <Volume2 className="text-white" size={20}/>}
        </button>
      </div>

      {/* 5. ALT BİLGİ ALANI */}
      <div className="absolute left-4 bottom-6 right-16 z-20 text-white">
        <h3 className="font-bold text-lg mb-2 drop-shadow-md">@{data.user.username}</h3>
        <p className="text-sm opacity-90 line-clamp-2 leading-relaxed drop-shadow-md mb-3">
          {data.description}
        </p>
        
        {/* Müzik Animasyonu (Süs) */}
        <div className="flex items-center gap-2 text-xs font-medium opacity-80">
           <div className="flex gap-0.5 items-end h-3">
              <div className="w-0.5 h-full bg-white animate-[music-bar_0.5s_ease-in-out_infinite]" />
              <div className="w-0.5 h-2 bg-white animate-[music-bar_0.6s_ease-in-out_infinite]" />
              <div className="w-0.5 h-3 bg-white animate-[music-bar_0.7s_ease-in-out_infinite]" />
           </div>
           <span>Orijinal Ses - {data.user.username}</span>
        </div>
      </div>
    </div>
  );
}