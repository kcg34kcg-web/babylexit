'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import ChatDialog from '@/components/chat/ChatDialog';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileTabs from '@/components/profile/ProfileTabs';
import SocialTabContent from '@/components/profile/SocialTabContent';
import AcademicTabContent from '@/components/profile/AcademicTabContent';
import { ExtendedProfile } from '@/app/types';

export default function DynamicProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = params.id as string;
  const supabase = createClient();

  // URL'de ?view=academic varsa Katı Mod
  const isStrictAcademic = searchParams.get('view') === 'academic';

  const [profile, setProfile] = useState<ExtendedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'social' | 'academic'>(
    isStrictAcademic ? 'academic' : 'social'
  );

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) setProfile(profileData as ExtendedProfile);

      if (user && user.id !== userId) {
        const { data: followData } = await supabase
          .from('follows')
          .select('status')
          .eq('follower_id', user.id)
          .eq('following_id', userId)
          .single();
        if (followData) setFollowStatus(followData.status as 'pending' | 'accepted');
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
    } else {
      const { error } = await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', userId);
      if (!error) setFollowStatus('none');
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Profil yükleniyor...</div>;
  if (!profile) return <div className="p-10 text-center">Kullanıcı bulunamadı.</div>;

  // --- KİLİT MANTIĞI (DOĞRU OLAN BURASI) ---
  const isOwner = currentUserId === userId;
  const isFollowing = followStatus === 'accepted';

  // Eğer kullanıcı "Sosyal Gizlilik" açtıysa VE (Takipçi değilsek VE Sahibi değilsek) -> KİLİTLE
  const isSocialLocked = profile.is_social_private && !isOwner && !isFollowing;

  // Eğer kullanıcı "Akademik Gizlilik" açtıysa VE (Takipçi değilsek VE Sahibi değilsek) -> KİLİTLE
  // Bu değişken true olduğunda "AcademicTabContent" kilit ekranı gösterecek.
  const isAcademicLocked = profile.is_academic_private && !isOwner && !isFollowing;

  return (
    <div className="max-w-4xl mx-auto py-4 px-4 pb-20 relative">
      
      <ChatDialog 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)}
        recipientId={userId}
        recipientName={profile.full_name || 'Kullanıcı'}
        recipientAvatar={profile.avatar_url || undefined}
        currentUser={{ id: currentUserId }}
      />

      {/* 1. HEADER (Burada isLocked göndermiyoruz veya sadece ikon için gönderiyoruz, veriyi gizlemiyoruz) */}
      <ProfileHeader 
        profile={profile}
        isOwner={isOwner}
        followStatus={followStatus}
        // isLocked={isSocialLocked && isAcademicLocked} // İstersen tamamen gizli ikonunu göstermek için kullanabilirsin ama veriyi silmez.
        onFollow={handleFollow}
        onMessage={() => setIsChatOpen(true)}
      />

      {/* 2. SEKMELER (Kilit ikonları burada görünür) */}
      <ProfileTabs 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isStrictAcademic={isStrictAcademic}
        isSocialLocked={isSocialLocked}
        isAcademicLocked={isAcademicLocked}
      />

      {/* 3. İÇERİK (Asıl verinin gizlendiği yer burası) */}
      <div className="min-h-[300px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {!isStrictAcademic && activeTab === 'social' && (
           <SocialTabContent 
             userId={userId} 
             isLocked={isSocialLocked} 
           />
        )}

        {activeTab === 'academic' && (
           <AcademicTabContent 
             profile={profile} 
             // 👇 İŞTE BU PROP! Eğer bu true giderse, TabContent veriyi çekmez, kilit ekranı gösterir.
             isLocked={isAcademicLocked} 
           />
        )}

      </div>
    </div>
  );
}