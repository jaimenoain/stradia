import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signout } from '@/app/login/actions'
import { Button } from '@/components/ui/button'

export default async function ProtectedPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  return (
    <div className="flex flex-col h-screen w-full items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Protected App</h1>
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
