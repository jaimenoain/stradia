import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
  Home,
  Layers,
  Settings,
  LineChart,
  LogOut,
  Users
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isTenantActive } from '@/lib/auth/tenant-lockout';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Tenant Lockout Check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.app_metadata?.tenant_id) {
    const isActive = await isTenantActive(user.app_metadata.tenant_id as string);
    if (!isActive) {
      redirect('/subscription-suspended');
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (Left) */}
      <aside className="w-64 border-r bg-muted/40 hidden md:block">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="text-lg font-bold">Stradia</span>
          </Link>
        </div>
        <nav className="flex flex-col gap-2 p-4">
          <Link
            href="/overview"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
          >
            <Home className="h-4 w-4" />
            Overview
          </Link>
          <Link
            href="/strategies"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
          >
            <Layers className="h-4 w-4" />
            Strategy Builder
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
          >
            <Settings className="h-4 w-4" />
            Tenant Settings
          </Link>
          <Link
            href="/settings/users"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
          >
            <Users className="h-4 w-4" />
            User Directory
          </Link>
          <Link
            href="/markets/123/board"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
          >
            <LineChart className="h-4 w-4" />
            Mock Market Board
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1">
        {/* TopNav (Header) */}
        <header className="flex h-16 items-center gap-4 border-b bg-white px-6">
          <div className="ml-auto flex items-center gap-4">
            <Button variant="ghost" size="sm" className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
