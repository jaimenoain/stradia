import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { MarketManager } from '@/components/features/settings/MarketManager'
import { UserRole } from '@prisma/client'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { tenant_id: true, role: true },
  })

  if (!dbUser) {
     redirect('/login')
  }

  if (dbUser.role !== UserRole.GLOBAL_ADMIN) {
      return <div className="p-4 text-red-500">Access Denied: Global Admin privileges required.</div>
  }

  const markets = await prisma.market.findMany({
    where: { tenant_id: dbUser.tenant_id },
    orderBy: { name: 'asc' },
  })

  const serializedMarkets = markets.map(market => ({
    ...market,
    deleted_at: market.deleted_at ? market.deleted_at.toISOString() : null,
  }))

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>
      <div className="h-full flex-1 flex-col space-y-8 flex">
        <MarketManager markets={serializedMarkets} />
      </div>
    </div>
  )
}
