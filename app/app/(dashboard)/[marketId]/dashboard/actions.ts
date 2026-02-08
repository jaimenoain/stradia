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
