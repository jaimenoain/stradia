'use client'

import * as React from 'react'
import { MarketBoardTask } from '@/types'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { BookOpen, Activity, Settings, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskDetailSheetProps {
  tasks: MarketBoardTask[]
}

export function TaskDetailSheet({ tasks }: TaskDetailSheetProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  // Get taskId from URL
  const taskId = searchParams.get('taskId')

  // Find the task in the provided list
  const task = React.useMemo(() =>
    tasks.find((t) => t.id === taskId),
    [tasks, taskId]
  )

  const isOpen = !!taskId && !!task

  // Tab state
  const [activeTab, setActiveTab] = React.useState<'guide' | 'activity' | 'config'>('guide')

  // Reset tab when task changes
  React.useEffect(() => {
    if (taskId) {
      setActiveTab('guide')
    }
  }, [taskId])

  function handleClose() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('taskId')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  if (!task) return null

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full p-0 gap-0 overflow-hidden">
        {/* Header Section */}
        <div className="p-6 pb-4 border-b">
          <SheetHeader className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <SheetTitle className="text-xl font-bold leading-tight">
                {task.title}
              </SheetTitle>
            </div>
            <SheetDescription className="sr-only">
              Task details for {task.title}
            </SheetDescription>

            <div className="flex items-center gap-2 text-sm">
              <Badge variant={
                task.status === 'DONE' ? 'default' :
                task.status === 'IN_PROGRESS' ? 'secondary' :
                'outline'
              }>
                {task.status.replace('_', ' ')}
              </Badge>

              {/* Placeholder Drift Indicator */}
              <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full text-xs font-medium">
                <AlertCircle className="w-3 h-3" />
                <span>Drift: Stable</span>
              </div>
            </div>
          </SheetHeader>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 mt-6 border bg-muted/30 p-1 rounded-lg">
            <Button
              variant={activeTab === 'guide' ? 'secondary' : 'ghost'}
              size="sm"
              className="flex-1 h-8 text-xs font-medium"
              onClick={() => setActiveTab('guide')}
            >
              <BookOpen className="w-3.5 h-3.5 mr-2" />
              Guide
            </Button>
            <Button
              variant={activeTab === 'activity' ? 'secondary' : 'ghost'}
              size="sm"
              className="flex-1 h-8 text-xs font-medium"
              onClick={() => setActiveTab('activity')}
            >
              <Activity className="w-3.5 h-3.5 mr-2" />
              Activity
            </Button>
            <Button
              variant={activeTab === 'config' ? 'secondary' : 'ghost'}
              size="sm"
              className="flex-1 h-8 text-xs font-medium"
              onClick={() => setActiveTab('config')}
            >
              <Settings className="w-3.5 h-3.5 mr-2" />
              Config
            </Button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6">
            {activeTab === 'guide' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {task.description ? (
                    <div dangerouslySetInnerHTML={{ __html: task.description }} />
                  ) : (
                    <p className="text-muted-foreground italic">No description provided for this task.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col gap-4">
                  <div className="flex gap-3 text-sm">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-primary shrink-0" />
                    <div className="flex flex-col gap-1">
                      <p className="font-medium">Current Status: {task.status}</p>
                      <p className="text-muted-foreground text-xs">Just now</p>
                    </div>
                  </div>
                  {/* Placeholder for future activity items */}
                  <div className="flex gap-3 text-sm opacity-50">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-muted-foreground shrink-0" />
                    <div className="flex flex-col gap-1">
                      <p className="font-medium">Task Created</p>
                      <p className="text-muted-foreground text-xs">Origin Template: {task.origin_template_task_id}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'config' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-muted/50 rounded-lg border p-4 font-mono text-xs overflow-x-auto">
                  <pre>{JSON.stringify(task.task_config || {}, null, 2)}</pre>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>Task Type: {task.task_type}</p>
                  <p>Weight: {task.weight}</p>
                  <p>Ghost: {task.is_ghost ? 'Yes' : 'No'}</p>
                  <p>ID: {task.id}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
