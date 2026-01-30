'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusSquare, MessageSquare, ShoppingCart, User, LogOut } from 'lucide-react';
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

  // MENÜ LİNKLERİ (İşte aradığın "Cevapla" butonu burada)
  const navigation = [
    { name: 'Ana Akış', href: '/', icon: Home },
    { name: 'Soru Sor', href: '/ask', icon: PlusSquare },
    { name: 'Cevapla', href: '/questions', icon: MessageSquare }, // <-- EKSİK OLAN BUYDU!
    { name: 'Market', href: '/market', icon: ShoppingCart },
    { name: 'Hesabım', href: '/profile', icon: User }, // DİKKAT: Klasör adın 'profile' olmalı
  ];

  return (
    <div className="flex min-h-screen bg-slate-950">
      
      {/* --- SOL MENÜ (SIDEBAR) --- */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:flex flex-col fixed h-full z-10">
        
        {/* Logo Alanı */}
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-amber-700 bg-clip-text text-transparent">
            Babylexit
          </h1>
          <p className="text-xs text-slate-500 mt-1">Beta v1.0</p>
        </div>

        {/* Linkler */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Çıkış Yap Butonu */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* --- ANA İÇERİK ALANI --- */}
      <main className="flex-1 md:ml-64 relative">
        {children}
      </main>
    </div>
  );
}