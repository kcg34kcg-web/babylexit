// Dosya: utils/lexical-id.ts

/**
 * BU DOSYA, KELİMELERİ BENZERSİZ SAYILARA (ID) ÇEVİRİR.
 * Babylexit AI'ın "Keyword Search" motorunun kalbidir.
 */

// 1. GÜRÜLTÜ FİLTRESİ (Stop Words)
// Bu kelimeler anlam taşımaz, ID üretmeye gerek yok.
const TURKISH_STOP_WORDS = new Set([
    "ve", "veya", "ile", "ama", "fakat", "lakin", "ancak", "çünkü", "oysa",
    "bir", "bu", "şu", "o", "bunlar", "şunlar", "onlar",
    "mı", "mi", "mu", "mü", "mısın", "misin",
    "için", "gibi", "kadar", "diye", "bile", "dahi",
    "ben", "sen", "o", "biz", "siz", "onlar",
    "var", "yok", "olan", "ilgili", "dair"
  ]);
  
  /**
   * 2. HASH ALGORİTMASI (FNV-1a)
   * Kelimeyi 32-bitlik bir tamsayıya çevirir.
   * Çok hızlıdır ve çakışma riski düşüktür.
   */
  function fnv1aHash(str: string): number {
    let hash = 2166136261; // FNV offset basis
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      // Bitwise çarpma simülasyonu (32-bit integer güvenliği için)
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    // Negatif sayı dönmemesi için Mutlak Değer alıyoruz
    return Math.abs(hash >>> 0);
  }
  
  /**
   * 3. ANA FONKSİYON
   * Bir metni alır, temizler ve benzersiz ID dizisi döndürür.
   */
  export function generateLexicalIds(text: string): number[] {
    if (!text) return [];
  
    // A. Normalizasyon (Bug Önleyici: Türkçe karakter desteği)
    const cleanText = text
      .toLocaleLowerCase('tr-TR') // İ -> i dönüşümü doğru yapılsın
      .replace(/[^a-zçğıöşü0-9\s]/g, ""); // Harf ve sayı dışındakileri sil
  
    // B. Parçalama
    const words = cleanText.split(/\s+/);
  
    // C. Filtreleme ve Dönüştürme
    const ids = new Set<number>(); // Set kullanarak tekrar edenleri engelliyoruz
  
    for (const word of words) {
      // - 2 harften kısa kelimeleri atla (Örn: "ev" kalabilir ama "a" gitsin)
      // - Stop word listesinde varsa atla
      if (word.length > 2 && !TURKISH_STOP_WORDS.has(word)) {
        const id = fnv1aHash(word);
        ids.add(id);
      }
    }
  
    // Set'i Array'e çevirip döndür
    return Array.from(ids);
  }