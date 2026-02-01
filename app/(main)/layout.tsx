'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  PlusSquare, 
  MessageSquare, 
  ShoppingCart, 
  User, 
  LogOut, 
  BookOpen, 
  Users,      // Lexwoow (Sosyal) ikonu
  FileText,   // Sorularım/Cevaplarım için
  Heart       // Favoriler için
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Çıkış yapıldı');
    router.push('/login');
  };

  // Navigasyon Listesi
  const navigation = [
    { name: 'Ana Akış', href: '/', icon: Home },
    // Lexwoow'u buradan çıkardık, özel buton olarak en üste koyacağız
    { name: 'Soru Sor', href: '/ask', icon: PlusSquare },
    { name: 'Cevapla', href: '/questions', icon: MessageSquare },
    
    // --- YENİ EKLENENLER ---
    { name: 'Sorularım & Cevaplarım', href: '/my-content', icon: FileText },
    { name: 'Favoriler', href: '/favorites', icon: Heart },
    // -----------------------

    { name: 'Yayınlar', href: '/publications', icon: BookOpen },
    { name: 'Market', href: '/market', icon: ShoppingCart },
    { name: 'Hesabım', href: '/profile', icon: User },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950">
      
      {/* --- 1. MASAÜSTÜ YAN MENÜ (SIDEBAR) --- */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col fixed h-full z-10">
        
        {/* Logo Alanı */}
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-black bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent tracking-tight">
            Babylexit
          </h1>
          <p className="text-[10px] text-slate-500 mt-1 font-medium tracking-wide">AI POWERED LEGAL ASSISTANT</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          
          {/* ÖZEL LEXWOOW BUTONU (SOSYAL MEDYA LİNKİ) */}
          <Link
            href="/social" 
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group mb-4 relative overflow-hidden ${
              pathname === '/social'
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-900/40'
                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50 hover:border-fuchsia-500/50'
            }`}
          >
            {/* Hover Efekti */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-fuchsia-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className={`p-1.5 rounded-lg transition-colors ${pathname === '/social' ? 'bg-white/20' : 'bg-slate-700 group-hover:bg-fuchsia-500 group-hover:text-white'}`}>
               <Users size={20} className={pathname === '/social' ? 'fill-white' : ''} />
            </div>
            
            <div className="flex flex-col relative z-10">
              <span className="font-bold leading-none">Lexwoow</span>
              {/* Alt yazı kaldırıldı */}
            </div>
          </Link>

          {/* Diğer Menü Öğeleri */}
          {navigation.map((item) => {
            // Ana sayfa '/' olduğu için active kontrolünü özelleştirdik
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium group ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <item.icon size={20} className={`transition-colors ${isActive ? 'text-amber-500' : 'text-slate-500 group-hover:text-slate-300'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer / Çıkış */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors group"
          >
            <LogOut size={20} className="group-hover:text-red-400" />
            <span className="font-medium">Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* --- 2. MOBİL ALT MENÜ --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex justify-around items-center p-2 z-50 safe-area-pb">
        
        <Link href="/" className={`flex flex-col items-center gap-1 p-2 rounded-lg ${pathname === '/' ? 'text-amber-500' : 'text-slate-500'}`}>
          <Home size={22} />
          <span className="text-[10px] font-medium">Akış</span>
        </Link>
        
        {/* Lexwoow Mobilde de /social sayfasına gider */}
        <Link href="/social" className={`flex flex-col items-center gap-1 p-2 rounded-lg ${pathname === '/social' ? 'text-fuchsia-500' : 'text-slate-500'}`}>
          <Users size={22} className={pathname === '/social' ? 'fill-fuchsia-500' : ''} />
          <span className="text-[10px] font-medium">Lexwoow</span>
        </Link>

        {/* Ortadaki "Sor" Butonu */}
        <Link href="/ask" className="flex flex-col items-center justify-center -mt-6">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-3.5 rounded-full shadow-lg shadow-amber-500/30 text-white">
             <PlusSquare size={24} />
          </div>
          <span className="text-[10px] font-medium text-slate-400 mt-1">Sor</span>
        </Link>

        <Link href="/questions" className={`flex flex-col items-center gap-1 p-2 rounded-lg ${pathname.startsWith('/questions') ? 'text-amber-500' : 'text-slate-500'}`}>
          <MessageSquare size={22} />
          <span className="text-[10px] font-medium">Cevapla</span>
        </Link>

        <Link href="/profile" className={`flex flex-col items-center gap-1 p-2 rounded-lg ${pathname.startsWith('/profile') ? 'text-amber-500' : 'text-slate-500'}`}>
          <User size={22} />
          <span className="text-[10px] font-medium">Profil</span>
        </Link>
      </nav>

      {/* --- 3. ANA İÇERİK ALANI --- */}
      <main className="flex-1 md:ml-64 relative pb-24 md:pb-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}