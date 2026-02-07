'use client';

import { Notification } from '@/app/types/notification';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale'; // Türkçe tarih formatı için
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface NotificationItemProps {
  notification: Notification;
  onRead: () => void;
}

export const NotificationItem = ({ notification, onRead }: NotificationItemProps) => {
  const router = useRouter();
  const { actor, type, created_at, is_read, resource_id, resource_type } = notification;

  // Bildirim tipine göre mesaj oluşturma
  const getMessage = () => {
    switch (type) {
      case 'like': return 'gönderini beğendi.';
      case 'comment': return 'sana bir yorum yaptı.';
      case 'reply': return 'yorumuna yanıt verdi.';
      case 'follow': return 'seni takip etmeye başladı.';
      case 'mention': return 'senden bahsetti.';
      case 'system': return 'Sistem mesajı.';
      default: return 'yeni bir etkileşimde bulundu.';
    }
  };

  const handleClick = () => {
    onRead(); // Önce okundu olarak işaretle
    // Sonra ilgili sayfaya git
    if (resource_type === 'post' && resource_id) {
      router.push(`/post/${resource_id}`);
    } else if (resource_type === 'profile' && actor?.username) {
      router.push(`/profile/${actor.username}`); // veya ID
    }
  };

  return (
    <div 
      onClick={handleClick}
      className={`
        flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border-b border-white/5
        ${is_read ? 'bg-transparent hover:bg-white/5 opacity-70' : 'bg-white/10 hover:bg-white/15 border-l-2 border-l-pink-500'}
      `}
    >
      {/* Avatar */}
      <div className="relative w-10 h-10 flex-shrink-0">
        <Image
          src={actor?.avatar_url || '/default-avatar.png'} // Varsayılan avatarın yoksa ekle
          alt={actor?.username || 'User'}
          fill
          className="rounded-full object-cover border border-white/10"
        />
      </div>

      {/* İçerik */}
      <div className="flex-1 text-sm">
        <p className="text-gray-200">
          <span className="font-bold text-white mr-1">{actor?.username || 'Anonim'}</span>
          {getMessage()}
        </p>
        <span className="text-xs text-gray-500 mt-1 block">
          {formatDistanceToNow(new Date(created_at), { addSuffix: true, locale: tr })}
        </span>
      </div>

      {/* Okunmamış Noktası (Görsel Yardımcı) */}
      {!is_read && (
        <div className="w-2 h-2 rounded-full bg-pink-500 mt-2" />
      )}
    </div>
  );
};