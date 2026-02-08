'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import { Loader2, Plus, FileText } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

import { useTemplate } from '@/hooks/use-template'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TaskEditor } from '@/components/template-editor/task-editor'
import {
  publishTemplateVersion,
  createTemplateVersion,
  addTask,
  updateTask,
  deleteTask,
  reorderTasks
} from './actions'

export default function TemplatePage() {
  const params = useParams()
  const templateId = params.id as string
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useTemplate(templateId)
  const [isActionLoading, setIsActionLoading] = React.useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-destructive">
        Error loading template
      </div>
    )
  }

  const { template, versions, tasks } = data
  const latestVersion = versions && versions.length > 0 ? versions[0] : null

  const handlePublish = async () => {
    if (!latestVersion) return
    setIsActionLoading(true)
    try {
      await publishTemplateVersion(latestVersion.id)
      await queryClient.invalidateQueries({ queryKey: ['template', templateId] })
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Failed to publish version')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleCreateDraft = async () => {
    setIsActionLoading(true)
    try {
      await createTemplateVersion(templateId)
      await queryClient.invalidateQueries({ queryKey: ['template', templateId] })
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Failed to create draft')
    } finally {
      setIsActionLoading(false)
    }
  }

  const isPublished = latestVersion?.status === 'PUBLISHED'
  const isDraft = latestVersion?.status === 'DRAFT'
  const isArchived = latestVersion?.status === 'ARCHIVED'

  return (
    <div className="flex flex-col gap-8 p-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{template.name}</h1>
          <p className="text-muted-foreground mt-1">
            {template.description || 'No description provided.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
           {latestVersion && (
             <Badge variant={isPublished ? 'default' : 'secondary'} className="text-sm px-3 py-1">
               v{latestVersion.version_string} • {latestVersion.status}
             </Badge>
           )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content Area - Shell for Editor */}
        <div className="md:col-span-2 space-y-6">
           <Card>
             <CardHeader>
               <CardTitle>Template Editor</CardTitle>
             </CardHeader>
             <CardContent>
                {!latestVersion ? (
                   <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-muted/50">
                     <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                     <h3 className="font-semibold text-lg">No Draft Available</h3>
                     <p className="text-sm text-muted-foreground max-w-sm mt-2">
                       Start a new draft to begin editing tasks.
                     </p>
                   </div>
                ) : (
                 <TaskEditor
                   tasks={tasks || []}
                   readOnly={isPublished || isArchived}
                   onAddTask={async (t) => {
                     if (!latestVersion) return
                     try {
                        await addTask(latestVersion.id, t)
                        queryClient.invalidateQueries({ queryKey: ['template', templateId] })
                     } catch (e) { console.error(e); alert('Failed to add task'); }
                   }}
                   onUpdateTask={async (taskId, updates) => {
                     try {
                       await updateTask(taskId, updates)
                       queryClient.invalidateQueries({ queryKey: ['template', templateId] })
                     } catch (e) { console.error(e); alert('Failed to update task'); }
                   }}
                   onDeleteTask={async (taskId) => {
                     try {
                        await deleteTask(taskId)
                        queryClient.invalidateQueries({ queryKey: ['template', templateId] })
                     } catch (e) { console.error(e); alert('Failed to delete task'); }
                   }}
                   onReorderTasks={async (items) => {
                     try {
                        await reorderTasks(items)
                        queryClient.invalidateQueries({ queryKey: ['template', templateId] })
                     } catch (e) { console.error(e); alert('Failed to reorder tasks'); }
                   }}
                 />
                )}
             </CardContent>
           </Card>
        </div>

        {/* Sidebar / Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {isDraft && (
                <Button
                  onClick={handlePublish}
                  disabled={isActionLoading}
                  className="w-full"
                >
                  {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Publish Version
                </Button>
              )}

              {isPublished && (
                <Button
                  onClick={handleCreateDraft}
                  disabled={isActionLoading}
                  variant="outline"
                  className="w-full"
                >
                  {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Create New Draft
                </Button>
              )}

               {isArchived && (
                <div className="text-sm text-muted-foreground text-center">
                  This version is archived.
                </div>
              )}

              {!latestVersion && (
                 <Button
                  onClick={handleCreateDraft}
                  disabled={isActionLoading}
                  className="w-full"
                >
                  {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Start First Draft
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Version History Placeholder */}
          <Card>
             <CardHeader>
               <CardTitle>Recent Versions</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="space-y-4">
                 {versions?.slice(0, 5).map(v => (
                   <div key={v.id} className="flex items-center justify-between text-sm">
                     <span className="font-medium">v{v.version_string}</span>
                     <Badge variant="outline" className="text-xs">{v.status}</Badge>
                   </div>
                 ))}
               </div>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
