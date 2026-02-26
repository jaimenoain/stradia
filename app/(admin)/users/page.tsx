import { prisma } from '@/lib/prisma';
import { UsersTable } from '@/components/admin/users-table';
import { CreateUserDialog } from './create-user-dialog';

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    include: {
      tenant: true,
    },
    orderBy: {
      email: 'asc',
    },
  });

  const tenants = await prisma.tenant.findMany({
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

  return (
    <UsersTable
      users={users}
      action={<CreateUserDialog tenants={tenants} />}
    />
  );
}
