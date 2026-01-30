'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
// BookOpen ikonunu buraya ekledik
import { Home, PlusCircle, ShoppingCart, User, Book, BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  // MENÜ ÖĞELERİNİ BURADA DÜZENLEDİK
  const navItems = [
    { href: '/', icon: Home, label: 'Ana Akış' },
    { href: '/ask', icon: PlusCircle, label: 'Soru Sor' },
    { href: '/questions', icon: Book, label: 'Cevapla' },
    { href: '/market', icon: ShoppingCart, label: 'Market', badge: 'Beta' },
    
    // --- YENİ EKLENEN KISIM BAŞLANGIÇ ---
    { href: '/publications', icon: BookOpen, label: 'Yayınlar', badge: 'Yeni' },
    // --- YENİ EKLENEN KISIM BİTİŞ ---
    
    { href: '/profile', icon: User, label: 'Hesabım' },
  ];

  return (
    <aside
      className={clsx(
        "fixed md:relative inset-y-0 left-0 transform md:translate-x-0 transition-transform duration-200 ease-in-out",
        "w-64 bg-slate-900 text-slate-200 p-4 flex flex-col z-40",
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="text-3xl font-bold text-amber-500 mb-8 text-center">
        Babylexit
      </div>
      <nav className="flex-1">
        <ul>
          {navItems.map((item) => (
            <li key={item.href} className="mb-4">
              <Link
                href={item.href}
                className={twMerge(
                  "flex items-center p-3 rounded-lg hover:bg-slate-700 transition-colors",
                  pathname === item.href && 'bg-amber-500 text-slate-900 font-medium shadow-md shadow-amber-500/20'
                )}
                onClick={onClose}
              >
                <item.icon size={20} className="mr-3" />
                <span className="text-lg">{item.label}</span>
                {item.badge && (
                  <span className={clsx(
                    "ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full",
                    // Aktifse koyu yazı, pasifse amber yazı
                    pathname === item.href 
                      ? "bg-slate-900 text-amber-500" 
                      : "bg-amber-500 text-slate-900"
                  )}>
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto p-4 border-t border-slate-700">
        {user ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img
                src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.user_metadata?.full_name || user.email}`}
                alt="User Avatar"
                className="w-10 h-10 rounded-full mr-3 bg-slate-700 object-cover"
              />
              <span className="text-slate-200 text-sm truncate max-w-[100px]" title={user.user_metadata?.full_name || user.email}>
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </span>
            </div>
            <button onClick={handleLogout} className="text-amber-500 hover:text-amber-400 text-xs font-bold ml-2">
              Çıkış
            </button>
          </div>
        ) : (
          <Link href="/login" className="text-amber-500 hover:text-amber-400 text-sm flex justify-center w-full font-bold">
            Giriş Yap
          </Link>
        )}
      </div>
    </aside>
  );
}