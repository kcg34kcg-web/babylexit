import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { NotificationPopover } from '@/components/notifications/NotificationPopover';

export default async function Navbar() {
  const supabase = await createClient();
  
  // Kullanıcı oturumunu sunucu tarafında kontrol ediyoruz
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className="bg-[#1e293b] text-[#f59e0b] p-4 flex justify-between items-center relative z-50">
      <Link href="/">
        <p className="text-2xl font-bold">Babylexit</p>
      </Link>
      
      <div className="flex items-center gap-4">
        {user ? (
          <>
            {/* Kullanıcı giriş yapmışsa: Bildirim Çiçeği */}
            <NotificationPopover userId={user.id} />
            
            {/* Profil Linki (Mevcut renk şemasını koruyarak) */}
            <Link 
              href="/profile" 
              className="hover:text-amber-300 transition-colors font-medium"
            >
              Profil
            </Link>
          </>
        ) : (
          /* Kullanıcı yoksa (Fallback): Giriş Linkleri */
          /* Kullanıcı "zaten giriş yapmış" olsa bile session hatası durumunda burası kurtarıcı olur */
          <div className="flex items-center gap-4">
            <Link href="/login" className="mr-4 hover:text-amber-300 transition-colors">Login</Link>
            <Link href="/signup" className="hover:text-amber-300 transition-colors">Signup</Link>
          </div>
        )}
      </div>
    </nav>
  );
}