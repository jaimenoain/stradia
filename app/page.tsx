export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-8 gap-8 font-sans">
      <main className="flex flex-col items-center gap-8 max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">Stradia Design System</h1>
        <p className="text-muted-foreground text-lg">
          Swiss International style: Minimalist, high contrast, token-driven.
        </p>

        <div className="flex gap-4 flex-wrap justify-center">
          <button className="px-6 py-3 rounded bg-primary text-primary-foreground font-medium hover:opacity-90">
            Primary Action
          </button>
          <button className="px-6 py-3 rounded bg-secondary text-secondary-foreground font-medium hover:opacity-90">
            Secondary Action
          </button>
          <button className="px-6 py-3 rounded bg-destructive text-destructive-foreground font-medium hover:opacity-90">
            Destructive
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-8">
          <div className="p-4 rounded border border-success bg-white text-success">
            <span className="font-semibold">Success</span>
            <p className="text-sm text-success">Operation completed successfully.</p>
          </div>
          <div className="p-4 rounded border border-warning bg-white text-warning">
            <span className="font-semibold">Warning</span>
            <p className="text-sm text-warning">Action requires attention.</p>
          </div>
          <div className="p-4 rounded border border-destructive bg-white text-destructive">
            <span className="font-semibold">Destructive</span>
            <p className="text-sm text-destructive">Critical error occurred.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
