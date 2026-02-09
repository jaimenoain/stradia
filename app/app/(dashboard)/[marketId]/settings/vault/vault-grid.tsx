'use client'

import { useQuery } from '@tanstack/react-query'
import { getVaultStatus } from './actions'
import { VaultCard } from './vault-card'
import { VaultStatus, VAULT_PROVIDERS } from './types'

interface VaultGridProps {
  marketId: string
  initialStatus: VaultStatus
}

export function VaultGrid({ marketId, initialStatus }: VaultGridProps) {
  const { data: status } = useQuery({
    queryKey: ['vaultStatus', marketId],
    queryFn: () => getVaultStatus(marketId),
    initialData: initialStatus,
  })

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {VAULT_PROVIDERS.map((provider) => (
        <VaultCard
          key={provider}
          provider={provider}
          isConnected={status[provider]}
          marketId={marketId}
        />
      ))}
    </div>
  )
}
