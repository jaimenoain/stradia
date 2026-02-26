import { prisma } from '@/lib/prisma';
import { UsersTable } from '@/components/admin/users-table';

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    include: {
      tenant: true,
    },
    orderBy: {
      email: 'asc',
    },
  });

  return <UsersTable users={users} />;
}
