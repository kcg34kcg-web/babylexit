// utils/python-bridge.ts

export interface PythonResponse {
  text: string;
  source_links: string[]; // Bu satırı ekledik
  route: string;
}

export async function askBabyLexitEngine(query: string): Promise<PythonResponse> {
  try {
    const res = await fetch('http://127.0.0.1:8000/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) throw new Error('Python servisine ulaşılamadı');

    const data = await res.json();
    
    // Python'dan gelen 'cached_response'u 'text'e haritalıyoruz
    return {
      text: data.cached_response || "",
      source_links: data.source_links || [], // Python'dan gelen linkleri al
      route: data.route || "WEB_SEARCH"
    };
    
  } catch (error) {
    console.error("AI Engine Error:", error);
    return {
      text: "",
      source_links: [],
      route: "ERROR"
    };
  }
}