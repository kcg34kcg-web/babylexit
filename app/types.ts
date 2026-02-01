// app/types.ts

// --- 1. POST VERİ YAPISI (YENİ EKLENDİ) ---
// FeedPost ve Feed akışında kullanılan standart yapı
export interface PostData {
  id: string;
  user_id: string; 
  content: string;
  image_url?: string;
  created_at: string;
  
  // Profil Bilgileri (Zenginleştirilmiş)
  author_name: string;
  author_username?: string;
  author_avatar: string;
  author_reputation?: number; // Rozetler için kritik alan
  
  // Etkileşim Sayaçları
  woow_count: number;
  doow_count: number;
  adil_count: number;
  comment_count: number;
  
  // Kullanıcı Durumu
  my_reaction: 'woow' | 'doow' | 'adil' | null;
  score?: number; 
  is_private?: boolean;
  is_following_author?: boolean;
}

// --- 2. YORUM YAPISI ---
export interface FlatComment {
  id: string;
  post_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  user_id: string;
  
  // Yazar Bilgileri
  author_name: string;
  author_avatar: string;
  author_username?: string; 
  
  // Sayaçlar
  woow_count: number;
  doow_count: number;
  adil_count: number;
  reply_count: number;
  
  my_reaction: 'woow' | 'doow' | 'adil' | null;
  score: number;
}

// --- 3. PROFİL TİPLERİ ---
export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  biography?: string | null;
  
  username?: string | null;
  university?: string | null;
  reputation?: number;
  credits?: number;

  // Gizlilik Alanları
  is_private: boolean;           
  is_social_private?: boolean;   
  is_academic_private?: boolean; 
}

// Profile interface'i UserProfile'ı genişletir
export interface Profile extends UserProfile {
  phone?: string | null;
  address?: string | null;
  updated_at?: string;
}