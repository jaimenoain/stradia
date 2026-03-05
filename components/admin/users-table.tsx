import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

interface LocalTenant {
  id: string;
  name: string;
  is_active: boolean;
}

interface LocalUser {
  id: string;
  email: string;
  role: string;
  tenant: LocalTenant | null;
}

interface UsersTableProps {
  users: LocalUser[];
  action?: React.ReactNode;
}

export function UsersTable({ users, action }: UsersTableProps) {
  if (users.length === 0) {
    return (
      <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed bg-background">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
             <Users className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No global users added</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            You haven&apos;t added any users to the platform yet.
          </p>
          {action}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Global Users</h2>
          <p className="text-muted-foreground">
            Manage your global users.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {action}
        </div>
      </div>

      <div className="rounded-md border bg-background shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">{user.role}</Badge>
                </TableCell>
                <TableCell>{user.tenant?.name || 'System'}</TableCell>
                <TableCell>
                  {!user.tenant ? (
                    <Badge variant="secondary">System</Badge>
                  ) : user.tenant.is_active ? (
                    <Badge variant="secondary">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Inactive Tenant</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}