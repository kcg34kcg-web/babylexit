'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  PlusSquare, 
  MessageSquare, 
  ShoppingCart, 
  User, 
  LogOut, 
  BookOpen, 
  FileText, 
  Heart,
  Flame, 
  Home   
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

  // --- CSS STYLES (Animasyonlar + Scrollbar Gizleme) ---
  const globalStyles = `
    /* Ateş/Kıvılcım Animasyonu */
    @keyframes rise {
      0% { transform: translateY(0) scale(1); opacity: 0; }
      50% { opacity: 1; }
      100% { transform: translateY(-20px) scale(0); opacity: 0; }
    }
    .spark {
      position: absolute;
      width: 4px;
      height: 4px;
      background-color: #fbbf24;
      border-radius: 50%;
      animation: rise 1.5s infinite linear;
      bottom: 10px;
      left: 50%;
      pointer-events: none;
    }
    .spark:nth-child(1) { left: 40%; animation-duration: 1.2s; animation-delay: 0.1s; background-color: #f87171; }
    .spark:nth-child(2) { left: 60%; animation-duration: 1.8s; animation-delay: 0.3s; background-color: #fb923c; }
    .spark:nth-child(3) { left: 45%; animation-duration: 2.2s; animation-delay: 0.5s; background-color: #ef4444; }

    /* Scrollbar Gizleme (Chrome, Safari, Opera, Firefox, IE, Edge) */
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }
  `;

  // Navigasyon Listesi
  const navigation = [
    { name: 'Soru Sor', href: '/ask', icon: PlusSquare },
    { name: 'Cevapla', href: '/questions', icon: MessageSquare },
    { name: 'Sorularım & Cevaplarım', href: '/my-content', icon: FileText },
    { name: 'Favoriler', href: '/favorites', icon: Heart },
    { name: 'Yayınlar', href: '/publications', icon: BookOpen },
    { name: 'Market', href: '/market', icon: ShoppingCart },
    { name: 'Hesabım', href: '/profile', icon: User },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950">
      <style jsx global>{globalStyles}</style>

      {/* --- 1. MASAÜSTÜ YAN MENÜ (SIDEBAR) --- */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col fixed h-full z-10">
        
        {/* Logo Alanı */}
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-black bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent tracking-tight">
            Babylexit
          </h1>
          <p className="text-[10px] text-slate-500 mt-1 font-medium tracking-wide">AI POWERED LEGAL ASSISTANT</p>
        </div>

        {/* 'no-scrollbar' class eklendi -> Görsel çubuk gitti ama scroll çalışır */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto no-scrollbar">
          
          {/* --- LEXWOOW BUTONU (CANLI TASARIM) --- */}
          <Link
            href="/social" 
            className={`group relative flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-300 mb-6 overflow-hidden
              ${pathname === '/social' 
                ? 'bg-slate-800 border border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.2)]' 
                : 'bg-slate-900 border border-slate-800 hover:border-orange-500/50 hover:bg-slate-800'
              }
            `}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 to-rose-600/10 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="absolute left-6 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
               <div className="spark"></div>
               <div className="spark"></div>
               <div className="spark"></div>
            </div>

            <div className={`relative z-10 p-2 rounded-lg transition-all duration-300 
              ${pathname === '/social' ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-800 text-orange-500 group-hover:bg-orange-500 group-hover:text-white group-hover:shadow-[0_0_10px_#f97316]'}
            `}>
               <Flame size={20} className={pathname === '/social' ? 'animate-pulse' : 'group-hover:animate-bounce'} />
            </div>
            
            <div className="flex flex-col relative z-10">
              <span className="font-black text-lg tracking-wide bg-gradient-to-r from-orange-400 via-rose-500 to-amber-500 bg-clip-text text-transparent group-hover:scale-105 transition-transform">
                Lexwoow
              </span>
            </div>
          </Link>
          {/* -------------------------------------------------- */}

          {/* Diğer Menü Öğeleri */}
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            
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
        
        <Link href="/social" className={`flex flex-col items-center gap-1 p-2 rounded-lg ${pathname === '/social' ? 'text-orange-500' : 'text-slate-500'}`}>
          <Flame size={22} className={pathname === '/social' ? 'fill-orange-500 animate-pulse' : ''} />
          <span className="text-[10px] font-bold bg-gradient-to-r from-orange-400 to-rose-500 bg-clip-text text-transparent">Lexwoow</span>
        </Link>

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