'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createOrganization(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const name = formData.get('organizationName') as string

  if (!name) {
    throw new Error('Organization name is required')
  }

  const { error: orgError } = await supabase
    .from('organizations')
    .insert({ name, owner_id: user.id })
    .select()
    .single()

  if (orgError) {
    console.error('Error creating organization:', orgError)
    throw new Error('Failed to create organization')
  }

  revalidatePath('/app', 'layout')
  redirect('/app')
}
