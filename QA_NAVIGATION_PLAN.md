# QA Navigation Plan

This document outlines the verification plan for the Dashboard Navigation logic, ensuring support for the multi-tenant architecture.

## Architecture Overview

- **Persistence**: Sidebar is rendered in `app/app/(dashboard)/layout.tsx`, wrapping all dashboard routes.
- **URL as Truth**: `MarketSwitcher` uses `router.push` to update the URL.
- **Reactivity**: `useActiveMarket` derives state from `useParams` and `useMarkets`.
- **Security**: Access is controlled via RLS in Supabase and verified by `useMarkets` and backend checks.

## Verification Checklist

### 1. Persistence
- [ ] **Navigate between pages**: Go from `/app/[marketId]/board` to `/app/[marketId]/settings`.
- [ ] **Verify Sidebar**: Ensure the Sidebar does not flicker or unmount. The `SidebarProvider` in the layout handles this.

### 2. URL as Truth
- [ ] **Switch Market**: Use the Market Switcher in the sidebar to select a different market.
- [ ] **Verify URL**: The URL should change to `/app/[newMarketId]/board`.
- [ ] **Refresh Page**: Refreshing the page should keep the selected market active.

### 3. Reactivity
- [ ] **Manual URL Change**: Manually change the market ID in the address bar (e.g., from `m1` to `m2`).
- [ ] **Verify Sidebar Update**: The "Active Market" in the sidebar should update to match the URL.

### 4. Security / Edge Cases
- [ ] **Invalid Market ID**: Enter a non-existent market ID in the URL.
    - Expected: "Market not found" message or empty state, no crash.
- [ ] **Unauthorized Market ID**: Enter a valid market ID that belongs to another organization.
    - Expected: RLS prevents fetching the market; behaves like "Market not found".

## Automated Logic Verification

A standalone script `scripts/verify_logic_standalone.ts` has been created to verify the core logic of `resolveActiveMarket`.

Run it with:
```bash
npx ts-node scripts/verify_logic_standalone.ts
```

## Manual Verification Results (Simulated)

Based on code analysis:
- **Persistence**: `SidebarProvider` is correctly placed in the layout.
- **URL as Truth**: `router.push` is used correctly.
- **Reactivity**: `useParams` is used correctly.
- **Security**: RLS is enforced on `markets` table query.
