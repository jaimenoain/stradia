'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function acceptTask(marketId: string, originTemplateTaskId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Insert into market_tasks with status 'TODO'
  const { data, error } = await supabase
    .from('market_tasks')
    .insert({
      market_id: marketId,
      origin_template_task_id: originTemplateTaskId,
      status: 'TODO',
    })
    .select()
    .single()

  if (error) {
    console.error('Error accepting task:', error)
    throw new Error('Failed to accept task')
  }

  revalidatePath(`/app/${marketId}/dashboard`)

  return data
}

export async function getTaskExecutionHistory(marketId: string, taskId: string) {
  const supabase = await createClient()

  // Ensure user is authorized
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  // Fetch execution logs with snapshot details
  const { data, error } = await supabase
    .from('execution_logs')
    .select(`
      id,
      task_id,
      user_id,
      snapshot_id,
      status,
      payload,
      created_at,
      snapshots (
        content
      )
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching execution history:', error)
    throw new Error('Failed to fetch execution history')
  }

  // Transform data to match ExecutionLog interface
  return data.map((log: any) => ({
    ...log,
    snapshots: Array.isArray(log.snapshots) ? log.snapshots[0] || null : log.snapshots,
  }))
}

export async function updateTaskExecutionNotes(
  marketId: string,
  taskId: string,
  notes: string
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Prevent updates to Ghost tasks (temp_ IDs)
  if (taskId.startsWith('temp_')) {
    throw new Error('Please accept the task before adding notes.')
  }

  const { data, error } = await supabase
    .from('market_tasks')
    .update({ execution_notes: notes })
    .eq('id', taskId)
    .eq('market_id', marketId)
    .select()
    .single()

  if (error) {
    console.error('Error updating execution notes:', error)
    throw new Error('Failed to update execution notes')
  }

  revalidatePath(`/app/${marketId}/dashboard`)

  return data
}

export async function rejectTask(marketId: string, originTemplateTaskId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Insert into market_tasks with status 'ARCHIVED'
  const { data, error } = await supabase
    .from('market_tasks')
    .insert({
      market_id: marketId,
      origin_template_task_id: originTemplateTaskId,
      status: 'ARCHIVED',
    })
    .select()
    .single()

  if (error) {
    console.error('Error rejecting task:', error)
    throw new Error('Failed to reject task')
  }

  revalidatePath(`/app/${marketId}/dashboard`)

  return data
}

export async function updateTaskStatus(marketId: string, taskId: string, newStatus: string, completionSummary?: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const validStatuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'DRIFTED']
  if (!validStatuses.includes(newStatus)) {
    throw new Error('Invalid status')
  }

  // Check task type constraint if moving to DONE
  if (newStatus === 'DONE') {
    const { data: task, error: fetchError } = await supabase
      .from('market_tasks')
      .select(`
        status,
        origin_template_task_id,
        task_type,
        template_tasks (
          task_type
        )
      `)
      .eq('id', taskId)
      .single()

    if (fetchError || !task) {
      console.error('Error fetching task for validation:', fetchError)
      throw new Error('Task not found')
    }

    // @ts-expect-error: Suppressing type check for template_tasks property access on possibly incomplete type
    const taskType = task.template_tasks?.task_type || task.task_type

    if (taskType === 'B' || taskType === 'C') {
      throw new Error('Type B and C tasks cannot be manually moved to DONE')
    }

    if (taskType === 'A' && !completionSummary) {
      throw new Error('Completion summary is required for Type A tasks')
    }

    if (taskType === 'A' && completionSummary) {
      const { error: logError } = await supabase
        .from('task_activity_logs')
        .insert({
          market_task_id: taskId,
          user_id: user.id,
          action_type: 'COMPLETION',
          previous_status: task.status,
          new_status: newStatus,
          metadata: { summary: completionSummary },
        })

      if (logError) {
        console.error('Error logging completion:', logError)
        // Consider whether to block update if log fails. For integrity, we should.
        throw new Error('Failed to log completion')
      }
    }
  }

  const { data, error } = await supabase
    .from('market_tasks')
    .update({ status: newStatus })
    .eq('id', taskId)
    .eq('market_id', marketId)
    .select()
    .single()

  if (error) {
    console.error('Error updating task status:', error)
    throw new Error('Failed to update task status')
  }

  revalidatePath(`/app/${marketId}/dashboard`)

  return data
}

export async function createLocalTask(
  marketId: string,
  title: string,
  description: string | null = null
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data, error } = await supabase
    .from('market_tasks')
    .insert({
      market_id: marketId,
      title,
      description,
      status: 'TODO',
      task_type: 'A',
      origin_template_task_id: null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating local task:', error)
    throw new Error('Failed to create local task')
  }

  revalidatePath(`/app/${marketId}/dashboard`)

  return data
}
