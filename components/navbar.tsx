import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-[#1e293b] text-[#f59e0b] p-4 flex justify-between items-center">
      <Link href="/">
        <p className="text-2xl font-bold">Babylexit</p>
      </Link>
      <div>
        <Link href="/login" className="mr-4">Login</Link>
        <Link href="/signup">Signup</Link>
      </div>
    </nav>
  );
}
