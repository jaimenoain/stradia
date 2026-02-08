'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function incrementVersion(templateId: string, supabase: any) {
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

export async function addTask(versionId: string, task: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get max weight
  const { data: tasks } = await supabase
    .from('template_tasks')
    .select('weight')
    .eq('template_version_id', versionId)
    .order('weight', { ascending: false })
    .limit(1)

  const maxWeight = tasks && tasks.length > 0 ? tasks[0].weight : 0
  const weight = maxWeight + 10

  const { error } = await supabase.from('template_tasks').insert({
    template_version_id: versionId,
    title: task.title,
    description: task.description,
    task_type: task.task_type,
    is_optional: task.is_optional,
    task_config: task.task_config || {},
    weight,
  })

  if (error) {
    console.error('Error adding task:', error)
    throw new Error(error.message)
  }
  revalidatePath('/app/admin/templates/[id]')
}

export async function updateTask(taskId: string, updates: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('template_tasks')
    .update(updates)
    .eq('id', taskId)

  if (error) {
    console.error('Error updating task:', error)
    throw new Error(error.message)
  }
  revalidatePath('/app/admin/templates/[id]')
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('template_tasks')
    .delete()
    .eq('id', taskId)

  if (error) {
    console.error('Error deleting task:', error)
    throw new Error(error.message)
  }
  revalidatePath('/app/admin/templates/[id]')
}

export async function reorderTasks(items: { id: string; weight: number }[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const updates = items.map(item =>
    supabase.from('template_tasks').update({ weight: item.weight }).eq('id', item.id)
  )

  await Promise.all(updates)
  revalidatePath('/app/admin/templates/[id]')
}
