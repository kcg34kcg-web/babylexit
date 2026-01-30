'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';

interface MobileNavbarProps {
  onMenuToggle: () => void;
}

export default function MobileNavbar({ onMenuToggle }: MobileNavbarProps) {
  return (
    <nav className="bg-slate-950 p-4 flex justify-between items-center md:hidden">
      <Link href="/">
        <p className="text-2xl font-bold text-amber-500">Babylexit</p>
      </Link>
      <button onClick={onMenuToggle} className="text-slate-200 focus:outline-none">
        <Menu size={24} />
      </button>
    </nav>
  );
}
