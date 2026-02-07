'use client'

import { useParams } from 'next/navigation'
import { useMarkets } from './use-markets'

export function useActiveMarket() {
  const params = useParams()

  const rawMarketId = params?.marketId
  const marketId = Array.isArray(rawMarketId) ? rawMarketId[0] : rawMarketId

  const { data: markets, isLoading, error } = useMarkets()

  const activeMarket = markets?.find((m) => m.id === marketId)

  return {
    marketId,
    activeMarket,
    isLoading,
    error,
    isValid: !!activeMarket,
    markets,
  }
}
