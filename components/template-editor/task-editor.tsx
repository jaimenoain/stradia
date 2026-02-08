'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'
import { TemplateTask } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TaskItem } from './task-item'

interface TaskEditorProps {
  tasks: TemplateTask[]
  readOnly?: boolean
  onAddTask: (task: Partial<TemplateTask>) => void
  onUpdateTask: (taskId: string, updates: Partial<TemplateTask>) => void
  onDeleteTask: (taskId: string) => void
  onReorderTasks: (items: { id: string; weight: number }[]) => void
}

export function TaskEditor({
  tasks,
  readOnly,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onReorderTasks,
}: TaskEditorProps) {
  const [newTaskTitle, setNewTaskTitle] = React.useState('')

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return
    onAddTask({
      title: newTaskTitle,
      task_type: 'A', // Default to A
      is_optional: false,
      description: '',
      weight: 0,
    })
    setNewTaskTitle('')
  }

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (readOnly) return
    const newTasks = [...tasks].sort((a, b) => a.weight - b.weight)

    if (direction === 'up' && index > 0) {
      const temp = newTasks[index]
      newTasks[index] = newTasks[index - 1]
      newTasks[index - 1] = temp
    } else if (direction === 'down' && index < newTasks.length - 1) {
      const temp = newTasks[index]
      newTasks[index] = newTasks[index + 1]
      newTasks[index + 1] = temp
    }

    const reorderedWithWeights = newTasks.map((t, i) => ({
      id: t.id,
      weight: (i + 1) * 10
    }))

    onReorderTasks(reorderedWithWeights)
  }

  // Sort tasks by weight for display
  const sortedTasks = [...tasks].sort((a, b) => a.weight - b.weight)

  return (
    <div className="space-y-6">
      {!readOnly && (
        <div className="flex gap-2">
          <Input
            placeholder="New task title..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            className="max-w-md"
          />
          <Button onClick={handleAddTask} disabled={!newTaskTitle.trim()}>
            <Plus className="mr-2 h-4 w-4" /> Add Task
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {sortedTasks.map((task, index) => (
          <TaskItem
            key={task.id}
            task={task}
            index={index}
            totalTasks={sortedTasks.length}
            readOnly={readOnly}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onMove={handleMove}
          />
        ))}
        {tasks.length === 0 && (
           <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
             No tasks yet. Add one above.
           </div>
        )}
      </div>
    </div>
  )
}
