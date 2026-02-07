'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type CreateMarketInput = {
  name: string
  region_code: string
  currency: string
}

export async function createMarket(input: CreateMarketInput) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { name, region_code, currency } = input

  if (!name || !region_code || !currency) {
    throw new Error('Missing required fields')
  }

  // Get user's org_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile?.org_id) {
    console.error('Error fetching profile:', profileError)
    throw new Error('Failed to fetch user organization')
  }

  const { data, error } = await supabase
    .from('markets')
    .insert({
      org_id: profile.org_id,
      name,
      region_code,
      currency,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating market:', error)
    throw new Error(error.message || 'Failed to create market')
  }

  revalidatePath('/app/admin/markets')

  return data
}
