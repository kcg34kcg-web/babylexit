// app/types/video.ts

export interface VideoData {
    id: string;
    video_url: string;     // R2 URL'i (Progressive MP4)
    thumbnail_url: string; // Yüklenirken gösterilecek resim
    description: string;
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
    is_liked: boolean; // Kullanıcı beğenmiş mi?
  }