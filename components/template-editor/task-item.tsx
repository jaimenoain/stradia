'use client'

import * as React from 'react'
import { Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { TemplateTask } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

interface TaskItemProps {
  task: TemplateTask
  index: number
  totalTasks: number
  readOnly?: boolean
  onUpdateTask: (taskId: string, updates: Partial<TemplateTask>) => void
  onDeleteTask: (taskId: string) => void
  onMove: (index: number, direction: 'up' | 'down') => void
}

export function TaskItem({
  task,
  index,
  totalTasks,
  readOnly,
  onUpdateTask,
  onDeleteTask,
  onMove,
}: TaskItemProps) {
  const [title, setTitle] = React.useState(task.title)
  const [description, setDescription] = React.useState(task.description || '')

  React.useEffect(() => {
    setTitle(task.title)
  }, [task.title])

  React.useEffect(() => {
    setDescription(task.description || '')
  }, [task.description])

  const handleTitleBlur = () => {
    if (title !== task.title) {
      onUpdateTask(task.id, { title })
    }
  }

  const handleDescriptionBlur = () => {
    if (description !== (task.description || '')) {
      onUpdateTask(task.id, { description })
    }
  }

  return (
    <Card className="relative">
       <CardContent className="p-4 flex gap-4 items-start">
          {!readOnly && (
            <div className="flex flex-col gap-1 pt-2">
               <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onMove(index, 'up')}
                  disabled={index === 0}
                  title="Move Up"
                >
                 <ArrowUp className="h-4 w-4" />
               </Button>
               <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onMove(index, 'down')}
                  disabled={index === totalTasks - 1}
                  title="Move Down"
                >
                 <ArrowDown className="h-4 w-4" />
               </Button>
            </div>
          )}

          <div className="flex-1 space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                 <Label className="text-xs text-muted-foreground">Title</Label>
                 <Input
                   value={title}
                   onChange={(e) => setTitle(e.target.value)}
                   onBlur={handleTitleBlur}
                   disabled={readOnly}
                 />
              </div>
              <div className="w-32 space-y-2">
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={task.task_type}
                    onChange={(e) => onUpdateTask(task.id, { task_type: e.target.value as 'A' | 'B' | 'C' })}
                    disabled={readOnly}
                  >
                    <option value="A">Type A</option>
                    <option value="B">Type B</option>
                    <option value="C">Type C</option>
                  </select>
              </div>
            </div>

            <div className="space-y-2">
               <Label className="text-xs text-muted-foreground">Description (Rich Text)</Label>
               <Textarea
                 value={description}
                 onChange={(e) => setDescription(e.target.value)}
                 onBlur={handleDescriptionBlur}
                 disabled={readOnly}
                 className="min-h-[100px]"
               />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={task.is_optional}
                onCheckedChange={(checked) => onUpdateTask(task.id, { is_optional: checked as boolean })}
                disabled={readOnly}
                id={`optional-${task.id}`}
              />
              <Label htmlFor={`optional-${task.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                Optional Task (Ghost Card)
              </Label>
            </div>
          </div>

          {!readOnly && (
             <Button variant="destructive" size="icon" onClick={() => onDeleteTask(task.id)} title="Delete Task">
               <Trash2 className="h-4 w-4" />
             </Button>
          )}
       </CardContent>
    </Card>
  )
}
