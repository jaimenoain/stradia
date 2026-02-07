// This script verifies the logic used in hooks/use-active-market.ts and lib/utils.ts
// It includes the function implementation inline to avoid module resolution issues in this standalone script.

interface Market {
  id: string
  org_id: string
  name: string
  region_code: string | null
  currency: string | null
}

function resolveActiveMarket(
  markets: Market[] | undefined,
  marketId: string | string[] | undefined
) {
  const safeMarketId = Array.isArray(marketId) ? marketId[0] : marketId
  const activeMarket = markets?.find((m) => m.id === safeMarketId)
  return { marketId: safeMarketId, activeMarket }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`)
  } else {
    console.log(`PASS: ${message}`)
  }
}

function runTests() {
  const mockMarkets: Market[] = [
    { id: 'm1', org_id: 'o1', name: 'Market 1', region_code: 'US', currency: 'USD' },
    { id: 'm2', org_id: 'o1', name: 'Market 2', region_code: 'EU', currency: 'EUR' },
  ]

  // Test 1: Valid market ID
  const r1 = resolveActiveMarket(mockMarkets, 'm1')
  assert(r1.marketId === 'm1', 'Test 1: marketId should be "m1"')
  assert(r1.activeMarket?.id === 'm1', 'Test 1: activeMarket should be found')

  // Test 2: Invalid market ID
  const r2 = resolveActiveMarket(mockMarkets, 'm3')
  assert(r2.marketId === 'm3', 'Test 2: marketId should be "m3"')
  assert(r2.activeMarket === undefined, 'Test 2: activeMarket should be undefined')

  // Test 3: Array param (first element used)
  const r3 = resolveActiveMarket(mockMarkets, ['m2', 'foo'])
  assert(r3.marketId === 'm2', 'Test 3: marketId should be "m2"')
  assert(r3.activeMarket?.id === 'm2', 'Test 3: activeMarket should be found')

  // Test 4: Undefined params
  const r4 = resolveActiveMarket(mockMarkets, undefined)
  assert(r4.marketId === undefined, 'Test 4: marketId should be undefined')
  assert(r4.activeMarket === undefined, 'Test 4: activeMarket should be undefined')

  // Test 5: Undefined markets (loading state)
  const r5 = resolveActiveMarket(undefined, 'm1')
  assert(r5.marketId === 'm1', 'Test 5: marketId should be "m1"')
  assert(r5.activeMarket === undefined, 'Test 5: activeMarket should be undefined')
}

try {
  runTests()
  console.log('All logic verification tests passed.')
} catch (e) {
  console.error(e)
  // @ts-ignore
  if (typeof process !== 'undefined') process.exit(1)
}
