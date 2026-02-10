'use client'

import { type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

interface NavItem {
  title: string
  url: string | ((marketId: string) => string)
  icon: LucideIcon
  requiresMarket?: boolean
}

export function NavMain({
  items,
  marketId,
}: {
  items: NavItem[]
  marketId?: string
}) {
  const pathname = usePathname()

  const visibleItems = items.filter((item) => {
    // If explicit requiresMarket is set, respect it
    if (typeof item.requiresMarket === 'boolean') {
      return !item.requiresMarket || !!marketId
    }
    // If url is a function, it likely requires marketId
    if (typeof item.url === 'function') {
      return !!marketId
    }
    // Static URLs are generally global
    return true
  })

  if (visibleItems.length === 0) {
    return null
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {visibleItems.map((item) => {
          let url: string
          if (typeof item.url === 'function') {
            if (!marketId) return null
            url = item.url(marketId)
          } else {
            url = item.url
          }

          // Simple active check: exact match or sub-path, but be careful not to match partial segments if not intended
          const isActive = pathname === url || pathname?.startsWith(url + '/')

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                <Link href={url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
