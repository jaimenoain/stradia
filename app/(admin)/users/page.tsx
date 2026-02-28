import { prisma } from '@/lib/prisma';
import { UsersTable } from '@/components/admin/users-table';
import { CreateUserDialog } from './create-user-dialog';

export default async function UsersPage() {
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let users: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tenants: any[] = [];

  if (!useMocks) {
    users = await prisma.user.findMany({
      include: {
        tenant: true,
      },
      orderBy: {
        email: 'asc',
      },
    });

    tenants = await prisma.tenant.findMany({
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
