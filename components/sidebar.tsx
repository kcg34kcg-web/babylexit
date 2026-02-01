'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Search, 
  PlusCircle, 
  MessageSquare, 
  BookOpen, 
  ShoppingCart, 
  User, 
  LogOut,
  Zap,
  Heart,      // Favoriler için
  FileText,   // Sorularım/Cevaplarım için
  Settings
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { cn } from '@/utils/cn';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navItems = [
    { label: 'Ana Akış', href: '/main', icon: Home },
    { label: 'Keşfet', href: '/social', icon: Search },
    
    // --- YENİ EKLENENLER (Senin İstediğin Yer) ---
    { label: 'Sorularım & Cevaplarım', href: '/my-content', icon: FileText },
    { label: 'Favoriler', href: '/favorites', icon: Heart },
    // ---------------------------------------------

    { label: 'Yayınlar', href: '/publications', icon: BookOpen },
    { label: 'Market', href: '/market', icon: ShoppingCart },
    { label: 'Profil', href: '/profile', icon: User },
  ];

  return (
    <div className="hidden md:flex flex-col w-64 h-screen bg-slate-950 border-r border-slate-800 fixed left-0 top-0">
      
      {/* LOGO ALANI */}
      <div className="p-6">
        <h1 className="text-2xl font-black bg-gradient-to-r from-amber-500 to-orange-600 text-transparent bg-clip-text">
          babylexit
        </h1>
      </div>

      {/* NAVİGASYON LİSTESİ */}
      <div className="flex-1 px-4 space-y-2 overflow-y-auto">
        
        {/* LEXWOOW ÖZEL BUTONU (Canlı ve Renkli) */}
        <Link 
          href="/lexwoow"
          className={cn(
            "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group mb-6 relative overflow-hidden",
            pathname === '/lexwoow' 
              ? "bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-purple-900/50" 
              : "bg-slate-900/50 text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 hover:border-fuchsia-500/50"
          )}
        >
          {/* Arka plan hover efekti */}
          <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className={cn(
            "p-1.5 rounded-lg transition-colors",
            pathname === '/lexwoow' ? "bg-white/20" : "bg-slate-800 group-hover:bg-fuchsia-500 group-hover:text-white"
          )}>
            <Zap size={20} className={pathname === '/lexwoow' ? "text-white fill-white" : ""} />
          </div>
          <span className="font-bold tracking-wide relative z-10">Lexwoow AI</span>
          
          {/* New Badge */}
          <span className="absolute right-2 top-3 w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse"></span>
        </Link>


        {/* DİĞER LİNKLER */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-amber-500/10 text-amber-500 font-bold" 
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
              )}
            >
              <Icon 
                size={20} 
                className={cn(
                  "transition-colors",
                  isActive ? "text-amber-500" : "text-slate-500 group-hover:text-amber-500"
                )} 
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* ALT KISIM (Ayarlar & Çıkış) */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all"
        >
          <LogOut size={20} />
          <span>Çıkış Yap</span>
        </button>
      </div>
    </div>
  );
}