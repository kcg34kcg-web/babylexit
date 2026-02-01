'use client'

import EventLifecycle from './EventLifecycle'; // <--- YENİ (Kullanılıyor)
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format, isPast, isToday } from 'date-fns';
import { tr } from 'date-fns/locale';
// ICONS
import { BadgeCheck, ShieldCheck, Zap, MapPin, Ticket } from 'lucide-react'; 
import ReactionBar from './ReactionBar';
import CommentSection from './CommentSection';
import WiltedRoseMenu from './WiltedRoseMenu';
import { PostData } from '@/app/types';
import { cn } from '@/utils/cn';

interface PostProps {
  post: PostData;
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

  // --- EVENT / TICKET LOGIC ---
  const isEvent = post.is_event && post.event_date;
  const eventDate = post.event_date ? new Date(post.event_date) : null;
  const isLive = eventDate && isToday(eventDate);
  const isArchived = eventDate && isPast(eventDate) && !isToday(eventDate);
  
  // Safe JSONB location parsing
  const locationName = typeof post.event_location === 'object' && post.event_location !== null
    ? (post.event_location as any).name 
    : post.event_location;

  // ROZET RENDER MANTIĞI
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

  // --- TICKET STUB COMPONENT ---
  const TicketStub = () => {
    if (!eventDate) return null;
    
    return (
      <div 
        onClick={goToFullView}
        className={cn(
          "relative group/stub w-full md:w-36 flex-shrink-0 flex md:flex-col items-center justify-center p-4 border-t md:border-t-0 md:border-l border-dashed border-slate-300 bg-slate-50 transition-colors cursor-pointer",
          isLive ? "bg-red-50/50 border-red-200" : "",
          isArchived ? "bg-slate-100 grayscale" : ""
        )}
      >
        {/* Decorative Perforations */}
        <div className="absolute -left-1.5 top-[-6px] w-3 h-3 rounded-full bg-white border border-slate-200 hidden md:block" />
        <div className="absolute -left-1.5 bottom-[-6px] w-3 h-3 rounded-full bg-white border border-slate-200 hidden md:block" />

        {/* Date Display */}
        <div className="text-center flex flex-row md:flex-col items-baseline md:items-center gap-2 md:gap-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {format(eventDate, 'MMM', { locale: tr })}
          </span>
          <span className={cn(
            "text-3xl font-black text-slate-800",
            isLive && "text-red-600 animate-pulse"
          )}>
            {format(eventDate, 'dd')}
          </span>
          <span className="text-xs text-slate-500">
            {format(eventDate, 'yyyy')}
          </span>
        </div>

        {/* Location & Status (UPDATED for PHASE 4) */}
        <div className="mt-0 md:mt-4 ml-auto md:ml-0 flex flex-col items-end md:items-center w-full">
          {locationName && (
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium max-w-[100px] truncate mb-1">
              <MapPin size={12} className={isLive ? "text-red-500" : ""} />
              <span className="truncate">{locationName}</span>
            </div>
          )}
          
          {/* FAZ 4: Statik Rozet Yerine 'EventLifecycle' Butonu Geldi */}
          <div className="w-full md:w-auto">
             <EventLifecycle eventDate={post.event_date!} locationName={locationName} />
          </div>

        </div>
      </div>
    );
  };

  return (
    <div 
      ref={cardRef} 
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow relative group animate-in fade-in slide-in-from-bottom-4"
    >
      
      {/* MAIN WRAPPER: Handles Flex Row for Tickets */}
      <div className={cn("flex flex-col", isEvent && "md:flex-row")}>
        
        {/* LEFT SIDE: MAIN CONTENT */}
        <div className="flex-1 min-w-0 flex flex-col">
          
          {/* HEADER SECTION */}
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

                {/* USER INFO */}
                <div className="flex flex-col justify-center">
                  <div className="flex items-center">
                      <h3 
                          className="font-bold text-slate-900 text-[15px] leading-tight hover:underline transition-colors mr-1"
                          onClick={goToProfile}
                      >
                          {post.author_name}
                      </h3>
                      {renderBadge()}
                  </div>
                  
                  {post.author_username && (
                     <span className="text-sm text-slate-500 font-medium block -mt-0.5">
                        @{post.author_username}
                     </span>
                  )}

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

          {/* CONTENT SECTION */}
          <div className="px-4 pb-2">
            
            {/* Mobile Event Badge */}
            {isEvent && (
              <div className="mb-2 inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-600 md:hidden">
                <Ticket size={12} />
                <span>Etkinlik</span>
              </div>
            )}

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

          {/* FOOTER SECTION */}
          <div className="px-4 pb-4 border-t border-slate-50 pt-2 bg-slate-50/50 mt-auto">
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
        </div>

        {/* RIGHT SIDE: TICKET STUB (Rendered only if Event) */}
        {isEvent && <TicketStub />}

      </div>

      {/* COMMENT SECTION (Outside Flex Row - Full Width) */}
      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50/30 px-4 py-4 animate-in slide-in-from-top-2">
          <CommentSection postId={post.id} postOwnerId={post.user_id} />
        </div>
      )}
    </div>
  );
}