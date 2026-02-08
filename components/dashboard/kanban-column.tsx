'use client'

import { MarketBoardTask } from '@/types'
import { SmartCard } from './smart-card'
import { Badge } from '@/components/ui/badge'

interface KanbanColumnProps {
  title: string
  tasks: MarketBoardTask[]
  onAccept?: (task: MarketBoardTask) => void
  onReject?: (task: MarketBoardTask) => void
}

export function KanbanColumn({ title, tasks, onAccept, onReject }: KanbanColumnProps) {
  return (
    <div className="flex flex-col h-full min-w-[320px] w-full max-w-sm bg-muted/30 rounded-xl border">
      <div className="p-4 border-b bg-background/50 backdrop-blur-sm rounded-t-xl flex items-center justify-between sticky top-0 z-10">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{title}</h3>
        <Badge variant="secondary" className="font-mono">{tasks.length}</Badge>
      </div>
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {tasks.map((task) => (
          <SmartCard
            key={task.id}
            task={task}
            onAccept={onAccept}
            onReject={onReject}
          />
        ))}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm border-2 border-dashed border-muted rounded-lg opacity-50 m-2">
            No tasks
          </div>
        )}
      </div>
    </div>
  )
}
