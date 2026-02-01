'use client'

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { BadgeCheck, ShieldCheck, Zap } from 'lucide-react'; // YENİ: İkonlar eklendi
import ReactionBar from './ReactionBar';
import CommentSection from './CommentSection';
import WiltedRoseMenu from './WiltedRoseMenu';

// Backend veya View'dan gelen veri tipleri
interface PostProps {
  post: {
    id: string;
    user_id: string; 
    content: string;
    image_url?: string;
    created_at: string;
    author_name: string;
    author_username?: string;
    author_avatar: string;
    author_reputation?: number; // YENİ: Rozet için eklendi
    woow_count: number;
    doow_count: number;
    adil_count: number;
    comment_count: number;
    my_reaction: 'woow' | 'doow' | 'adil' | null;
    score?: number; 
  };
  currentUserId: string | null;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function FeedPost({ 
  post, 
  currentUserId, 
  isExpanded, 
  onToggle 
}: PostProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  // Optimistic UI
  const [isVisible, setIsVisible] = useState(true);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  
  // İçerik Kısaltma Mantığı
  const MAX_LENGTH = 280;
  const isTooLong = post.content.length > MAX_LENGTH;
  const displayContent = isTooLong && !isContentExpanded
    ? post.content.slice(0, MAX_LENGTH) + "..." 
    : post.content;

  // --- SORUN 3 ÇÖZÜMÜ: GİZLİ ÜYE BUG FIX ---
  // Eğer post benimse ve sistem bana "Gizli Üye" veya null isim döndürdüyse, bunu düzelt.
  const isOwner = currentUserId === post.user_id;
  const displayName = isOwner && (post.author_name === "Gizli Üye" || !post.author_name)
    ? "Ben (Siz)" // veya kullanıcının kendi ismi context'ten alınabilir
    : post.author_name || "İsimsiz Kullanıcı";

  // --- SORUN 2 ÇÖZÜMÜ: ROZET MANTIĞI ---
  const renderBadge = () => {
    const rep = post.author_reputation || 0;
    
    if (rep >= 5000) { // Elite / Admin Seviyesi
      return <ShieldCheck size={16} className="text-pink-500 ml-1 inline-block" fill="currentColor" stroke="white" />;
    }
    if (rep >= 1000) { // Gold / Master Seviyesi
      return <Zap size={16} className="text-amber-400 ml-1 inline-block" fill="currentColor" stroke="white" />;
    }
    if (rep >= 100) { // Verified / Standart Onaylı
      return <BadgeCheck size={16} className="text-blue-500 ml-1 inline-block" fill="currentColor" stroke="white" />;
    }
    return null;
  };

  if (!isVisible) return null;

  /* eslint-disable react-hooks/rules-of-hooks */
  useEffect(() => {
    if (!isExpanded || !cardRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) onToggle();
      },
      { threshold: 0 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [isExpanded, onToggle]);

  const goToFullView = () => router.push(`/questions/${post.id}`);
  
  const goToProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/profile/${post.user_id}`);
  };

  return (
    <div ref={cardRef} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow relative group animate-in fade-in slide-in-from-bottom-4">
      
      {/* HEADER */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={goToFullView}>
            {/* Avatar */}
            <div 
              className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold overflow-hidden border border-slate-100 transition-transform hover:scale-105"
              onClick={goToProfile}
            >
              {post.author_avatar ? (
                <Image 
                  src={post.author_avatar} 
                  alt="Avatar" 
                  width={40} 
                  height={40} 
                  className="object-cover w-full h-full"
                />
              ) : (
                displayName?.[0]?.toUpperCase() || 'U'
              )}
            </div>

            {/* --- SORUN 1 VE 2 ÇÖZÜMÜ: İSİM, USERNAME VE ROZET GÖSTERİMİ --- */}
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-0.5">
                  <h3 
                      className="font-bold text-slate-900 text-[15px] leading-tight hover:underline transition-colors"
                      onClick={goToProfile}
                  >
                      {displayName}
                  </h3>
                  {renderBadge()}
              </div>
              
              {/* Kullanıcı Adı: Eğer veri varsa göster, yoksa gösterme */}
              {post.author_username && (
                 <span className="text-xs text-slate-500 font-medium -mt-0.5 mb-0.5 block">
                    @{post.author_username}
                 </span>
              )}

              <div className="text-xs text-slate-400 flex gap-1 items-center">
                 <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: tr })}</span>
                 {post.score !== undefined && <span className="text-slate-300">• Skor: {post.score.toFixed(1)}</span>}
              </div>
            </div>
        </div>

        {/* WILTED ROSE MENU */}
        <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <WiltedRoseMenu 
                postId={post.id} 
                authorId={post.user_id} 
                onOptimisticHide={() => setIsVisible(false)} 
            />
        </div>
      </div>

      {/* İÇERİK */}
      <div className="px-4 pb-2">
        <p className="text-slate-700 whitespace-pre-wrap mb-3 leading-relaxed text-[15px]">
          {displayContent}
          {isTooLong && !isContentExpanded && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsContentExpanded(true);
              }}
              className="text-amber-600 font-medium hover:underline ml-1 inline-block"
            >
              Devamını gör
            </button>
          )}
        </p>

        {post.image_url && (
          <div 
            className="relative w-full h-64 mb-3 rounded-xl overflow-hidden border border-slate-100 cursor-pointer shadow-sm"
            onClick={goToFullView}
          >
            <Image src={post.image_url} alt="Post Görseli" fill className="object-cover" />
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="px-4 pb-4 border-t border-slate-50 pt-2 bg-slate-50/50">
        <ReactionBar 
          targetId={post.id}
          targetType="post"
          initialCounts={{
            woow: post.woow_count,
            doow: post.doow_count,
            adil: post.adil_count,
            comment_count: post.comment_count
          }}
          initialUserReaction={post.my_reaction}
          isOwner={isOwner}
          onMuzakereClick={onToggle} 
        />
      </div>

      {/* YORUMLAR */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/30 px-4 py-4 animate-in slide-in-from-top-2">
          <CommentSection postId={post.id} postOwnerId={post.user_id} />
        </div>
      )}
    </div>
  );
}