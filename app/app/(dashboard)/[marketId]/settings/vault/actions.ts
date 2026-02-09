'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { VaultProvider, VAULT_PROVIDERS, VaultStatus } from './types'

export async function getVaultStatus(marketId: string): Promise<VaultStatus> {
  // First, verify user authentication and access
  const userSupabase = await createClient()
  const {
    data: { user },
  } = await userSupabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Verify market access
  const { data: market, error: marketError } = await userSupabase
    .from('markets')
    .select('id')
    .eq('id', marketId)
    .single()

  if (marketError || !market) {
    throw new Error('Unauthorized access to market')
  }

  // Now use admin client to get status
  const supabase = createAdminClient()

  // Initialize status with false
  const status: VaultStatus = {
    GTM: false,
    GOOGLE_ADS: false,
    META: false,
  }

  const { data, error } = await supabase
    .from('vault_secrets')
    .select('provider')
    .eq('market_id', marketId)

  if (error) {
    console.error('Error fetching vault status:', error)
    return status
  }

  if (data) {
    data.forEach((row: { provider: string }) => {
      const p = row.provider as VaultProvider
      if (VAULT_PROVIDERS.includes(p)) {
        status[p] = true
      }
    })
  }

  return status
}

export async function saveVaultSecret(
  marketId: string,
  provider: VaultProvider,
  token: string
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Delete existing secret first (Blind Write logic)
  const { error: deleteError } = await supabase
    .from('vault_secrets')
    .delete()
    .eq('market_id', marketId)
    .eq('provider', provider)

  if (deleteError) {
    console.error('Error deleting existing secret:', deleteError)
    throw new Error('Failed to update secret')
  }

  // Insert new secret
  const { error: insertError } = await supabase.from('vault_secrets').insert({
    market_id: marketId,
    provider,
    encrypted_token: token, // The trigger will encrypt this
  })

  if (insertError) {
    console.error('Error inserting secret:', insertError)
    throw new Error('Failed to save secret')
  }

  revalidatePath(`/app/${marketId}/settings/vault`)
}
