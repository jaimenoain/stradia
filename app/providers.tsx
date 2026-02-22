"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { AuthProvider } from "@/lib/auth/provider"
import { MockSessionProvider } from "@/lib/auth/mock-session-provider"

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
        <MockSessionProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </MockSessionProvider>
      </QueryClientProvider>
    </NextThemesProvider>
  )
}
