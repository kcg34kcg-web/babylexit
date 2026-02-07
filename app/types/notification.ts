// app/types/notification.ts

// Mevcut tiplerinden UUID'yi kullanmak istersen import edebilirsin, 
// ama bağımlılık yaratmamak için burada string kullanıyorum.

export type NotificationType = 'like' | 'comment' | 'reply' | 'follow' | 'mention' | 'system';

// Bildirimi tetikleyen kişinin (actor) bilgileri
export interface NotificationActor {
  username: string;
  avatar_url: string | null;
}

export interface Notification {
  id: string; // Veya UUID
  created_at: string;
  recipient_id: string;
  actor_id: string;
  
  // Supabase join işleminden gelecek nesne
  actor?: NotificationActor; 
  
  type: NotificationType;
  resource_id: string | null;   // İlgili post veya yorum ID'si
  resource_type: string | null; // 'post', 'comment' vb.
  is_read: boolean;
  data?: any; // Ekstra JSON verileri (örn: yorum metninin bir kısmı)
}