import { getGlobalUsers, getActiveTenants } from '@/app/actions/admin-actions';
import { UsersTable } from '@/components/admin/users-table';
import { CreateUserDialog } from './create-user-dialog';

export default async function UsersPage() {
  const [users, tenants] = await Promise.all([
    getGlobalUsers(),
    getActiveTenants(),
  ]);

  return (
    <UsersTable
      users={users}
      action={<CreateUserDialog tenants={tenants} />}
    />
  );
}
