import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { UserDirectoryClient } from './client'
import { User as FrontendUser, UserRole as FrontendUserRole } from './types'

export default async function UserDirectoryPage() {
  const supabase = await createClient()
  const { data: { user: authUser }, error } = await supabase.auth.getUser()

  if (error || !authUser) {
    redirect('/login')
  }

  // Get current user details to check role and tenant
  const currentUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { tenant_id: true, role: true },
  })

  if (!currentUser) {
    redirect('/login')
  }

  // Only GLOBAL_ADMIN can access this page
  if (currentUser.role !== UserRole.GLOBAL_ADMIN) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="text-muted-foreground">
          You must be a Global Admin to view this page.
        </p>
      </div>
    )
  }

  // Fetch all users for the tenant
  const users = await prisma.user.findMany({
    where: { tenant_id: currentUser.tenant_id },
    include: {
      markets: {
        include: {
          market: true,
        },
      },
    },
    orderBy: { email: 'asc' },
  })

  // Fetch all active markets for the tenant (for assignment)
  const markets = await prisma.market.findMany({
    where: {
      tenant_id: currentUser.tenant_id,
      deleted_at: null // Only fetch active markets
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Active Users</h2>
      </div>
      <div className="h-full flex-1 flex-col space-y-8 flex">
        <UserDirectoryClient
          users={users as unknown as FrontendUser[]}
          availableMarkets={markets}
          currentUserRole={currentUser.role as unknown as FrontendUserRole}
        />
      </div>
    </div>
  )
}
