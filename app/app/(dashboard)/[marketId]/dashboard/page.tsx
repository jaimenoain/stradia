import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signout } from '@/app/login/actions'
import { Button } from '@/components/ui/button'

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
    return redirect('/login')
  }

  // Fetch market details to display name
  const { data: market } = await supabase
    .from('markets')
    .select('*')
    .eq('id', marketId)
    .single()

  return (
    <div className="flex flex-col h-full w-full items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {market ? (
          <h2 className="text-xl">Market: {market.name}</h2>
        ) : (
           <h2 className="text-xl text-destructive">Market not found</h2>
        )}
        <p className="text-muted-foreground text-sm">Market ID: {marketId}</p>
        <p>Welcome, {user.email}!</p>
        <form action={signout}>
            <Button variant="destructive">
              Sign out
            </Button>
        </form>
      </div>
    </div>
  )
}
