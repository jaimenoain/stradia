import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    // QA Security Check:
    // If this is a vault connection, we must verify the CURRENT user (the one who initiated the flow)
    // has write access to the target market BEFORE we exchange the code.
    // Exchanging the code might log the user in as the Google account (which likely has no market access),
    // causing subsequent RLS checks to fail if we used the user client.
    if (type === 'vault_connect' && marketId) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error('Vault connection initiated without authenticated user')
        return NextResponse.redirect(`${origin}/login?error=Unauthorized`)
      }

      // Check market access
      // We rely on RLS policies here: if the user can select the market, they have access.
      // (Assuming 'markets' table has RLS enforcing org membership)
      const { data: market, error: marketError } = await supabase
        .from('markets')
        .select('id')
        .eq('id', marketId)
        .single()

      if (marketError || !market) {
        console.error('User does not have access to market', marketId)
        return NextResponse.redirect(
          `${origin}${next}?error=UnauthorizedMarketAccess`
        )
      }
    }

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
            refreshToken: data.session.provider_refresh_token,
          }

          // Use Admin Client for Blind Write
          // We already verified the initiator's access above.
          // We use admin client to bypass RLS because the session might have changed to the provider's identity.
          const adminSupabase = createAdminClient()

          // Blind Write Logic: Delete then Insert

          // 1. Delete existing secret
          const { error: deleteError } = await adminSupabase
            .from('vault_secrets')
            .delete()
            .eq('market_id', marketId)
            .eq('provider', provider)

          if (deleteError) {
            console.error('Error deleting existing secret:', deleteError)
            return NextResponse.redirect(
              `${origin}${next}?error=VaultDeleteFailed`
            )
          }

          // 2. Insert new secret
          // The trigger encrypts the 'encrypted_token' column value
          const { error: insertError } = await adminSupabase
            .from('vault_secrets')
            .insert({
              market_id: marketId,
              provider: provider,
              encrypted_token: JSON.stringify(tokenData),
            })

          if (insertError) {
            console.error('Error inserting secret:', insertError)
            return NextResponse.redirect(
              `${origin}${next}?error=VaultInsertFailed`
            )
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
          return NextResponse.redirect(
            `${origin}${next}?error=VaultUnexpectedError`
          )
        }
      }

      // Standard Auth Flow
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=AuthCodeError`)
}
