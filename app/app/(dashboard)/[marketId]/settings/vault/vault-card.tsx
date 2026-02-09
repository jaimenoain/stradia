'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { VaultProvider } from './types'
import { VaultConnectionDialog } from './vault-connection-dialog'
import { Check, X, ShieldCheck } from 'lucide-react'

interface VaultCardProps {
  provider: VaultProvider
  isConnected: boolean
  marketId: string
}

export function VaultCard({ provider, isConnected, marketId }: VaultCardProps) {
  const [open, setOpen] = useState(false)

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
              : `Connect your ${provider} account.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {isConnected
              ? 'Credentials are encrypted and stored securely in your vault.'
              : 'Enter your API key or token to enable this integration.'}
          </p>
        </CardContent>
        <CardFooter>
          <Button
            variant={isConnected ? "outline" : "default"}
            onClick={() => setOpen(true)}
            className="w-full"
          >
            {isConnected ? 'Update Credentials' : 'Connect'}
          </Button>
        </CardFooter>
      </Card>
      <VaultConnectionDialog
        open={open}
        onOpenChange={setOpen}
        marketId={marketId}
        provider={provider}
      />
    </>
  )
}
