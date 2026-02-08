export interface VideoData {
  id: string;
  video_url: string;
  thumbnail_url: string;
  description: string;
  location?: string; // Yeni: Konum
  music_meta?: {     // Yeni: Müzik Bilgisi
    title: string;
    artist: string;
  };
  user: {
    id: string;
    username: string;
    avatar_url: string;
  };
  stats: {
    likes: number;
    comments: number;
    views: number;
  };
  is_liked: boolean;
  created_at?: string; // Saat gösterimi için
}