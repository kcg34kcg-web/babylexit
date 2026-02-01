'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Search, 
  BookOpen, 
  ShoppingCart, 
  User, 
  LogOut,
  Zap,
  Heart,      // Favoriler
  FileText,   // Sorularım / Cevaplarım
  Users       // Lexwoow (Sosyal) ikonu
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Çıkış yapıldı');
    router.push('/login');
  };

  const navItems = [
    { label: 'Ana Akış', href: '/', icon: Home },
    { label: 'Keşfet', href: '/explore', icon: Search }, // Keşfet linkini varsayılan yaptım, düzeltebilirsin
    
    // İSTEDİĞİN YENİ MENÜLER
    { label: 'Sorularım & Cevaplarım', href: '/my-content', icon: FileText },
    { label: 'Favoriler', href: '/favorites', icon: Heart },

    { label: 'Yayınlar', href: '/publications', icon: BookOpen },
    { label: 'Market', href: '/market', icon: ShoppingCart },
    { label: 'Profil', href: '/profile', icon: User },
  ];

  return (
    <div className="hidden md:flex flex-col w-64 h-screen bg-slate-950 border-r border-slate-800 fixed left-0 top-0 overflow-hidden z-50">
      
      {/* LOGO */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-black bg-gradient-to-r from-amber-500 to-orange-600 text-transparent bg-clip-text">
          Babylexit
        </h1>
        <p className="text-[10px] text-slate-500 mt-1 font-medium tracking-wide">Beta v1.0</p>
      </div>

      {/* NAVİGASYON */}
      <div className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar mt-4">
        
        {/* LEXWOOW SOSYAL BUTONU (Düzeltildi) */}
        {/* Link: /social (Senin sosyal medya sayfanın route'u bu olmalı) */}
        <Link 
          href="/social" 
          className={cn(
            "flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-300 group mb-6 relative overflow-hidden",
            pathname === '/social' 
              ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-900/50 scale-[1.02]" 
              : "bg-slate-900/50 text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 hover:border-fuchsia-500/50"
          )}
        >
          {/* Hover Efekti */}
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className={cn(
            "p-1.5 rounded-lg transition-colors",
            pathname === '/social' ? "bg-white/20" : "bg-slate-800 group-hover:bg-fuchsia-500 group-hover:text-white"
          )}>
            {/* Sosyal medya olduğu için Users ikonu kullandım, istersen Zap yapabilirsin */}
            <Users size={20} className={pathname === '/social' ? "text-white fill-white" : ""} />
          </div>
          
          <div className="flex flex-col">
            <span className="font-bold tracking-wide relative z-10 leading-none">Lexwoow</span>
            {/* "AI Asistan" yazısı SİLİNDİ */}
          </div>
          
          {/* Pulse Noktası */}
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse shadow-[0_0_10px_#d946ef]"></span>
        </Link>

        {/* DİĞER LİNKLER */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                isActive 
                  ? "bg-amber-500/10 text-amber-500 font-bold" 
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
              )}
            >
              {isActive && (
                <div className="absolute left-0 w-1 h-6 bg-amber-500 rounded-r-full" />
              )}
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

      {/* FOOTER */}
      <div className="p-4 border-t border-slate-800">
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