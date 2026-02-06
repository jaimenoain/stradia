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

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name, owner_id: user.id })
    .select()
    .single()

  if (orgError) {
    console.error('Error creating organization:', orgError)
    throw new Error('Failed to create organization')
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ org_id: org.id })
    .eq('user_id', user.id)

  if (profileError) {
    console.error('Error updating profile:', profileError)
    throw new Error('Failed to link profile to organization')
  }

  revalidatePath('/app', 'layout')
  redirect('/app')
}
