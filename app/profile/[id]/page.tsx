'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import PostList from '@/components/PostList';
import ChatDialog from '@/components/chat/ChatDialog'; // ✅ Modal Bileşeni
import { User, Lock, BookOpen, Smile, ShieldAlert, MessageCircle, UserPlus, Check, Sparkles } from 'lucide-react';
import { UserProfile } from '@/app/types';
import { toast } from 'sonner';

// Genişletilmiş Profil Tipi
interface ExtendedProfile extends UserProfile {
  is_social_private?: boolean;
  is_academic_private?: boolean;
}

export default function DynamicProfilePage() {
  const params = useParams();
  const userId = params.id as string;
  const supabase = createClient();

  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // ✅ Sohbet Penceresi State'i
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'social' | 'academic'>('social');

  // Veri Çekme
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) {
        setProfile(profileData as ExtendedProfile);
      }

      if (user && user.id !== userId) {
        const { data: followData } = await supabase
          .from('follows')
          .select('status')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .single();
        
        if (followData) {
          setFollowStatus(followData.status as 'pending' | 'accepted');
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [userId, supabase]);

  const handleFollow = async () => {
    if (!currentUserId) return;
    
    if (followStatus === 'none') {
      const requiresApproval = profile?.is_social_private || profile?.is_academic_private;
      const targetStatus = requiresApproval ? 'pending' : 'accepted';
      
      const { error } = await supabase.from('follows').insert({ follower_id: currentUserId, following_id: userId, status: targetStatus });
      if (!error) setFollowStatus(targetStatus);
    } 
    else {
      const { error } = await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', userId);
      if (!error) setFollowStatus('none');
    }
  };

  // ✅ Sayfa değişmeden pencereyi açan fonksiyon
  const handleMessageClick = () => {
    if (!currentUserId) {
        toast.error("Mesaj göndermek için giriş yapmalısın.");
        return;
    }
    setIsChatOpen(true);
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Profil yükleniyor...</div>;
  if (!profile) return <div className="p-10 text-center">Kullanıcı bulunamadı.</div>;

  const isOwner = currentUserId === userId;
  const isFollowing = followStatus === 'accepted';
  const isSocialLocked = profile.is_social_private && !isOwner && !isFollowing;
  const isAcademicLocked = profile.is_academic_private && !isOwner && !isFollowing;
  const isFullyPrivate = profile.is_social_private && profile.is_academic_private;

  return (
    <div className="max-w-4xl mx-auto py-4 px-4 pb-20 relative">
      
      {/* ✅ Chat Dialog Bileşeni */}
      <ChatDialog 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)}
        recipientId={userId}
        recipientName={profile.full_name || 'Kullanıcı'}
        // DÜZELTME: null gelirse undefined yapıyoruz (TypeScript hatasını çözer)
        recipientAvatar={profile.avatar_url || undefined}
        currentUser={{ id: currentUserId }}
      />

      {/* --- HEADER KARTI --- */}
      <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-xl shadow-slate-200/60 border border-slate-100 mb-8 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-violet-100 via-fuchsia-50 to-amber-50 -z-0"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 mt-8">
          {/* Avatar */}
          <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-white p-1.5 shadow-2xl flex-shrink-0 relative group-hover:scale-105 transition-transform duration-500">
            <div className="w-full h-full rounded-full bg-slate-100 overflow-hidden relative flex items-center justify-center border border-slate-100">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name || ''} className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-slate-300" />
              )}
            </div>
            <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 border-4 border-white rounded-full"></div>
          </div>

          <div className="flex-1 text-center md:text-left mb-2">
            <div className="flex flex-col md:flex-row items-center gap-3 mb-2 justify-center md:justify-start">
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">{profile.full_name}</h1>
              {isFullyPrivate && (
                <span title="Gizli Hesap" className="bg-slate-100 p-1.5 rounded-full">
                   <Lock size={14} className="text-slate-500" />
                </span>
              )}
            </div>
            <p className="text-slate-600 max-w-lg text-lg leading-relaxed">{profile.biography || "Henüz biyografi eklenmemiş."}</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-center">
            {!isOwner ? (
              <>
                <button 
                  onClick={handleFollow}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all active:scale-95 shadow-lg shadow-slate-200
                    ${followStatus === 'none' 
                        ? 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-xl' 
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
                >
                  {followStatus === 'none' ? <UserPlus size={18} /> : <Check size={18} />}
                  {followStatus === 'none' 
                    ? (isFullyPrivate || isSocialLocked || isAcademicLocked ? 'İstek Gönder' : 'Takip Et') 
                    : (followStatus === 'pending' ? 'İstek yollandı' : 'Takiptesin')}
                </button>
                
                {/* 🔥 HAREKETLİ MESAJ BUTONU 🔥 */}
                <button 
                    onClick={handleMessageClick}
                    className="group relative flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95 overflow-hidden"
                >
                    {/* Arkaplan Efekti */}
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>

                    {/* İkon */}
                    <MessageCircle size={20} className="group-hover:rotate-12 transition-transform" />
                    <span className="relative z-10">Mesaj Gönder</span>
                    
                    {/* Yıldız Efekti */}
                    <Sparkles size={16} className="absolute top-1 right-2 text-yellow-300 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100" />
                </button>
              </>
            ) : (
              <a href="/profile" className="px-6 py-3 rounded-full bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors shadow-sm">
                Profili Düzenle
              </a>
            )}
          </div>
        </div>
      </div>

      {/* --- SEKMELER (TABS) --- */}
      <div className="flex border-b border-slate-200 mb-8 px-4">
        <button
          onClick={() => setActiveTab('social')}
          className={`flex-1 pb-4 text-sm font-bold flex items-center justify-center gap-2 transition-all relative ${
            activeTab === 'social' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Smile size={20} className={activeTab === 'social' ? 'fill-purple-100' : ''} />
          Müzakereler
          {isSocialLocked && <Lock size={14} className="text-slate-400 opacity-50" />}
          {activeTab === 'social' && (
             <div className="absolute bottom-0 w-full h-1 bg-purple-600 rounded-t-full shadow-[0_-2px_10px_rgba(147,51,234,0.5)]" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('academic')}
          className={`flex-1 pb-4 text-sm font-bold flex items-center justify-center gap-2 transition-all relative ${
            activeTab === 'academic' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <BookOpen size={20} className={activeTab === 'academic' ? 'fill-blue-100' : ''} />
          Kürsü Geçmişi
          {isAcademicLocked && <Lock size={14} className="text-slate-400 opacity-50" />}
          {activeTab === 'academic' && (
            <div className="absolute bottom-0 w-full h-1 bg-blue-600 rounded-t-full shadow-[0_-2px_10px_rgba(37,99,235,0.5)]" />
          )}
        </button>
      </div>

      {/* --- İÇERİK ALANI --- */}
      <div className="min-h-[300px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* 1. SOSYAL SEKME */}
        {activeTab === 'social' && (
          isSocialLocked ? (
            <div className="bg-slate-50/50 rounded-[2rem] p-12 text-center border border-slate-200/60 shadow-inner flex flex-col items-center justify-center h-80">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 text-slate-300 shadow-sm border border-slate-100">
                <Lock size={36} />
              </div>
              <h3 className="text-xl font-black text-slate-800">İçerikler Gizli 🔒</h3>
              <p className="text-slate-500 max-w-xs mx-auto mt-2 font-medium">
                Bu kullanıcının paylaşımlarını görmek için takip isteği göndermelisin.
              </p>
            </div>
          ) : (
            <PostList userId={userId} />
          )
        )}

        {/* 2. AKADEMİK SEKME */}
        {activeTab === 'academic' && (
           isAcademicLocked ? (
            <div className="bg-slate-50/50 rounded-[2rem] p-12 text-center border border-slate-200/60 shadow-inner flex flex-col items-center justify-center h-80">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 text-slate-300 shadow-sm border border-slate-100">
                <ShieldAlert size={36} />
              </div>
              <h3 className="text-xl font-black text-slate-800">Akademik Arşiv Kapalı 🛡️</h3>
              <p className="text-slate-500 max-w-xs mx-auto mt-2 font-medium">
                Yapay zeka ile yapılan çalışmaları incelemek için bu kullanıcıyı takip etmelisin.
              </p>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200 group hover:border-blue-200 transition-colors cursor-default">
              <div className="w-16 h-16 mx-auto bg-blue-50 text-blue-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                 <BookOpen size={32} />
              </div>
              <p className="text-slate-600 font-bold text-lg">Akademik soru geçmişi</p>
              <p className="text-slate-400 mt-1">Henüz listelenecek bir veri yok.</p>
              <span className="inline-block mt-4 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                 Erişim Açık ✅
              </span>
            </div>
          )
        )}

      </div>
    </div>
  );
}