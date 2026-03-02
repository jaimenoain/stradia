import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Building2, Plus } from 'lucide-react';
import { CreateCustomerSheet } from './create-customer-sheet';

export default async function CustomersPage() {
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tenants: any[] = [];

  if (!useMocks) {
    tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  } else {
    // If mock mode, we want the button to be visible, so an empty array works to show empty state,
    // or an array with items works to show the table with button. Empty array is simpler.
    tenants = [];
  }

  if (tenants.length === 0) {
    return (
      <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed bg-white">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
             <Building2 className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No customers added</h3>
          <p className="mb-4 mt-2 text-sm text-slate-500">
            You haven&apos;t added any customers to the platform yet.
          </p>
          <CreateCustomerSheet>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </CreateCustomerSheet>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground">
            Manage your organizations and tenants.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <CreateCustomerSheet>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </CreateCustomerSheet>
        </div>
      </div>
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell className="font-medium">{tenant.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {tenant.id}
                </TableCell>
                <TableCell>{tenant._count.users}</TableCell>
                <TableCell>
                  <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    tenant.is_active
                      ? "border-transparent bg-green-100 text-green-800 hover:bg-green-200"
                      : "border-transparent bg-slate-100 text-slate-800 hover:bg-slate-200"
                  }`}>
                    {tenant.is_active ? 'Active' : 'Inactive'}
                  </div>
                </TableCell>
                <TableCell>{tenant.created_at.toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
