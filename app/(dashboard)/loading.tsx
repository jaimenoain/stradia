import { Home, Layers, Settings, Users, LogOut } from 'lucide-react';

export default function DashboardLayoutLoading() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar Skeleton */}
      <aside className="w-64 border-r bg-muted/40 hidden md:block">
        <div className="flex h-16 items-center border-b px-6">
          <div className="flex items-center gap-2 font-semibold">
            <span className="text-lg font-bold">Stradia</span>
          </div>
        </div>
        <nav className="flex flex-col gap-2 p-4 opacity-50 pointer-events-none">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground">
            <Home className="h-4 w-4" />
            Overview
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground">
            <Layers className="h-4 w-4" />
            Strategy Builder
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground">
            <Settings className="h-4 w-4" />
            Tenant Settings
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            User Directory
          </div>
        </nav>
      </aside>

      {/* Main Content Skeleton */}
      <div className="flex flex-col flex-1">
        {/* TopNav Skeleton */}
        <header className="flex h-16 items-center gap-4 border-b bg-white px-6">
          <div className="ml-auto flex items-center gap-4 opacity-50 pointer-events-none">
            <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-9 px-3 gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </div>
          </div>
        </header>

        {/* Page Content Skeleton */}
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
           <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between space-y-2">
              <div>
                <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
                <div className="mt-2 h-4 w-64 animate-pulse rounded-md bg-muted" />
              </div>
            </div>
            <div className="rounded-md border bg-white h-64 animate-pulse bg-muted/20" />
          </div>
        </main>
      </div>
    </div>
  );
}