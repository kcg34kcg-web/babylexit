import { Metadata } from 'next';
import LoungeContainer from '@/components/lounge/LoungeContainer';

// Bu kısım tarayıcı sekmesindeki ismi ve SEO açıklamasını ayarlar
export const metadata: Metadata = {
  title: 'Living Lounge | Babylexit',
  description: 'Yapay zeka analiziniz hazırlanırken bekleyiniz.',
};

export default function LoungePage() {
  return <LoungeContainer />;
}