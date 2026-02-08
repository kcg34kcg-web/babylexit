'use client';

import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play, MapPin, Music } from 'lucide-react';
import { cn } from '@/utils/cn';
import { VideoData } from '@/app/types/video';

interface VideoItemProps {
  data: VideoData;
  isActive: boolean; 
}

export default function VideoItem({ data, isActive }: VideoItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
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
    <div className="relative w-full h-[100dvh] snap-start bg-transparent overflow-hidden flex items-center justify-center group">
      
      {/* 1. VİDEO */}
      <video
        ref={videoRef}
        src={data.video_url}
        poster={data.thumbnail_url}
        className="h-full w-full object-cover"
        loop
        playsInline 
        muted={isMuted} 
        onClick={togglePlay}
        preload="auto"
      />

      {/* 2. GÖLGE KATMANI (Alttan yukarı) */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none" />

      {/* 3. OYNAT BUTONU (Orta) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 p-4 rounded-full backdrop-blur-md border border-white/10 animate-pulse">
            <Play className="w-8 h-8 text-white fill-white" />
          </div>
        </div>
      )}

      {/* 4. SAĞ MENÜ (Etkileşim) */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-20">
        
        {/* Avatar */}
        <div className="relative cursor-pointer transition hover:scale-110">
          <div className="w-12 h-12 rounded-full border-2 border-white p-[2px]">
             <Image 
               src={data.user.avatar_url || '/placeholder.png'} 
               alt={data.user.username} 
               width={48} 
               height={48} 
               className="object-cover w-full h-full rounded-full"
             />
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-rose-500 rounded-full p-0.5">
             <div className="w-3 h-3 bg-rose-500 rounded-full animate-ping absolute" />
             <div className="w-3 h-3 bg-rose-500 rounded-full relative" />
          </div>
        </div>

        {/* Butonlar */}
        {[
          { icon: Heart, count: data.stats.likes, color: data.is_liked ? 'text-rose-500 fill-rose-500' : 'text-white' },
          { icon: MessageCircle, count: data.stats.comments, color: 'text-white' },
          { icon: Share2, label: 'Paylaş', color: 'text-white' }
        ].map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-1 cursor-pointer group/btn">
            <div className="p-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/5 hover:bg-white/20 transition-all active:scale-90">
               <item.icon size={26} className={item.color} />
            </div>
            <span className="text-white text-[10px] font-bold drop-shadow-md">
              {item.count !== undefined ? item.count : item.label}
            </span>
          </div>
        ))}

        <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="mt-2 p-2.5 bg-black/40 rounded-full backdrop-blur-sm border border-white/10">
            {isMuted ? <VolumeX className="text-white" size={20}/> : <Volume2 className="text-white" size={20}/>}
        </button>
      </div>

      {/* 5. SOL ALT BİLGİ (Metadata) */}
      <div className="absolute left-4 bottom-8 right-16 z-20 text-white space-y-3">
        
        {/* Kullanıcı ve Konum */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-lg drop-shadow-md hover:underline cursor-pointer">@{data.user.username}</h3>
            {/* Tarih Bilgisi (Basit haliyle) */}
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white/80">
               {data.created_at ? new Date(data.created_at).toLocaleDateString('tr-TR') : 'Bugün'}
            </span>
          </div>
          
          {data.location && (
            <div className="flex items-center gap-1 text-xs text-rose-200 bg-rose-500/20 w-fit px-2 py-1 rounded-full backdrop-blur-sm mb-2">
              <MapPin size={12} /> {data.location}
            </div>
          )}
        </div>

        {/* Açıklama */}
        <p className="text-sm opacity-90 line-clamp-3 leading-relaxed drop-shadow-sm font-light">
          {data.description}
        </p>
        
        {/* Müzik (Marquee Efekti) */}
        <div className="flex items-center gap-3">
           <div className="p-1.5 bg-white/10 rounded-full animate-spin-slow">
              <Music size={14} />
           </div>
           <div className="overflow-hidden w-40">
             <div className="flex gap-2 text-xs font-medium opacity-90 whitespace-nowrap animate-marquee">
               <span>{data.music_meta?.title || 'Orijinal Ses'}</span>
               <span className="text-white/50">•</span>
               <span>{data.music_meta?.artist || data.user.username}</span>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}