'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { VaultProvider } from './types'
import { VaultConnectionDialog } from './vault-connection-dialog'
import { Check, X, ShieldCheck, Loader2 } from 'lucide-react'

interface VaultCardProps {
  provider: VaultProvider
  isConnected: boolean
  marketId: string
}

export function VaultCard({ provider, isConnected, marketId }: VaultCardProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleConnect = async () => {
    if (!supabase) {
      console.error('Supabase client not initialized')
      return
    }

    if (provider === 'GTM') {
      setLoading(true)
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            scopes: 'https://www.googleapis.com/auth/tagmanager.edit.containers https://www.googleapis.com/auth/analytics.edit',
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
            redirectTo: `${window.location.origin}/auth/callback?next=/app/${marketId}/settings/vault&type=vault_connect&market_id=${marketId}&provider=GTM`,
          },
        })
        if (error) {
           console.error('OAuth error:', error)
           setLoading(false)
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setLoading(false)
      }
    } else {
      setOpen(true)
    }
  }

  const isOAuthProvider = provider === 'GTM'

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              {provider}
            </CardTitle>
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? (
                <span className="flex items-center gap-1">
                  <Check className="h-3 w-3" /> Connected
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <X className="h-3 w-3" /> Not Connected
                </span>
              )}
            </Badge>
          </div>
          <CardDescription>
            {isConnected
              ? `Your ${provider} integration is active.`
              : isOAuthProvider
                ? `Connect your ${provider} account.`
                : `Connect your ${provider} account.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {isConnected
              ? 'Credentials are encrypted and stored securely in your vault.'
              : isOAuthProvider
                ? 'Connect with your provider account to enable this integration.'
                : 'Enter your API key or token to enable this integration.'}
          </p>
        </CardContent>
        <CardFooter>
          <Button
            variant={isConnected ? "outline" : "default"}
            onClick={handleConnect}
            className="w-full"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isConnected
              ? isOAuthProvider ? 'Reconnect' : 'Update Credentials'
              : isOAuthProvider ? `Connect ${provider}` : 'Connect'}
          </Button>
        </CardFooter>
      </Card>
      {!isOAuthProvider && (
        <VaultConnectionDialog
          open={open}
          onOpenChange={setOpen}
          marketId={marketId}
          provider={provider}
        />
      )}
    </>
  )
}
