import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Users, LogOut, ShieldCheck, UserCog, LayoutDashboard, LineChart } from 'lucide-react';
import { signOut } from '@/app/actions/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  const role = dbUser?.role;

  if (role !== 'SUPER_ADMIN') {
    redirect('/overview');
  }

  return (
    <div className="flex min-h-screen">
       {/* Sidebar */}
       <aside className="w-64 border-r bg-muted/40 hidden md:block">
          {/* Header/Logo */}
          <div className="flex h-16 items-center border-b px-6">
             <Link href="/" className="flex items-center gap-2 font-semibold">
               <span className="text-lg font-bold">Stradia Admin</span>
             </Link>
          </div>
          {/* Nav */}
          <nav className="flex flex-col gap-2 p-4">
            <Link href="/admin/customers" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted">
               <Users className="h-4 w-4" />
               Customers
            </Link>
             <Link href="/admin/users" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted">
               <UserCog className="h-4 w-4" />
               Global Users
            </Link>
            <Link href="/admin/markets" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted">
               <LineChart className="h-4 w-4" />
               Markets
            </Link>
             <div className="my-2 border-t" />
              <Link href="/overview" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted">
               <LayoutDashboard className="h-4 w-4" />
               Back to App
            </Link>
          </nav>
       </aside>

       {/* Main Content */}
       <div className="flex flex-col flex-1">
          <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
             <div className="flex items-center gap-2 px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-medium border border-border">
                <ShieldCheck className="h-3 w-3" />
                Platform Admin
             </div>
             <div className="ml-auto">
                 <form action={signOut} className="contents">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                 </form>
             </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
             {children}
          </main>
       </div>
    </div>
  )
}
