import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Users, LogOut, ShieldCheck, UserCog, LayoutDashboard } from 'lucide-react';
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

  if (!dbUser || dbUser.role !== 'SUPER_ADMIN') {
    redirect('/overview');
  }

  return (
    <div className="flex min-h-screen">
       {/* Sidebar */}
       <aside className="w-64 border-r bg-slate-900 text-white hidden md:block">
          {/* Header/Logo */}
          <div className="flex h-16 items-center px-6 border-b border-slate-800">
             <span className="text-lg font-bold">Stradia Admin</span>
          </div>
          {/* Nav */}
          <nav className="flex flex-col gap-2 p-4">
            <Link href="/customers" className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-all">
               <Users className="h-4 w-4" />
               Customers
            </Link>
             <Link href="/admin/users" className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-all">
               <UserCog className="h-4 w-4" />
               Global Users
            </Link>
             <div className="my-2 border-t border-slate-800" />
              <Link href="/overview" className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-all">
               <LayoutDashboard className="h-4 w-4" />
               Back to App
            </Link>
          </nav>
       </aside>

       {/* Main Content */}
       <div className="flex flex-col flex-1">
          <header className="flex h-16 items-center gap-4 border-b bg-white px-6 shadow-sm">
             <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium border border-amber-200">
                <ShieldCheck className="h-3 w-3" />
                Platform Admin
             </div>
             <div className="ml-auto">
                 <form action={signOut}>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                 </form>
             </div>
          </header>
          <main className="flex flex-1 flex-col p-4 lg:p-6 bg-slate-50/50">
             {children}
          </main>
       </div>
    </div>
  )
}
