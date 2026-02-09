import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VAULT_PROVIDERS = ['GTM', 'GOOGLE_ADS', 'META']

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/app'
  const type = searchParams.get('type')
  const marketId = searchParams.get('market_id')
  const provider = searchParams.get('provider')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Handle Vault Connection
      if (
        type === 'vault_connect' &&
        marketId &&
        provider &&
        VAULT_PROVIDERS.includes(provider) &&
        data.session?.provider_token
      ) {
        try {
          // Construct token object
          // We store both access and refresh tokens if available
          const tokenData = {
            accessToken: data.session.provider_token,
            refreshToken: data.session.provider_refresh_token
          }

          // Blind Write Logic: Delete then Insert

          // 1. Delete existing secret
          const { error: deleteError } = await supabase
            .from('vault_secrets')
            .delete()
            .eq('market_id', marketId)
            .eq('provider', provider)

          if (deleteError) {
            console.error('Error deleting existing secret:', deleteError)
            return NextResponse.redirect(`${origin}${next}?error=VaultDeleteFailed`)
          }

          // 2. Insert new secret
          // The trigger encrypts the 'encrypted_token' column value
          const { error: insertError } = await supabase
            .from('vault_secrets')
            .insert({
              market_id: marketId,
              provider: provider,
              encrypted_token: JSON.stringify(tokenData),
            })

          if (insertError) {
            console.error('Error inserting secret:', insertError)
            return NextResponse.redirect(`${origin}${next}?error=VaultInsertFailed`)
          }

          // Redirect with success flag
          // Assuming 'next' points to /app/[marketId]/settings/vault
          // We append connected=true
          const nextUrl = new URL(next, origin)
          nextUrl.searchParams.set('connected', 'true')
          nextUrl.searchParams.set('provider', provider)
          return NextResponse.redirect(nextUrl.toString())

        } catch (err) {
          console.error('Unexpected error in vault callback:', err)
          return NextResponse.redirect(`${origin}${next}?error=VaultUnexpectedError`)
        }
      }

      // Standard Auth Flow
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=AuthCodeError`)
}
