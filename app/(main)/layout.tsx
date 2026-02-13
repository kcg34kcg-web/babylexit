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
  FileEdit, // <--- 1. YENİ İKON BURAYA EKLENDİ
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

  // --- CSS STYLES ---
  const globalStyles = `
    /* Arka Plan Işıltısı (Shimmer) */
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .animate-shimmer {
      background: linear-gradient(90deg, rgba(251,191,36,0) 0%, rgba(251,191,36,0.1) 50%, rgba(251,191,36,0) 100%);
      background-size: 200% 100%;
      animation: shimmer 3s infinite linear;
    }

    /* Ateş Kıvılcımı */
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
    
    /* Scrollbar Gizleme */
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `;

  const navigation = [
    { name: 'Soru Sor', href: '/ask', icon: PlusSquare },
    { name: 'Cevapla', href: '/questions', icon: MessageSquare },
    
    // --- 2. YENİ MENÜ ÖĞESİ BURAYA EKLENDİ ---
    { name: 'Editör', href: '/editor', icon: FileEdit }, 

    { name: 'Sorularım&Cevaplarım', href: '/my-content', icon: FileText },
    { name: 'Favoriler', href: '/favorites', icon: Heart },
    { name: 'Yayınlar', href: '/publications', icon: BookOpen },
    { name: 'Market', href: '/market', icon: ShoppingCart },
    { name: 'Hesabım', href: '/profile', icon: User },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <style jsx global>{globalStyles}</style>

      {/* --- SIDEBAR (Masaüstü) --- */}
      <aside className="w-72 bg-white border-r border-slate-100 hidden md:flex flex-col fixed h-full z-20 shadow-[2px_0_30px_rgba(0,0,0,0.01)]">
        
        {/* LOGO */}
        <div className="p-8 pb-6">
          <h1 
            onClick={() => router.push('/dashboard')}
            className="text-2xl font-extrabold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent cursor-pointer tracking-tight"
          >
            Babylexit
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium tracking-wide">Legal Assistant AI</p>
        </div>

        {/* MENÜ */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
          
          {/* --- LEXWOOW (CANLI & DİKKAT ÇEKİCİ) --- */}
          <Link
            href="/social" 
            className={`group relative flex items-center gap-3 px-4 py-4 rounded-2xl transition-all duration-300 mb-6 overflow-hidden border
              ${pathname === '/social' 
                ? 'bg-slate-900 border-slate-800 shadow-xl shadow-orange-500/20' // Aktif: Gece Modu
                : 'bg-gradient-to-br from-amber-50 to-orange-50 border-orange-200 hover:shadow-lg hover:shadow-orange-500/10' // Pasif: Sıcak & Davetkar
              }
            `}
          >
            {/* Arka Plan Işıltısı (Sadece Pasifken çalışsın) */}
            {pathname !== '/social' && <div className="absolute inset-0 animate-shimmer pointer-events-none" />}
            
            {/* İkon Kutusu */}
            <div className={`p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110 shadow-sm
              ${pathname === '/social' ? 'bg-orange-600 text-white' : 'bg-white text-orange-500'}`}>
               <Flame size={20} className="fill-current animate-pulse" />
            </div>
            
            <div className="flex flex-col relative z-10">
              <span className={`text-[15px] font-black tracking-tight ${pathname === '/social' ? 'text-white' : 'text-slate-800'}`}>
                Lexwoow
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${pathname === '/social' ? 'text-slate-400' : 'text-orange-600/80'}`}>
                Canlı Sohbet
              </span>
            </div>

            {/* "CANLI" Rozeti (Sağ Üst Köşe) */}
            <div className="absolute top-3 right-3 flex items-center gap-1">
               <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
               </span>
               {pathname !== '/social' && (
                 <span className="text-[9px] font-black text-red-500 tracking-tighter animate-pulse">LIVE</span>
               )}
            </div>

            {/* Kıvılcım Efekti (Sadece Aktifken) */}
            {pathname === '/social' && (
              <div className="absolute right-10 bottom-0 opacity-100">
                 <div className="spark"></div>
              </div>
            )}
          </Link>
          {/* ------------------------------------------- */}

          {/* STANDART LİNKLER (Sakin Tasarım) */}
          <div className="space-y-1">
            <span className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block opacity-80">Menü</span>
            
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative
                    ${isActive
                      ? 'bg-white text-amber-700 shadow-sm border border-amber-100'  
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                    }`}
                >
                  {/* Aktif İkon Rengi */}
                  <item.icon 
                    size={20} 
                    strokeWidth={isActive ? 2.5 : 1.75} 
                    className={`transition-colors ${isActive ? 'text-amber-500 fill-amber-50' : 'text-slate-400 group-hover:text-slate-600'}`} 
                  />
                  
                  <span className={`text-[14px] ${isActive ? 'font-bold tracking-tight' : 'font-medium'}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-slate-500 hover:bg-white hover:text-red-600 rounded-xl transition-colors font-medium text-[14px] group"
          >
            <LogOut size={18} strokeWidth={2} className="group-hover:text-red-500 text-slate-400" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* --- MOBİL MENÜ --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-100 flex justify-around items-center px-2 py-3 z-50 pb-safe shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
        <Link href="/social" className="relative flex flex-col items-center gap-1 p-2 rounded-lg">
           {/* Mobilde de dikkat çeksin */}
           <div className="absolute -top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse border border-white"></div>
           <Flame size={24} className={`${pathname === '/social' ? 'fill-orange-500 text-orange-600' : 'text-slate-400'}`} strokeWidth={2} />
        </Link>

        {/* Mobil Soru Sor Butonu */}
        <Link href="/ask" className="relative -top-5">
           <div className="bg-gradient-to-tr from-amber-500 to-orange-600 p-4 rounded-2xl shadow-lg shadow-orange-500/30 text-white transform transition active:scale-95">
             <PlusSquare size={24} strokeWidth={2.5} />
           </div>
        </Link>

        <Link href="/questions" className={`flex flex-col items-center gap-1 p-2 rounded-lg ${pathname.startsWith('/questions') ? 'text-amber-600' : 'text-slate-400'}`}>
          <MessageSquare size={22} strokeWidth={pathname.startsWith('/questions') ? 2.5 : 2} />
        </Link>

        <Link href="/profile" className={`flex flex-col items-center gap-1 p-2 rounded-lg ${pathname.startsWith('/profile') ? 'text-amber-600' : 'text-slate-400'}`}>
          <User size={22} strokeWidth={pathname.startsWith('/profile') ? 2.5 : 2} />
        </Link>
      </nav>

      {/* --- İÇERİK --- */}
      <main className="flex-1 md:ml-72 relative pb-24 md:pb-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}