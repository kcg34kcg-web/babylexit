'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import PostList from '@/components/PostList';
import { User, Lock, MessageCircle, BookOpen, Smile, ShieldAlert } from 'lucide-react';
import { UserProfile } from '@/app/types';

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
  
  // Aktif Sekme
  const [activeTab, setActiveTab] = useState<'social' | 'academic'>('social');

  // Veri Çekme
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Profili Çek
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) {
        setProfile(profileData as ExtendedProfile);
      }

      // Takip Durumunu Çek
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
    
    // Takip İsteği Gönder
    if (followStatus === 'none') {
      const requiresApproval = profile?.is_social_private || profile?.is_academic_private;
      const targetStatus = requiresApproval ? 'pending' : 'accepted';
      
      const { error } = await supabase.from('follows').insert({ follower_id: currentUserId, following_id: userId, status: targetStatus });
      if (!error) setFollowStatus(targetStatus);
    } 
    // Takibi Bırak
    else {
      const { error } = await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', userId);
      if (!error) setFollowStatus('none');
    }
  };

  if (loading) return <div className="p-10 text-center">Yükleniyor...</div>;
  if (!profile) return <div className="p-10 text-center">Kullanıcı bulunamadı.</div>;

  const isOwner = currentUserId === userId;
  const isFollowing = followStatus === 'accepted';

  // 🔥 KRİTİK GİZLİLİK MANTIĞI
  const isSocialLocked = profile.is_social_private && !isOwner && !isFollowing;
  const isAcademicLocked = profile.is_academic_private && !isOwner && !isFollowing;
  const isFullyPrivate = profile.is_social_private && profile.is_academic_private;

  return (
    <div className="max-w-4xl mx-auto py-4 px-4 pb-20">
      
      {/* --- HEADER KARTI --- */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-purple-100 to-blue-50 -z-0"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 mt-4">
          {/* Avatar */}
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white p-1 shadow-lg flex-shrink-0">
            <div className="w-full h-full rounded-full bg-slate-100 overflow-hidden relative flex items-center justify-center">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name || ''} className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-slate-300" />
              )}
            </div>
          </div>

          {/* İsim ve Bio */}
          <div className="flex-1 text-center md:text-left mb-2">
            <div className="flex flex-col md:flex-row items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">{profile.full_name}</h1>
              
              {/* DÜZELTİLEN KISIM: Kilit İkonu */}
              {isFullyPrivate && (
                <span title="Gizli Hesap" className="cursor-help flex items-center justify-center">
                   <Lock size={16} className="text-slate-400" />
                </span>
              )}
            </div>
            <p className="text-slate-600 max-w-lg">{profile.biography || "Henüz biyografi eklenmemiş."}</p>
          </div>

          {/* Butonlar */}
          <div className="flex items-center gap-3">
            {!isOwner ? (
              <>
                <button 
                  onClick={handleFollow}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full font-medium transition-all ${followStatus === 'none' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  {followStatus === 'none' 
                    ? (isFullyPrivate || isSocialLocked || isAcademicLocked ? 'İstek Gönder' : 'Takip Et') 
                    : (followStatus === 'pending' ? 'İstek Gönderildi' : 'Takip Ediliyor')}
                </button>
                <button className="p-2 rounded-full border border-slate-200 hover:bg-slate-50">
                  <MessageCircle size={20} className="text-slate-600" />
                </button>
              </>
            ) : (
              <a href="/profile" className="px-5 py-2 rounded-full bg-white border border-slate-200 text-slate-700 font-medium hover:bg-slate-50">
                Profili Düzenle
              </a>
            )}
          </div>
        </div>
      </div>

      {/* --- SEKMELER (TABS) --- */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('social')}
          className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
            activeTab === 'social' ? 'text-purple-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Smile size={18} />
          Müzakereler (Sosyal)
          {isSocialLocked && <Lock size={12} className="text-slate-400" />}
          {activeTab === 'social' && <div className="absolute bottom-0 w-full h-0.5 bg-purple-600 rounded-t-full" />}
        </button>

        <button
          onClick={() => setActiveTab('academic')}
          className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
            activeTab === 'academic' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BookOpen size={18} />
          Kürsü (Akademik)
          {isAcademicLocked && <Lock size={12} className="text-slate-400" />}
          {activeTab === 'academic' && <div className="absolute bottom-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
        </button>
      </div>

      {/* --- İÇERİK ALANI --- */}
      <div className="min-h-[300px]">
        
        {/* 1. SOSYAL SEKME */}
        {activeTab === 'social' && (
          isSocialLocked ? (
            <div className="bg-slate-50 rounded-3xl p-12 text-center border border-slate-200 shadow-inner flex flex-col items-center justify-center h-64">
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4 text-slate-400">
                <Lock size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Sosyal Paylaşımlar Gizli</h3>
              <p className="text-slate-500 max-w-xs mx-auto mt-2">
                Bu kullanıcının sosyal paylaşımlarını görmek için takip etmelisin.
              </p>
            </div>
          ) : (
            <PostList userId={userId} />
          )
        )}

        {/* 2. AKADEMİK SEKME */}
        {activeTab === 'academic' && (
           isAcademicLocked ? (
            <div className="bg-slate-50 rounded-3xl p-12 text-center border border-slate-200 shadow-inner flex flex-col items-center justify-center h-64">
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4 text-slate-400">
                <ShieldAlert size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Akademik Geçmiş Gizli</h3>
              <p className="text-slate-500 max-w-xs mx-auto mt-2">
                Bu kullanıcının yapay zeka ile yaptığı akademik çalışmaları görmek için takip etmelisin.
              </p>
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-slate-500 font-medium">Akademik soru geçmişi burada listelenecek.</p>
              <p className="text-xs text-slate-400 mt-1">Erişim izniniz var ✅</p>
            </div>
          )
        )}

      </div>
    </div>
  );
}