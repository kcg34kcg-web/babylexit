'use client';

import { createClient } from '@/utils/supabase/client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Sadece Auth kaydı yapıyoruz. Profil oluşturma işini Veritabanı (Trigger) yapacak.
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName, // Bu veri Trigger tarafından otomatik alınacak
          },
        },
      });

      if (error) throw error;

      toast.success('Kayıt başarılı! Giriş yapılıyor...');
      
      // Kısa bir süre bekle ve anasayfaya yönlendir
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1500);

    } catch (error: any) {
      console.error('Signup Error:', error);
      toast.error(error.message || 'Kayıt sırasında hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-slate-800 p-8 shadow-2xl border border-slate-700">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">
            Babylexit'e Katıl
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Hukuk yolculuğunda yapay zeka yanında.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="name" className="sr-only">Ad Soyad</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="relative block w-full rounded-md border-0 bg-slate-700/50 p-3 text-white placeholder-slate-400 ring-1 ring-inset ring-slate-600 focus:ring-2 focus:ring-amber-500 sm:text-sm sm:leading-6"
                placeholder="Ad Soyad"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email-address" className="sr-only">Email Adresi</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-md border-0 bg-slate-700/50 p-3 text-white placeholder-slate-400 ring-1 ring-inset ring-slate-600 focus:ring-2 focus:ring-amber-500 sm:text-sm sm:leading-6"
                placeholder="Email Adresi"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Şifre</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="relative block w-full rounded-md border-0 bg-slate-700/50 p-3 text-white placeholder-slate-400 ring-1 ring-inset ring-slate-600 focus:ring-2 focus:ring-amber-500 sm:text-sm sm:leading-6"
                placeholder="Şifre"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md bg-amber-500 px-3 py-3 text-sm font-semibold text-slate-900 hover:bg-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Kayıt Yapılıyor...' : 'Kayıt Ol'}
            </button>
          </div>
        </form>
        
        <div className="text-center text-sm">
          <Link href="/login" className="font-medium text-amber-500 hover:text-amber-400">
            Zaten hesabın var mı? Giriş yap
          </Link>
        </div>
      </div>
    </div>
  );
}