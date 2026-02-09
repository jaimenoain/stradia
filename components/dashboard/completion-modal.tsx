'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface CompletionModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (summary: string) => void
  onCancel: () => void
}

export function CompletionModal({
  isOpen,
  onOpenChange,
  onConfirm,
  onCancel,
}: CompletionModalProps) {
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')

  const handleConfirm = () => {
    if (!summary.trim()) {
      setError('Completion summary is required.')
      return
    }
    onConfirm(summary)
    setSummary('')
    setError('')
  }

  const handleCancel = () => {
    onCancel()
    setSummary('')
    setError('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) handleCancel()
        else onOpenChange(open)
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Confirm Completion</DialogTitle>
          <DialogDescription>
            Please provide a summary of your work before completing this task.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="Type your summary here..."
            value={summary}
            onChange={(e) => {
                setSummary(e.target.value)
                if (e.target.value.trim()) setError('')
            }}
            className={error ? 'border-red-500' : ''}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
