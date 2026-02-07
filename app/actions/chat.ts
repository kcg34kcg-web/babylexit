'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

const MAX_CHAR_LIMIT = 1000;

/**
 * Yeni bir sohbet başlatır veya varsa mevcut olanı getirir.
 */
export async function startConversation(recipientId: string) {
  const supabase = await createClient();
  
  // RPC fonksiyonunu çağır (SQL adımında oluşturduğumuz get_or_create_dm)
  const { data: conversationId, error } = await supabase.rpc('get_or_create_dm', {
    recipient_id: recipientId
  });

  if (error) {
    console.error('Error starting chat:', error);
    throw new Error('Sohbet başlatılamadı');
  }

  return conversationId;
}

/**
 * Mesaj gönderir (Karakter limiti ve dosya yükleme dahil)
 * UI'daki kalıcı state güncellemesi için yeni oluşturulan mesajı döndürür.
 */
export async function sendMessage(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Yetkisiz işlem');

  const conversationId = formData.get('conversationId') as string;
  const content = formData.get('content') as string;
  const file = formData.get('file') as File | null;

  // 1. Karakter Limiti Kontrolü
  if (content && content.length > MAX_CHAR_LIMIT) {
    throw new Error(`Mesaj çok uzun! Maksimum ${MAX_CHAR_LIMIT} karakter.`);
  }

  let mediaUrl = null;
  let mediaType = null;

  // 2. Dosya Yükleme İşlemi
  if (file && file.size > 0) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${conversationId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(filePath, file);

    if (uploadError) throw new Error('Dosya yüklenemedi: ' + uploadError.message);
    
    mediaUrl = filePath;
    mediaType = file.type.split('/')[0];
  }

  // 3. Mesajı Veritabanına Ekle ve geri döndür (.select().single())
  const { data: newMessage, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content,
      media_url: mediaUrl,
      media_type: mediaType,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // 4. Konuşmayı Güncelle (Son mesaj önizlemesi ve zamanı)
  await supabase
    .from('conversations')
    .update({ 
        updated_at: new Date().toISOString(), 
        last_message_preview: content ? content.substring(0, 50) : (mediaType ? '📎 Medya' : 'Dosya gönderildi') 
    })
    .eq('id', conversationId);

  revalidatePath(`/messages/${conversationId}`);
  
  return newMessage; // ✅ Mesaj objesini geri döndürüyoruz (UI için kritik)
}

/**
 * Konuşmadaki mesajları okundu olarak işaretler.
 */
export async function markMessagesAsRead(conversationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if(!user) return;

  await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id);
}

/**
 * Mesajları sayfalı şekilde getirir ve imzalı URL (Signed URL) oluşturur.
 */
export async function getMessages(conversationId: string, page: number = 0) {
    const supabase = await createClient();
    const pageSize = 20;
    
    const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

    if (data) {
        const signedData = await Promise.all(data.map(async (msg) => {
            if (msg.media_url && !msg.deleted_at) {
                const { data: signed } = await supabase.storage
                    .from('chat-files')
                    .createSignedUrl(msg.media_url, 3600);
                return { ...msg, signedUrl: signed?.signedUrl };
            }
            return msg;
        }));
        return signedData.reverse(); 
    }
    return [];
}

/**
 * Kullanıcının konuşma listesini (Gelen Kutusu) getirir.
 */
export async function getUserConversations() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('conversation_participants')
    .select(`
      conversation_id,
      last_read_at,
      conversations (
        updated_at,
        last_message_preview
      ),
      other_participant: conversation_participants!conversation_participants_conversation_id_fkey (
        user_id
      )
    `)
    .eq('user_id', user.id)
    .neq('other_participant.user_id', user.id)
    .order('conversation_id');

  if (error) {
    console.error('Konuşmalar getirilemedi:', error);
    return [];
  }
  
  return data.map((item: any) => ({
    id: item.conversation_id,
    updated_at: item.conversations?.updated_at,
    last_message: item.conversations?.last_message_preview,
    otherUserId: item.other_participant?.[0]?.user_id,
    last_read_at: item.last_read_at
  })).sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

/**
 * Kullanıcı adı veya isme göre kullanıcı arar.
 */
export async function searchUsers(query: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !query || query.length < 2) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url')
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .neq('id', user.id) 
    .limit(10);

  if (error) {
    console.error('Kullanıcı arama hatası:', error);
    return [];
  }

  return data || [];
}