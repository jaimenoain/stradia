import Link from 'next/link';
import { Home, Layers, Settings, Map, LogOut, Menu } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 md:flex-row">
      <aside className="hidden w-64 flex-col border-r bg-background md:flex">
        <nav className="flex flex-col gap-2 p-4 text-sm font-medium">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold md:text-base mb-4">
            <span className="sr-only">Stradia</span>
            <span>Stradia</span>
          </Link>
          <Link
            href="/overview"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <Home className="h-4 w-4" />
            Overview
          </Link>
          <Link
            href="/strategies"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <Layers className="h-4 w-4" />
            Strategy Builder
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <Settings className="h-4 w-4" />
            Tenant Settings
          </Link>
          <Link
            href="/markets/123/board"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <Map className="h-4 w-4" />
            Mock Market Board
          </Link>
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
           <div className="flex items-center md:hidden mr-2">
             <button className="p-2 -ml-2 rounded-md hover:bg-muted">
               <Menu className="h-5 w-5" />
               <span className="sr-only">Toggle Menu</span>
             </button>
           </div>
           <div className="w-full flex-1">
             {/* Search or title could go here */}
           </div>
           <div className="flex items-center gap-4">
             <span className="text-sm font-medium">User Menu</span>
             <button className="flex items-center gap-2 text-sm font-medium text-destructive hover:text-destructive/80">
                <LogOut className="h-4 w-4" />
                Logout
             </button>
           </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
