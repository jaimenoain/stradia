'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { KanbanColumn } from './kanban-column'
import { EmptyState } from './empty-state'
import { acceptTask, rejectTask } from '@/app/app/(dashboard)/[marketId]/dashboard/actions'
import { MarketBoardTask } from '@/types'
import { Loader2 } from 'lucide-react'

interface MarketBoardProps {
  marketId: string
}

export function MarketBoard({ marketId }: MarketBoardProps) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['market-board', marketId],
    queryFn: async () => {
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
  const doneTasks = safeTasks
    .filter((t) => t.status === 'DONE')
    .sort((a, b) => (a.weight || 0) - (b.weight || 0))

  return (
    <div className="flex h-full w-full overflow-x-auto gap-6 pb-4 items-start">
      <KanbanColumn
        title="To Do"
        tasks={todoTasks}
        onAccept={(task) => accept(task)}
        onReject={(task) => reject(task)}
      />
      <KanbanColumn title="In Progress" tasks={inProgressTasks} />
      <KanbanColumn title="Done" tasks={doneTasks} />
    </div>
  )
}
