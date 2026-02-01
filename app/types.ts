// app/types.ts

// 1. MEVCUT KODLARIN (Bunları aynen koruyoruz)
export interface FlatComment {
  id: string;
  post_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  user_id: string;
  author_name: string;
  author_avatar: string;
  
  author_username?: string; 
  
  woow_count: number;
  doow_count: number;
  adil_count: number;
  reply_count: number;
  
  my_reaction: 'woow' | 'doow' | 'adil' | null;
  score: number;
}

// 2. GÜNCELLENMİŞ PROFİL TİPLERİ
// (Hem mevcut alanları koruduk hem de yeni gizlilik alanlarını ekledik)

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  biography?: string | null;
  
  // Profil sayfasında kullandığımız diğer alanları da buraya ekliyoruz ki hata vermesin
  username?: string | null;
  university?: string | null;
  reputation?: number;
  credits?: number;

  // --- GİZLİLİK ALANLARI ---
  is_private: boolean;           // Eski sistem uyumluluğu için
  is_social_private?: boolean;   // YENİ: Sosyal içerik gizliliği
  is_academic_private?: boolean; // YENİ: Akademik içerik gizliliği
}

// Profile interface'i UserProfile'ı genişletir (inheritance hatasını düzelttik)
export interface Profile extends UserProfile {
  phone?: string | null;
  address?: string | null;
  updated_at?: string;
}