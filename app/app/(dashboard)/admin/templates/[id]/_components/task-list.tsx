'use client'

import * as React from 'react'
import { TemplateTask } from '@/types'
import { useQuery } from '@tanstack/react-query'
import {
  Loader2,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Ghost,
  FileText
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks
} from '../actions'
import { TaskForm } from './task-form'

interface TaskListProps {
  templateId: string
  versionId: string
  isReadOnly?: boolean
}

export function TaskList({ versionId, isReadOnly }: TaskListProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingTask, setEditingTask] = React.useState<TemplateTask | null>(null)

  const { data: tasks, isLoading, refetch } = useQuery({
    queryKey: ['template-tasks', versionId],
    queryFn: () => getTasks(versionId),
  })

  const handleCreate = async (data: Partial<TemplateTask>) => {
    await createTask(versionId, data)
    setIsDialogOpen(false)
    refetch()
  }

  const handleUpdate = async (data: Partial<TemplateTask>) => {
    if (!editingTask) return
    await updateTask(editingTask.id, data)
    setEditingTask(null)
    refetch()
  }

  const handleDelete = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(taskId)
      refetch()
    }
  }

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (!tasks) return
    const newTasks = [...tasks]
    const targetIndex = direction === 'up' ? index - 1 : index + 1

    if (targetIndex < 0 || targetIndex >= newTasks.length) return

    // Swap locally for visual feedback (though query refetch will overwrite)
    const temp = newTasks[index]
    newTasks[index] = newTasks[targetIndex]
    newTasks[targetIndex] = temp

    // Update server
    const orderedIds = newTasks.map(t => t.id)
    await reorderTasks(versionId, orderedIds)
    refetch()
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tasks</h2>
        {!isReadOnly && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingTask(null)}>
                <Plus className="mr-2 h-4 w-4" /> Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
              </DialogHeader>
              <TaskForm
                onSubmit={handleCreate}
                onCancel={() => setIsDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-3">
        {tasks && tasks.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-muted/50">
             <FileText className="h-10 w-10 text-muted-foreground mb-4" />
             <h3 className="font-semibold text-lg">No Tasks Yet</h3>
             <p className="text-sm text-muted-foreground max-w-sm mt-2">
               Get started by adding the first task to this template version.
             </p>
           </div>
        ) : (
          tasks?.map((task: TemplateTask, index: number) => (
            <Card key={task.id} className={`p-4 ${task.is_optional ? 'border-dashed border-2' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                   <div className="flex flex-col items-center gap-1 pt-1">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {index + 1}
                      </span>
                   </div>

                   <div className="space-y-1 w-full">
                      <div className="flex items-center gap-2">
                         <span className="font-semibold">{task.title}</span>
                         <Badge variant="outline" className="text-xs">Type {task.task_type}</Badge>
                         {task.is_optional && (
                           <Badge variant="secondary" className="text-xs flex items-center gap-1">
                             <Ghost className="h-3 w-3" /> Optional
                           </Badge>
                         )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 break-all">
                          {task.description}
                        </p>
                      )}
                   </div>
                </div>

                {!isReadOnly && (
                  <div className="flex items-center gap-1">
                    <div className="flex flex-col mr-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === 0}
                        onClick={() => handleMove(index, 'up')}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === (tasks.length - 1)}
                        onClick={() => handleMove(index, 'down')}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>

                    <Dialog open={!!editingTask && editingTask.id === task.id} onOpenChange={(open) => !open && setEditingTask(null)}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingTask(task)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Edit Task</DialogTitle>
                        </DialogHeader>
                        <TaskForm
                          initialData={task}
                          onSubmit={handleUpdate}
                          onCancel={() => setEditingTask(null)}
                        />
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
