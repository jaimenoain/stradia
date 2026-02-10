'use client'

import * as React from 'react'
import {
  Briefcase,
  Globe,
  LayoutDashboard,
  Settings,
  ShoppingBag,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { MarketSwitcher } from '@/components/sidebar/market-switcher'
import { NavMain } from '@/components/sidebar/nav-main'
import { useActiveMarket } from '@/hooks/use-active-market'

// Menu items.
const items = [
  {
    title: 'Satellite View',
    url: '/app/dashboard',
    icon: Globe,
    requiresMarket: false,
  },
  {
    title: 'Market Board',
    url: (marketId: string) => `/app/${marketId}/board`,
    icon: LayoutDashboard,
  },
  {
    title: 'Strategy Marketplace',
    url: (marketId: string) => `/app/${marketId}/marketplace`,
    icon: ShoppingBag,
  },
  {
    title: 'Market Management',
    url: (marketId: string) => `/app/${marketId}/management`,
    icon: Briefcase,
  },
  {
    title: 'Settings',
    url: (marketId: string) => `/app/${marketId}/settings`,
    icon: Settings,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { marketId } = useActiveMarket()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <MarketSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} marketId={marketId} />
      </SidebarContent>
      <SidebarFooter>
        {/* Placeholder for footer items */}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
