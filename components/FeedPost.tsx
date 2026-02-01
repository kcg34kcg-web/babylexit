'use client'

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
// İKONLAR
import { BadgeCheck, ShieldCheck, Zap } from 'lucide-react'; 
import ReactionBar from './ReactionBar';
import CommentSection from './CommentSection';
import WiltedRoseMenu from './WiltedRoseMenu';

interface PostProps {
  post: {
    id: string;
    user_id: string; 
    content: string;
    image_url?: string;
    created_at: string;
    author_name: string;
    author_username?: string; // Kullanıcı adı alanı
    author_avatar: string;
    author_reputation?: number; 
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
  
  const [isVisible, setIsVisible] = useState(true);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  
  const MAX_LENGTH = 280;
  const isTooLong = post.content.length > MAX_LENGTH;
  const displayContent = isTooLong && !isContentExpanded
    ? post.content.slice(0, MAX_LENGTH) + "..." 
    : post.content;

  // ROZET RENDER MANTIĞI (Düzeltildi)
  const renderBadge = () => {
    const rep = post.author_reputation || 0;
    
    // Rozet stilleri
    if (rep >= 5000) return <ShieldCheck size={16} className="text-pink-500 fill-pink-50 ml-1 inline-block align-text-bottom" />;
    if (rep >= 1000) return <Zap size={16} className="text-amber-400 fill-amber-50 ml-1 inline-block align-text-bottom" />;
    if (rep >= 100) return <BadgeCheck size={16} className="text-blue-500 fill-blue-50 ml-1 inline-block align-text-bottom" />;
    return null;
  };

  if (!isVisible) return null;

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
      
      {/* HEADER BÖLÜMÜ */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={goToFullView}>
            
            {/* AVATAR */}
            <div 
              className="w-11 h-11 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold overflow-hidden border border-slate-200 transition-transform hover:scale-105 shadow-sm"
              onClick={goToProfile}
            >
              {post.author_avatar ? (
                <Image 
                  src={post.author_avatar} 
                  alt="Avatar" 
                  width={44} 
                  height={44} 
                  className="object-cover w-full h-full"
                />
              ) : (
                post.author_name?.[0]?.toUpperCase() || '?'
              )}
            </div>

            {/* KULLANICI BİLGİLERİ */}
            <div className="flex flex-col justify-center">
              
              {/* 1. Satır: İsim + Rozet */}
              <div className="flex items-center">
                  <h3 
                      className="font-bold text-slate-900 text-[15px] leading-tight hover:underline transition-colors mr-1"
                      onClick={goToProfile}
                  >
                      {post.author_name}
                  </h3>
                  {renderBadge()}
              </div>
              
              {/* 2. Satır: @kullaniciadi */}
              {/* Eğer author_username varsa göster */}
              {post.author_username && (
                 <span className="text-sm text-slate-500 font-medium block -mt-0.5">
                    @{post.author_username}
                 </span>
              )}

              {/* 3. Satır: Tarih */}
              <div className="text-[11px] text-slate-400 flex gap-1 items-center mt-0.5">
                 <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: tr })}</span>
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
            className="relative w-full h-72 mb-3 rounded-xl overflow-hidden border border-slate-100 cursor-pointer shadow-sm"
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
          isOwner={currentUserId === post.user_id}
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