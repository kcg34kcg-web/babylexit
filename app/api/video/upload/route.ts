import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Cloudflare R2 Bağlantısı
const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  // 1. Güvenlik: Kullanıcı giriş yapmış mı?
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { fileType, fileSize } = await request.json();

    // 2. Kontrol: Dosya çok mu büyük? (50MB Sınırı)
    if (fileSize > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Dosya boyutu 50MB\'ı geçemez.' }, { status: 400 });
    }

    // 3. Dosya İsmi Üretme (Çakışmayı önlemek için UUID)
    // Örn: videos/user_123/random-uuid.mp4
    const fileExtension = fileType.split('/')[1] || 'mp4';
    const fileName = `videos/${user.id}/${uuidv4()}.${fileExtension}`;

    // 4. Presigned URL Oluşturma (İmzalı Link)
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      ContentType: fileType,
    });

    // Link 1 dakika (60 sn) geçerli olsun
    const signedUrl = await getSignedUrl(R2, command, { expiresIn: 60 });

    return NextResponse.json({ 
      uploadUrl: signedUrl, 
      storagePath: fileName 
    });

  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: 'Upload URL oluşturulamadı' }, { status: 500 });
  }
}