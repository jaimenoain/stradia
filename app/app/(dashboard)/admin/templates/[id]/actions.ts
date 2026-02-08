'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { SupabaseClient } from '@supabase/supabase-js'
import { TemplateTask } from '@/types'

async function incrementVersion(templateId: string, supabase: SupabaseClient) {
  const { data: versions } = await supabase
    .from('template_versions')
    .select('version_string')
    .eq('template_id', templateId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!versions || versions.length === 0) {
    return '1.0'
  }

  const currentVersion = versions[0].version_string
  const parts = currentVersion.split('.')
  const lastPart = parts[parts.length - 1]
  const num = parseInt(lastPart, 10)

  if (!isNaN(num)) {
    parts[parts.length - 1] = (num + 1).toString()
    return parts.join('.')
  }

  return `${currentVersion}.1`
}

export async function publishTemplateVersion(versionId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { error } = await supabase
    .from('template_versions')
    .update({ status: 'PUBLISHED' })
    .eq('id', versionId)

  if (error) {
    console.error('Error publishing version:', error)
    throw new Error(error.message)
  }

  revalidatePath('/app/admin/templates/[id]')
}

export async function createTemplateVersion(templateId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Check if there is an existing draft
  const { data: existingDraft } = await supabase
    .from('template_versions')
    .select('id')
    .eq('template_id', templateId)
    .eq('status', 'DRAFT')
    .maybeSingle()

  if (existingDraft) {
    throw new Error('A draft version already exists.')
  }

  // Get latest version to copy tasks from
  const { data: latestVersion } = await supabase
    .from('template_versions')
    .select('*')
    .eq('template_id', templateId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const newVersionString = await incrementVersion(templateId, supabase)

  const { data: newVersion, error: createError } = await supabase
    .from('template_versions')
    .insert({
      template_id: templateId,
      version_string: newVersionString,
      status: 'DRAFT',
    })
    .select()
    .single()

  if (createError) {
    console.error('Error creating version:', createError)
    throw new Error(createError.message)
  }

  // Copy tasks if previous version exists
  if (latestVersion) {
    const { data: tasks, error: tasksError } = await supabase
      .from('template_tasks')
      .select('*')
      .eq('template_version_id', latestVersion.id)

    if (tasksError) {
      console.error('Error fetching tasks to copy:', tasksError)
      throw new Error(tasksError.message)
    }

    if (tasks && tasks.length > 0) {
      const newTasks = tasks.map((t) => ({
        template_version_id: newVersion.id,
        title: t.title,
        description: t.description,
        task_type: t.task_type,
        weight: t.weight,
        is_optional: t.is_optional,
        task_config: t.task_config,
      }))

      const { error: copyError } = await supabase
        .from('template_tasks')
        .insert(newTasks)

      if (copyError) {
        console.error('Error copying tasks:', copyError)
        throw new Error(copyError.message)
      }
    }
  }

  revalidatePath('/app/admin/templates/[id]')
  return newVersion
}

export async function getTasks(versionId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('template_tasks')
    .select('*')
    .eq('template_version_id', versionId)
    .order('weight', { ascending: true })

  if (error) {
    console.error('Error fetching tasks:', error)
    throw new Error(error.message)
  }

  return data
}

export async function createTask(versionId: string, task: Partial<TemplateTask>) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Get max weight
  const { data: maxWeightTask } = await supabase
    .from('template_tasks')
    .select('weight')
    .eq('template_version_id', versionId)
    .order('weight', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextWeight = (maxWeightTask?.weight || 0) + 1

  const { data, error } = await supabase
    .from('template_tasks')
    .insert({
      ...task,
      template_version_id: versionId,
      weight: nextWeight,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating task:', error)
    throw new Error(error.message)
  }

  revalidatePath('/app/admin/templates/[id]')
  return data
}

export async function updateTask(taskId: string, updates: Partial<TemplateTask>) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('template_tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single()

  if (error) {
    console.error('Error updating task:', error)
    throw new Error(error.message)
  }

  revalidatePath('/app/admin/templates/[id]')
  return data
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { error } = await supabase.from('template_tasks').delete().eq('id', taskId)

  if (error) {
    console.error('Error deleting task:', error)
    throw new Error(error.message)
  }

  revalidatePath('/app/admin/templates/[id]')
}

export async function reorderTasks(versionId: string, orderedTaskIds: string[]) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  // Update weights
  // Note: This is not atomic, but acceptable for this use case.
  // We loop and update each task's weight.
  const updates = orderedTaskIds.map((id, index) =>
    supabase.from('template_tasks').update({ weight: index + 1 }).eq('id', id)
  )

  await Promise.all(updates)

  revalidatePath('/app/admin/templates/[id]')
}
