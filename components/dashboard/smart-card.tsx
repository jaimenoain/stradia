'use client'

import { MarketBoardTask } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SmartCardProps {
  task: MarketBoardTask
  onAccept?: (task: MarketBoardTask) => void
  onReject?: (task: MarketBoardTask) => void
  onTaskClick?: (taskId: string) => void
  disabled?: boolean
}

export function SmartCard({ task, onAccept, onReject, onTaskClick, disabled }: SmartCardProps) {
  const isGhost = task.is_ghost
  const isLocal = !task.origin_template_task_id

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { task },
    disabled: isGhost || disabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <Card
        onClick={() => onTaskClick?.(task.id)}
        className={cn(
          'w-full transition-all duration-200 mb-3 break-inside-avoid cursor-pointer',
          isGhost
            ? 'opacity-60 border-dashed border-primary/50 bg-background/50 hover:opacity-100 hover:border-primary'
            : 'shadow-sm hover:shadow-md bg-card',
          isLocal && !isGhost && 'border-l-4 border-l-blue-500',
          isDragging && 'ring-2 ring-primary ring-offset-2 z-50'
        )}
      >
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-base font-medium leading-tight">{task.title}</CardTitle>
            {isLocal && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 text-[10px] px-1 py-0 h-5 shrink-0">
                Local
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {task.description && (
            <div
              className="text-sm text-muted-foreground line-clamp-3 prose prose-sm dark:prose-invert max-w-none [&_p]:m-0 [&_ul]:pl-4 [&_ol]:pl-4"
              dangerouslySetInnerHTML={{ __html: task.description }}
            />
          )}
        </CardContent>
        {isGhost && (
          <CardFooter className="p-2 flex justify-end gap-2 bg-muted/20 rounded-b-xl">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
              onClick={(e) => {
                e.stopPropagation() // Prevent drag start when clicking buttons
                onReject?.(task)
              }}
              title="Reject Task"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Reject</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-8 w-8 p-0 rounded-full bg-green-600 hover:bg-green-700 text-white border-green-600"
              onClick={(e) => {
                e.stopPropagation() // Prevent drag start when clicking buttons
                onAccept?.(task)
              }}
              title="Accept Task"
            >
              <Check className="h-4 w-4" />
              <span className="sr-only">Accept</span>
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
