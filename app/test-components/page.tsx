import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notFound } from 'next/navigation';

export default async function EmptyStateTestPage() {
  if (process.env.NODE_ENV === "production") notFound();

  // Simulate network latency for visual E2E testing of the Skeleton
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return (
    <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed bg-white">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
           <Building2 className="h-10 w-10 text-slate-400" />
        </div>
        <h3 className="mt-4 text-lg font-semibold" data-testid="empty-state-title">No customers added</h3>
        <p className="mb-4 mt-2 text-sm text-slate-500">
          You haven&apos;t added any customers to the platform yet.
        </p>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>
    </div>
  );
}
