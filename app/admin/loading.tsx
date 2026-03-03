import { Users, UserCog, LayoutDashboard, LineChart, ShieldCheck, LogOut } from 'lucide-react';

export default function AdminLayoutLoading() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar Skeleton */}
      <aside className="w-64 border-r bg-slate-900 text-white hidden md:block">
        <div className="flex h-16 items-center px-6 border-b border-slate-800">
          <span className="text-lg font-bold">Stradia Admin</span>
        </div>
        <nav className="flex flex-col gap-2 p-4 opacity-50 pointer-events-none">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-300">
            <Users className="h-4 w-4" />
            Customers
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-300">
            <UserCog className="h-4 w-4" />
            Global Users
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-300">
            <LineChart className="h-4 w-4" />
            Markets
          </div>
          <div className="my-2 border-t border-slate-800" />
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-300">
            <LayoutDashboard className="h-4 w-4" />
            Back to App
          </div>
        </nav>
      </aside>

      {/* Main Content Skeleton */}
      <div className="flex flex-col flex-1">
        {/* TopNav Skeleton */}
        <header className="flex h-16 items-center gap-4 border-b bg-white px-6 shadow-sm">
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium border border-amber-200">
            <ShieldCheck className="h-3 w-3" />
            Platform Admin
          </div>
          <div className="ml-auto opacity-50 pointer-events-none">
            <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-9 px-3 gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </div>
          </div>
        </header>

        {/* Page Content Skeleton */}
        <main className="flex flex-1 flex-col p-4 lg:p-6 bg-slate-50/50">
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between space-y-2">
              <div>
                <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
                <div className="mt-2 h-4 w-64 animate-pulse rounded-md bg-muted" />
              </div>
              <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="rounded-md border bg-white h-64 animate-pulse bg-muted/20" />
          </div>
        </main>
      </div>
    </div>
  );
}
