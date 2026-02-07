'use client'

import { useParams } from 'next/navigation'
import { useMarkets } from './use-markets'
import { resolveActiveMarket } from '@/lib/utils'

export function useActiveMarket() {
  const params = useParams()
  const rawMarketId = params?.marketId

  const { data: markets, isLoading, error } = useMarkets()

  const { marketId, activeMarket } = resolveActiveMarket(markets, rawMarketId)

  return {
    marketId,
    activeMarket,
    isLoading,
    error,
    isValid: !!activeMarket,
    markets,
  }
}
