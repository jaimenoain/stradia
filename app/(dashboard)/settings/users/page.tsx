import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { UserDirectoryClient } from './client'
import { User as FrontendUser, UserRole as FrontendUserRole } from './types'

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function UserDirectoryPage({ searchParams }: PageProps) {
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

  // Parse Pagination Params
  const params = await searchParams
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1
  const pageSize = typeof params.pageSize === 'string' ? parseInt(params.pageSize) : 10

  const currentPage = isNaN(page) || page < 1 ? 1 : page
  const limit = isNaN(pageSize) || pageSize < 1 ? 10 : pageSize
  const skip = (currentPage - 1) * limit

  // Fetch users with pagination
  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where: { tenant_id: currentUser.tenant_id },
      include: {
        markets: {
          include: {
            market: true,
          },
        },
      },
      orderBy: { email: 'asc' },
      skip: skip,
      take: limit,
    }),
    prisma.user.count({
      where: { tenant_id: currentUser.tenant_id },
    }),
  ])

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
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={limit}
        />
      </div>
    </div>
  )
}
