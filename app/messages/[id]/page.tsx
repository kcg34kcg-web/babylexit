import { createClient } from '@/utils/supabase/server';
import { getMessages } from '@/app/actions/chat';
import ChatWindow from '@/components/chat/ChatWindow';
import { redirect } from 'next/navigation';

export default async function ChatPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Güvenlik Kontrolü: Kullanıcı bu sohbette mi?
  const { data: participation } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!participation) {
    // Erişim hakkı yoksa veya konuşma yoksa
    redirect('/messages'); 
  }

  // 2. İlk Mesajları Sunucuda Çek (SEO ve Hız için)
  // İlk 20 mesajı alıyoruz (sayfa 0)
  const initialMessages = await getMessages(params.id, 0);

  return (
    <div className="h-full w-full">
      <ChatWindow 
        conversationId={params.id} 
        initialMessages={initialMessages} 
        currentUser={user} 
      />
    </div>
  );
}