import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { signout } from '@/app/login/actions'
import { CreateMarketModal } from '@/components/markets/create-market-modal'

export default async function AppRootPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user has an organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (!profile?.org_id) {
    redirect('/app/onboarding')
  }

  // Check for markets
  const { data: markets } = await supabase
    .from('markets')
    .select('id')
    .limit(1)

  if (markets && markets.length > 0) {
    redirect(`/app/${markets[0].id}/board`)
  }

  return (
    <div className="flex flex-col h-screen w-full items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Welcome to Stradia</h1>
        <p>You don&apos;t have any markets yet.</p>
        <p className="text-sm text-muted-foreground">
          Create your first market to get started.
        </p>
        <CreateMarketModal
          trigger={<Button>Create your first market</Button>}
          redirectToBoard={true}
        />
        <form action={signout}>
             <Button variant="ghost">Sign out</Button>
        </form>
      </div>
    </div>
  )
}
