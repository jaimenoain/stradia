import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Market } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function resolveActiveMarket(
  markets: Market[] | undefined,
  marketId: string | string[] | undefined
) {
  const safeMarketId = Array.isArray(marketId) ? marketId[0] : marketId
  const activeMarket = markets?.find((m) => m.id === safeMarketId)
  return { marketId: safeMarketId, activeMarket }
}
