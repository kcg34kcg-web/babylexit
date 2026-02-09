// lib/search-service.ts
export async function googleSearch(query: string): Promise<string[]> {
    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': process.env.SERPER_API_KEY || '', // .env'ye ekle
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: query,
          num: 6, // En alakalı 6 sonuç yeterli (Token tasarrufu)
          gl: 'tr', // Türkiye lokasyonu
          hl: 'tr'  // Türkçe sonuçlar
        })
      });
  
      const data = await response.json();
      
      // Sadece organik sonuçların linklerini al
      return data.organic.map((item: any) => item.link);
    } catch (error) {
      console.error("Search API Error:", error);
      return [];
    }
  }