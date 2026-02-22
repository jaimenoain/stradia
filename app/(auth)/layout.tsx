interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
      {children}
    </main>
  )
}
