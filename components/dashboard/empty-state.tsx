import Link from 'next/link'
import { LayoutTemplate, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  marketId: string
}

export function EmptyState({ marketId }: EmptyStateProps) {
  return (
    <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted relative">
          <LayoutTemplate className="h-10 w-10 text-muted-foreground" />
          <CheckSquare className="absolute -bottom-1 -right-1 h-8 w-8 text-primary bg-background rounded-full p-1" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">No strategies active</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">
          You haven&apos;t started any strategies for this market yet.
        </p>
        <Button asChild>
          <Link href={`/app/${marketId}/marketplace`}>
            No Tasks Active. Check the Marketplace.
          </Link>
        </Button>
      </div>
    </div>
  )
}
