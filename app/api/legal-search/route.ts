import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    // Senin Python servisinin çalıştığı adres (Genelde 8000 portu)
    const PYTHON_SERVICE_URL = 'http://localhost:8000/search';

    const response = await fetch(PYTHON_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Arama hatası:', error);
    return NextResponse.json({ error: 'Python servisine ulaşılamadı' }, { status: 500 });
  }
}