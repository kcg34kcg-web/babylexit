// app/types.ts

// --- 0. SHARED PRIMITIVES & ENUMS (The Foundation) ---
// Critique Addressed: "ID values repeatedly typed as string", "Timestamps repeated", "Inline enums"

export type UUID = string; // Semantic alias for strings that are database IDs
export type ISODateString = string; // e.g., "2024-02-07T10:00:00Z"
export type ReactionType = 'woow' | 'doow' | 'adil';

// Defines the legacy vs new location structure
export type CoordinateLocation = { name: string; lat?: number; lng?: number };
export type EventLocation = CoordinateLocation | string | null;

export type EventStatus = 'upcoming' | 'live' | 'archived';

// --- 1. SHARED INTERFACES (Mixins) ---
// Critique Addressed: "Reaction counters separated", "Duplicate types"

// Standardizes how we track interactions across Posts and Comments
export interface InteractionStats {
  woow_count: number;
  doow_count: number;
  adil_count: number;
  // Note: comment_count/reply_count are specific to the entity, so they stay on the main type
}

// Standardizes how we display author info
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
  event_location?: EventLocation; // Now uses the clean type defined above
  event_status?: EventStatus;

  // Interactions (Extended from InteractionStats)
  comment_count: number;
  my_reaction: ReactionType | null; // Uses shared ReactionType
  
  // State & Flags
  score?: number; // Kept optional to match your current system flow
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

  // Author Info (Manually listed to match your exact DB join structure)
  author_name: string;
  author_avatar: string;
  author_username?: string;

  // Interactions
  reply_count: number;
  my_reaction: ReactionType | null;
  score: number; // Required in comments per your existing logic
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

  // Privacy Settings
  is_private: boolean;           
  is_social_private?: boolean;   
  is_academic_private?: boolean; 
}

// Extended Profile (Private data)
// Critique Addressed: "Mixes private and public data".
// We keep inheritance for now to not break your profile page, 
// but clarify that these fields are only available to the owner.
export interface Profile extends UserProfile {
  phone?: string | null;
  address?: string | null;
  updated_at?: ISODateString;
}

// --- 5. POLL STRUCTURES (NEW & IMPROVED) ---
// Critique Addressed: "Lacks aggregate fields"

export interface PollOption {
  id: UUID;
  poll_id: UUID;
  option_text: string;
  vote_count: number; // Denormalized count
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
  user_vote?: UUID | null; // The option_id the user voted for
  
  // Analytics (Added as optional for future scalability)
  total_votes?: number; 
}