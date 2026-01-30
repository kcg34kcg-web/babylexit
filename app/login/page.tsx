'use client';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      router.push('/'); // Redirect to home page on successful login
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-zinc-800">
      <div className="bg-white dark:bg-[#1e293b] p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-[#1e293b] dark:text-[#f59e0b] mb-6">Log In</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline dark:bg-zinc-700 dark:text-white"
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline dark:bg-zinc-700 dark:text-white"
              required
            />
          </div>
          <button
            type="submit"
            className="bg-[#1e293b] hover:bg-zinc-700 text-[#f59e0b] font-bold py-2 px-4 rounded w-full focus:outline-none focus:shadow-outline"
          >
            Log In
          </button>
        </form>
        <p className="text-center text-gray-700 dark:text-gray-300 text-sm mt-4">
          Hesabın yok mu, kaydol? {' '}
          <Link href="/signup" className="text-[#f59e0b] hover:underline">Kayıt ol</Link>
        </p>
      </div>
    </div>
  );
}
