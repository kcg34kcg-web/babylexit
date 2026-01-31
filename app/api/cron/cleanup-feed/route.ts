import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis'; 

export async function GET(request: Request) {
  // Vercel Cron veya dış servis güvenliği
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const KEY = 'babylexit:global_feed';
    
    // 1. Skoru 0.1'in altında olanları temizle
    await redis.zremrangebyscore(KEY, '-inf', 0.1);

    // 2. 7 günden (604800 saniye) eski postları temizle
    // Not: ZSET'te score olarak rank_score kullandığımız için 
    // zaman bazlı temizliği 'member' (postId) üzerinden başka bir stratejiyle veya 
    // sadece düşük skorluları silerek yönetiyoruz.
    
    // Opsiyonel: Sadece en popüler 1000 postu tut, gerisini sil
    await redis.zremrangebyrank(KEY, 0, -1001);

    return NextResponse.json({ success: true, message: 'Global feed cleaned.' });
  } catch (error) {
    console.error('Cron Error:', error);
    return NextResponse.json({ success: false, error: 'Cleanup failed' });
  }
}