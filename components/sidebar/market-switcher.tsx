'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Plus, Store } from 'lucide-react'
import { useRouter } from 'next/navigation'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useMarkets } from '@/hooks/use-markets'
import { useActiveMarket } from '@/hooks/use-active-market'

export function MarketSwitcher() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { data: markets, isLoading: isLoadingMarkets } = useMarkets()
  const { activeMarket, isLoading: isLoadingActive } = useActiveMarket()

  const [open, setOpen] = React.useState(false)

  if (isLoadingMarkets || isLoadingActive) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="animate-pulse">
             <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground opacity-50">
               <Store className="size-4" />
             </div>
             <div className="grid flex-1 text-left text-sm leading-tight gap-1">
                <div className="h-2 w-24 bg-sidebar-accent-foreground/10 rounded"></div>
             </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const safeMarkets = markets || []
  // If no active market, try to find one, but rely on useActiveMarket primarily
  const currentMarket = activeMarket

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Store className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {currentMarket ? currentMarket.name : 'Select Market'}
                </span>
                <span className="truncate text-xs">
                  {currentMarket ? 'Market' : 'No Market Selected'}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Markets
            </DropdownMenuLabel>
            {safeMarkets.map((market) => (
              <DropdownMenuItem
                key={market.id}
                onClick={() => {
                  router.push(`/app/${market.id}/dashboard`)
                  setOpen(false)
                }}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <Store className="size-4 shrink-0" />
                </div>
                {market.name}
                {currentMarket?.id === market.id && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">Add market</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
