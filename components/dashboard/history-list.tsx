'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTaskExecutionHistory } from '@/app/app/(dashboard)/[marketId]/dashboard/actions'
import { ExecutionLog } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, Eye, CheckCircle2, XCircle } from 'lucide-react'
import Editor from '@monaco-editor/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface HistoryListProps {
  marketId: string
  taskId: string
}

export function HistoryList({ marketId, taskId }: HistoryListProps) {
  const [selectedLog, setSelectedLog] = React.useState<ExecutionLog | null>(null)

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['execution-history', taskId],
    queryFn: () => getTaskExecutionHistory(marketId, taskId),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-2">
        <AlertCircle className="w-6 h-6" />
        <p className="text-sm">Failed to load history.</p>
      </div>
    )
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground gap-2">
        <p className="text-sm">No execution history found.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col gap-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col gap-2 p-3 rounded-lg border bg-card text-card-foreground shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {log.status === 'SUCCESS' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  <span className="text-sm font-medium">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                <Badge
                  variant={log.status === 'SUCCESS' ? 'default' : 'destructive'}
                  className={cn(
                      "text-xs capitalize",
                      log.status === 'SUCCESS' && "bg-green-500 hover:bg-green-600"
                  )}
                >
                  {log.status.toLowerCase()}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>User: {log.user_id ? log.user_id.substring(0, 8) + '...' : 'System'}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setSelectedLog(log)}
                >
                  <Eye className="w-3 h-3 mr-1.5" />
                  View Snapshot
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Execution Snapshot</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 border rounded-md overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="json"
              value={selectedLog ? JSON.stringify(selectedLog.snapshots?.content || selectedLog.payload, null, 2) : ''}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 12,
                scrollBeyondLastLine: false,
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
