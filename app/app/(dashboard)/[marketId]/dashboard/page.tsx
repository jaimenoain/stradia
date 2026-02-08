import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MarketBoard } from '@/components/dashboard/market-board'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ marketId: string }>
}) {
  const { marketId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch market details to verify existence
  const { data: market, error } = await supabase
    .from('markets')
    .select('id, name')
    .eq('id', marketId)
    .single()

  if (error || !market) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-destructive">Market not found or access denied.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full p-8 space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview for {market.name}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <MarketBoard marketId={marketId} />
      </div>
    </div>
  )
}
