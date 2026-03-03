import { prisma } from '@/lib/prisma';
import { UsersTable } from '@/components/admin/users-table';
import { CreateUserDialog } from './create-user-dialog';

export default async function UsersPage() {
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

  let users: Array<{
    id: string;
    email: string;
    role: string;
    tenant: {
      id: string;
      name: string;
      is_active: boolean;
    };
  }> = [];

  let tenants: Array<{
    id: string;
    name: string;
  }> = [];

  if (!useMocks) {
    const dbUsers = await prisma.user.findMany({
      include: {
        tenant: true,
      },
      orderBy: {
        email: 'asc',
      },
    });

    users = dbUsers.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      tenant: {
        id: u.tenant?.id || '',
        name: u.tenant?.name || 'Unknown',
        is_active: u.tenant?.is_active ?? false,
      }
    }));

    const dbTenants = await prisma.tenant.findMany({
      where: {
        is_active: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    tenants = dbTenants.map((t) => ({
      id: t.id,
      name: t.name,
    }));
  } else {
     users = [];
     tenants = [
         { id: 'mock-tenant-1', name: 'Mock Tenant 1' }
     ];
  }

  return (
    <UsersTable
      users={users}
      action={<CreateUserDialog tenants={tenants} />}
    />
  );
}
