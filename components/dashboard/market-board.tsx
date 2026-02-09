'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { KanbanColumn } from './kanban-column'
import { EmptyState } from './empty-state'
import { TaskDetailSheet } from './task-detail-sheet'
import { acceptTask, rejectTask, updateTaskStatus } from '@/app/app/(dashboard)/[marketId]/dashboard/actions'
import { MarketBoardTask } from '@/types'
import { Loader2 } from 'lucide-react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragStartEvent,
  DragEndEvent,
  closestCorners,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { SmartCard } from './smart-card'

interface MarketBoardProps {
  marketId: string
}

export function MarketBoard({ marketId }: MarketBoardProps) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [activeTask, setActiveTask] = useState<MarketBoardTask | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['market-board', marketId],
    enabled: !!supabase,
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.rpc('get_market_board', { target_market_id: marketId })
      if (error) throw error
      return (data || []) as MarketBoardTask[]
    },
  })

  const { mutate: accept } = useMutation({
    mutationFn: async (task: MarketBoardTask) => {
      await acceptTask(marketId, task.origin_template_task_id)
    },
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: ['market-board', marketId] })
      const previousTasks = queryClient.getQueryData<MarketBoardTask[]>(['market-board', marketId])

      if (previousTasks) {
        queryClient.setQueryData<MarketBoardTask[]>(['market-board', marketId], (old) => {
          if (!old) return []
          return old.map((t) => {
            if (t.id === newTask.id) {
              return { ...t, status: 'TODO', is_ghost: false }
            }
            return t
          })
        })
      }
      return { previousTasks }
    },
    onError: (err, newTask, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['market-board', marketId], context.previousTasks)
      }
      console.error(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['market-board', marketId] })
    },
  })

  const { mutate: reject } = useMutation({
    mutationFn: async (task: MarketBoardTask) => {
      await rejectTask(marketId, task.origin_template_task_id)
    },
    onMutate: async (deltedTask) => {
      await queryClient.cancelQueries({ queryKey: ['market-board', marketId] })
      const previousTasks = queryClient.getQueryData<MarketBoardTask[]>(['market-board', marketId])

      if (previousTasks) {
        queryClient.setQueryData<MarketBoardTask[]>(['market-board', marketId], (old) => {
          if (!old) return []
          return old.filter((t) => t.id !== deltedTask.id)
        })
      }
      return { previousTasks }
    },
    onError: (err, newTask, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['market-board', marketId], context.previousTasks)
      }
      console.error(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['market-board', marketId] })
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: string }) => {
      await updateTaskStatus(marketId, taskId, newStatus)
    },
    onMutate: async ({ taskId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['market-board', marketId] })
      const previousTasks = queryClient.getQueryData<MarketBoardTask[]>(['market-board', marketId])

      if (previousTasks) {
        queryClient.setQueryData<MarketBoardTask[]>(['market-board', marketId], (old) => {
          if (!old) return []
          return old.map((t) => {
            if (t.id === taskId) {
              return { ...t, status: newStatus }
            }
            return t
          })
        })
      }
      return { previousTasks }
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['market-board', marketId], context.previousTasks)
      }
      console.error(err)
      // Ideally show a toast here
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['market-board', marketId] })
    },
  })

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    const task = tasks?.find((t) => t.id === active.id)
    if (task) setActiveTask(task)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as string

    const task = tasks?.find((t) => t.id === taskId)
    if (!task) return

    // If dropped in same column, do nothing
    if (task.status === newStatus) return

    // Ghost cards check (should be disabled but extra safety)
    if (task.is_ghost) return

    // Type B/C to DONE check
    if (newStatus === 'DONE') {
      const type = task.task_type
      if (type === 'B' || type === 'C') {
        // Optimistic UI rollback will happen automatically since we don't mutate if we return here
        return
      }
    }

    // Drifted check
    if (newStatus === 'DRIFTED') return

    updateStatusMutation.mutate({ taskId, newStatus })
  }

  function handleTaskClick(taskId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('taskId', taskId)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full w-full text-destructive min-h-[400px]">
        <p>Error loading tasks. Please try again.</p>
      </div>
    )
  }

  const safeTasks = tasks || []

  if (safeTasks.length === 0) {
    return <EmptyState marketId={marketId} />
  }

  const todoTasks = safeTasks
    .filter((t) => t.status === 'TODO' || t.status === 'GHOST')
    .sort((a, b) => (a.weight || 0) - (b.weight || 0))
  const inProgressTasks = safeTasks
    .filter((t) => t.status === 'IN_PROGRESS')
    .sort((a, b) => (a.weight || 0) - (b.weight || 0))
  const reviewTasks = safeTasks
    .filter((t) => t.status === 'REVIEW')
    .sort((a, b) => (a.weight || 0) - (b.weight || 0))
  const doneTasks = safeTasks
    .filter((t) => t.status === 'DONE')
    .sort((a, b) => (a.weight || 0) - (b.weight || 0))
  const driftedTasks = safeTasks
    .filter((t) => t.status === 'DRIFTED')
    .sort((a, b) => (a.weight || 0) - (b.weight || 0))

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full w-full overflow-x-auto gap-6 pb-4 items-start">
        <KanbanColumn
          id="TODO"
          title="To Do"
          tasks={todoTasks}
          onAccept={(task) => accept(task)}
          onReject={(task) => reject(task)}
          onTaskClick={handleTaskClick}
        />
        <KanbanColumn
          id="IN_PROGRESS"
          title="In Progress"
          tasks={inProgressTasks}
          onTaskClick={handleTaskClick}
        />
        <KanbanColumn
          id="REVIEW"
          title="Review"
          tasks={reviewTasks}
          onTaskClick={handleTaskClick}
        />
        <KanbanColumn
          id="DONE"
          title="Done"
          tasks={doneTasks}
          onTaskClick={handleTaskClick}
        />
        <KanbanColumn
          id="DRIFTED"
          title="Drifted"
          tasks={driftedTasks}
          isDropDisabled={true}
          isDragDisabled={true}
          onTaskClick={handleTaskClick}
        />
      </div>
      <DragOverlay>
        {activeTask ? <SmartCard task={activeTask} /> : null}
      </DragOverlay>
      <TaskDetailSheet tasks={safeTasks} />
    </DndContext>
  )
}
