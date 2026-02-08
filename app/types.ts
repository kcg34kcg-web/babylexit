// app/types.ts

// --- 0. SHARED PRIMITIVES & ENUMS (The Foundation) ---
export type UUID = string; // Semantic alias for strings that are database IDs
export type ISODateString = string; // e.g., "2024-02-07T10:00:00Z"
export type ReactionType = 'woow' | 'doow' | 'adil';

// Defines the legacy vs new location structure
export type CoordinateLocation = { name: string; lat?: number; lng?: number };
export type EventLocation = CoordinateLocation | string | null;

export type EventStatus = 'upcoming' | 'live' | 'archived';

// --- 1. SHARED INTERFACES (Mixins) ---
export interface InteractionStats {
  woow_count: number;
  doow_count: number;
  adil_count: number;
  // Note: comment_count/reply_count are specific to the entity, so they stay on the main type
}

export interface AuthorDetails {
  author_name: string;
  author_username?: string;
  author_avatar: string;
  author_reputation?: number;
}

// --- 2. POST DATA STRUCTURE ---
export interface PostData extends InteractionStats, AuthorDetails {
  // Core Identity
  id: UUID;
  user_id: UUID;
  created_at: ISODateString;
  
  // Content
  content: string;
  image_url?: string;
  category?: string;

  // Event / Living Ticket Logic
  is_event?: boolean;
  event_date?: ISODateString | null;
  event_location?: EventLocation;
  event_status?: EventStatus;

  // Interactions (Extended from InteractionStats)
  comment_count: number;
  my_reaction: ReactionType | null;
  
  // State & Flags
  score?: number;
  is_private?: boolean;
  is_following_author?: boolean;
}

// --- 3. COMMENT STRUCTURE ---
export interface FlatComment extends InteractionStats {
  id: UUID;
  post_id: UUID;
  parent_id: UUID | null;
  user_id: UUID;
  created_at: ISODateString;
  
  content: string;

  // Author Info
  author_name: string;
  author_avatar: string;
  author_username?: string;

  // Interactions
  reply_count: number;
  my_reaction: ReactionType | null;
  score: number;
}

// --- 4. PROFILE STRUCTURES ---
export interface UserProfile {
  id: UUID;
  username?: string | null;
  full_name: string | null;
  avatar_url: string | null;
  biography?: string | null;
  
  university?: string | null;
  reputation?: number;
  credits?: number;

  // Privacy Settings (Base)
  is_private: boolean;           
  // Note: These might be redundant here if using ExtendedProfile strictly, 
  // but kept for backward compatibility if needed.
  is_social_private?: boolean;   
  is_academic_private?: boolean; 
}

// ✅ GÜNCELLEME: İstenilen alanlar eklendi
export interface ExtendedProfile extends UserProfile {
  is_social_private?: boolean;
  is_academic_private?: boolean;
  
  // YENİ EKLENENLER:
  ai_endorsements?: number;    // AI Onay Sayısı
  community_upvotes?: number;  // Topluluk Beğeni Sayısı
}

// Extended Profile (Private data / Owner view)
export interface Profile extends UserProfile {
  phone?: string | null;
  address?: string | null;
  updated_at?: ISODateString;
}

// --- 5. POLL STRUCTURES ---
export interface PollOption {
  id: UUID;
  poll_id: UUID;
  option_text: string;
  vote_count: number;
  display_order: number;
}

export interface Poll {
  id: UUID;
  creator_id: UUID;
  
  question: string;
  is_anonymous: boolean;
  is_closed: boolean;
  
  created_at: ISODateString;
  expires_at: ISODateString;
  
  options: PollOption[];
  
  // Context
  user_vote?: UUID | null;
  
  // Analytics
  total_votes?: number; 
}