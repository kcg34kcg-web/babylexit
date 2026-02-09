import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Yeni satırları boşlukla değiştir (OpenAI önerisi)
    const cleanText = text.replace(/\n/g, ' ');

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: cleanText,
      dimensions: 1536, // Veritabanındaki sütun boyutuyla eşleşmeli
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation error:', error);
    throw new Error('Metin vektöre dönüştürülemedi.');
  }
}