import Link from 'next/link';

export default function Page() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between p-4 border-b">
        <span className="font-bold">Stradia</span>
        <Link href="/login">Login</Link>
      </header>
      <main className="flex-1 p-4">
        <h1>Home</h1>
      </main>
    </div>
  );
}
