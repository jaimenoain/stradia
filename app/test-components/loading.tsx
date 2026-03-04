import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="rounded-md border bg-white">
         <div className="p-4 border-b">
           <Skeleton className="h-6 w-full animate-pulse skeleton-loader" data-testid="skeleton-loader" />
         </div>
         <div className="p-4 space-y-4">
           <Skeleton className="h-10 w-full animate-pulse skeleton-loader" />
           <Skeleton className="h-10 w-full animate-pulse skeleton-loader" />
           <Skeleton className="h-10 w-full animate-pulse skeleton-loader" />
         </div>
      </div>
    </div>
  );
}
