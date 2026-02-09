// lib/search-service.ts
export async function googleSearch(query: string) {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        num: 5, // 5 sonuç yeterli
        gl: 'tr',
        hl: 'tr'
      })
    });

    if (!response.ok) {
        throw new Error("Serper API Hatası");
    }

    const data = await response.json();
    
    // Sadece link değil, BAŞLIK ve ÖZET de dönmeliyiz ki AI okusun.
    return data.organic.map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet // <-- Bu çok önemli, AI burayı okuyarak cevap verecek
    }));

  } catch (error) {
    console.error("Search API Error:", error);
    return [];
  }
}