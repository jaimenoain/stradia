'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, AlertCircle } from 'lucide-react'
import { DiffEditor } from '@monaco-editor/react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface DriftViewerProps {
  taskId: string
  isOpen: boolean
  onClose: () => void
}

export function DriftViewer({ taskId, isOpen, onClose }: DriftViewerProps) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<{ expected: any; actual: any } | null>(null)

  React.useEffect(() => {
    if (isOpen && taskId) {
      fetchDriftDetails()
    } else {
        // Reset state when closed
        setData(null)
        setError(null)
    }
  }, [isOpen, taskId])

  const fetchDriftDetails = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: result, error: funcError } = await supabase.functions.invoke('get-drift-details', {
        body: { taskId },
      })

      if (funcError) throw new Error(funcError.message)
      if (result.error) throw new Error(result.error)

      setData(result)
    } catch (err: any) {
      console.error('Failed to fetch drift details:', err)
      setError(err.message || 'An unexpected error occurred.')
      toast.error('Failed to load drift details')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] w-[1200px] h-[85vh] flex flex-col p-0 gap-0">
        <div className="px-6 py-4 border-b">
          <DialogHeader>
            <DialogTitle>Drift Analysis</DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex-1 min-h-0 bg-muted/10 relative">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 z-10 backdrop-blur-sm">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-sm font-medium text-muted-foreground">Analyzing Configuration Drift...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="bg-destructive/10 p-4 rounded-full mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-destructive mb-2">Analysis Failed</h3>
              <p className="text-muted-foreground max-w-md">{error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <div className="h-full w-full flex flex-col">
                 <div className="flex justify-between px-4 py-2 bg-muted/30 text-xs font-mono border-b">
                    <span className="font-semibold text-muted-foreground">Stradia Expected (Original)</span>
                    <span className="font-semibold text-muted-foreground">Live Actual (Modified)</span>
                 </div>
                 <div className="flex-1">
                    <DiffEditor
                        height="100%"
                        original={JSON.stringify(data.expected, null, 2)}
                        modified={JSON.stringify(data.actual, null, 2)}
                        language="json"
                        theme="vs-dark"
                        options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 13,
                        renderSideBySide: true,
                        padding: { top: 16, bottom: 16 },
                        }}
                    />
                 </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
