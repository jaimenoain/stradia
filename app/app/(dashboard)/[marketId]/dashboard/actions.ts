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

export async function updateTaskStatus(marketId: string, taskId: string, newStatus: string) {
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

    // @ts-ignore
    const taskType = task.template_tasks?.task_type || task.task_type

    if (taskType === 'B' || taskType === 'C') {
      throw new Error('Type B and C tasks cannot be manually moved to DONE')
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
