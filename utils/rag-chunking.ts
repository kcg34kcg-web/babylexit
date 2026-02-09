/**
 * Metni belirli bir uzunlukta ve anlam bütünlüğünü koruyarak parçalara ayırır.
 * Türkçe karakterlere ve cümle bitişlerine öncelik verir.
 */
export function chunkText(
    text: string, 
    maxLength: number = 1000, 
    overlap: number = 100
  ): string[] {
    // 1. Gereksiz boşlukları temizle
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    
    // 2. Cümle bazlı bölme (Nokta, soru işareti, ünlem sonrası boşluk)
    // Bu regex, noktalama işaretini cümlenin sonunda tutar.
    const sentences = normalizedText.match(/[^.?!]+[.?!]+(\s+|$)|[^.?!]+$/g) || [normalizedText];
    
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      // Eğer mevcut chunk + yeni cümle limiti aşıyorsa, mevcut chunk'ı kaydet
      if ((currentChunk + sentence).length > maxLength && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        
        // Overlap (Örtüşme) mantığı:
        // Bağlamı korumak için bir önceki chunk'ın son kısmını yeni chunk'ın başına ekle
        const overlapText = currentChunk.slice(-overlap); 
        // Kelime ortasından bölmemek için son boşluktan sonrasını almayalım (basit yaklaşım)
        currentChunk = overlapText + sentence; 
      } else {
        currentChunk += sentence;
      }
    }
    
    // Son kalan parçayı ekle
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }