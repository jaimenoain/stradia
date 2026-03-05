import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
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
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><div className="h-5 w-48 animate-pulse rounded bg-muted" /></TableCell>
                <TableCell><div className="h-5 w-24 animate-pulse rounded-full bg-muted" /></TableCell>
                <TableCell><div className="h-5 w-32 animate-pulse rounded bg-muted" /></TableCell>
                <TableCell><div className="h-5 w-20 animate-pulse rounded-full bg-muted" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
