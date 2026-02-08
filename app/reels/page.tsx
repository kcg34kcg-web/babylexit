// app/reels/page.tsx
import ReelsContainer from '@/components/reels/ReelsContainer';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ReelsPage() {
  return (
    <main className="w-full h-[100dvh] bg-black relative">
      {/* Geri Dön Butonu (Sol Üst) */}
      <Link 
        href="/" 
        className="absolute top-4 left-4 z-50 p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition"
      >
        <ArrowLeft size={24} />
      </Link>

      {/* Video Oynatıcı */}
      <ReelsContainer />
    </main>
  );
}