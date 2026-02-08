'use client'

import * as React from 'react'
import { TemplateTask } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'

interface TaskFormProps {
  initialData?: Partial<TemplateTask>
  onSubmit: (data: Partial<TemplateTask>) => Promise<void>
  isReadOnly?: boolean
  onCancel: () => void
}

export function TaskForm({ initialData, onSubmit, isReadOnly, onCancel }: TaskFormProps) {
  const [title, setTitle] = React.useState(initialData?.title || '')
  const [taskType, setTaskType] = React.useState<'A' | 'B' | 'C'>(initialData?.task_type || 'A')
  const [isOptional, setIsOptional] = React.useState(initialData?.is_optional || false)
  const [description, setDescription] = React.useState(initialData?.description || '')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit({
        title,
        task_type: taskType,
        is_optional: isOptional,
        description: description, // Always save description, but editing is hidden for non-A types
      })
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Task Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Initial Strategy Setup"
          required
          disabled={isReadOnly}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="taskType">Task Type</Label>
          <Select
            value={taskType}
            onValueChange={(value: 'A' | 'B' | 'C') => setTaskType(value)}
            disabled={isReadOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">Type A (Manual)</SelectItem>
              <SelectItem value="B">Type B</SelectItem>
              <SelectItem value="C">Type C</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-2 justify-start pt-1">
            <Label htmlFor="isOptional" className="mb-2">Optional (Ghost Card)</Label>
            <div className="flex items-center space-x-2">
                <Switch
                    id="isOptional"
                    checked={isOptional}
                    onCheckedChange={setIsOptional}
                    disabled={isReadOnly}
                />
                <span className="text-sm text-muted-foreground">
                    {isOptional ? 'Yes' : 'No'}
                </span>
            </div>
        </div>
      </div>

      {taskType === 'A' && (
        <div className="space-y-2">
          <Label htmlFor="description">
            Description (Markdown)
          </Label>
          <Textarea
            id="description"
            value={description || ''}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter detailed instructions here..."
            className="min-h-[200px] font-mono text-sm"
            disabled={isReadOnly}
          />
           <p className="text-xs text-muted-foreground">
            Supports Markdown formatting.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        {!isReadOnly && (
            <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {initialData ? 'Update Task' : 'Create Task'}
            </Button>
        )}
      </div>
    </form>
  )
}
