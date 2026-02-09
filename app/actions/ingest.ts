'use server';

import { createClient } from '@/utils/supabase/server';
import { chunkText } from '@/utils/rag-chunking';
import { generateEmbedding } from '@/lib/ai/embedding';
import { revalidatePath } from 'next/cache';

/**
 * Bir metni alır, parçalar, vektörleştirir ve veritabanına kaydeder.
 */
export async function ingestDocument(
  content: string,
  metadata: Record<string, any> = {}
) {
  const supabase = await createClient();
  
  // 1. Yetki Kontrolü
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Oturum açmanız gerekiyor.' };
  }

  try {
    // 2. Metni Chunk'lara ayır (Yaklaşık 1000 karakterlik parçalar)
    const chunks = chunkText(content, 1000, 150);

    console.log(`Processing ${chunks.length} chunks for user ${user.id}...`);

    // 3. Her chunk için embedding oluştur ve kaydet
    // Not: Gerçek prodüksiyonda bu işlem Promise.all ile paralel yapılabilir 
    // ancak Rate Limit'e takılmamak için sıralı (for..of) yapıyoruz veya batch kullanıyoruz.
    
    const documentsToInsert = [];

    for (const chunkContent of chunks) {
      const embedding = await generateEmbedding(chunkContent);
      
      documentsToInsert.push({
        content: chunkContent,
        metadata: { ...metadata, chunkIndex: documentsToInsert.length },
        embedding,
        user_id: user.id,
      });
    }

    // 4. Toplu kayıt (Batch Insert)
    const { error } = await supabase
      .from('documents')
      .insert(documentsToInsert);

    if (error) {
      throw error;
    }

    revalidatePath('/dashboard'); // Gerekirse ilgili sayfayı yenile
    return { success: true, chunkCount: chunks.length };

  } catch (error: any) {
    console.error('Ingestion Error:', error);
    return { success: false, error: error.message };
  }
}