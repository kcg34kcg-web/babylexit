import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack ayarını siliyoruz çünkü alttaki dosyayı silince buna gerek kalmayacak.
  // Eğer özel bir ayar yapmıyorsanız burayı boş bırakmak en iyisidir.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qnztayioarnuzacbktlv.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;