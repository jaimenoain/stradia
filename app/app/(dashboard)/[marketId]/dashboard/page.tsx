import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EmptyState } from '@/components/dashboard/empty-state'

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

  // Logic: check for active strategies/tasks. For now, always empty.
  const activeStrategies: any[] = []

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

      {activeStrategies.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg">
            <EmptyState marketId={marketId} />
        </div>
      ) : (
        <div>
            {/* Future dashboard content */}
            <p>Active Strategies: {activeStrategies.length}</p>
        </div>
      )}
    </div>
  )
}
