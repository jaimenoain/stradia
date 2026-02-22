"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// Mock QueryClient and Provider since package is missing
interface QueryClientType {
    defaultOptions?: unknown;
}
const QueryContext = React.createContext<QueryClientType | null>(null)
class QueryClient implements QueryClientType {
    defaultOptions = {};
}

function QueryClientProvider({ client, children }: { client: QueryClientType, children: React.ReactNode }) {
    return <QueryContext.Provider value={client}>{children}</QueryContext.Provider>
}

// Mock AuthProvider since package is missing
interface AuthContextType {
    user: null;
}
const AuthContext = React.createContext<AuthContextType | null>(null)
function AuthProvider({ children }: { children: React.ReactNode }) {
    return <AuthContext.Provider value={{ user: null }}>{children}</AuthContext.Provider>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient())

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </NextThemesProvider>
  )
}
