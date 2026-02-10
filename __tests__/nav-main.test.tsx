import React from 'react'
import { render, screen } from '@testing-library/react'
import { NavMain } from '@/components/sidebar/nav-main'
import { Home, User } from 'lucide-react'

// Mock usePathname
jest.mock('next/navigation', () => ({
  usePathname: () => '/app/dashboard',
}))

// Mock Sidebar components to render children simply
jest.mock('@/components/ui/sidebar', () => ({
  SidebarGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  SidebarMenuButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}))

describe('NavMain', () => {
  const items = [
    {
      title: 'Global Item',
      url: '/global',
      icon: Home,
      requiresMarket: false,
    },
    {
      title: 'Market Item',
      url: (id: string) => `/market/${id}`,
      icon: User,
      // Implicit requiresMarket: true because function url
    },
    {
      title: 'Explicit Market Item',
      url: '/explicit-market',
      icon: User,
      requiresMarket: true,
    },
  ]

  it('renders global items when marketId is undefined', () => {
    render(<NavMain items={items} marketId={undefined} />)

    expect(screen.getByText('Global Item')).toBeInTheDocument()
    expect(screen.queryByText('Market Item')).not.toBeInTheDocument()
    expect(screen.queryByText('Explicit Market Item')).not.toBeInTheDocument()
  })

  it('renders all items when marketId is defined', () => {
    render(<NavMain items={items} marketId="123" />)

    expect(screen.getByText('Global Item')).toBeInTheDocument()
    expect(screen.getByText('Market Item')).toBeInTheDocument()
    expect(screen.getByText('Explicit Market Item')).toBeInTheDocument()
  })

  it('renders nothing if no visible items', () => {
    const marketOnlyItems = [
      {
        title: 'Market Item',
        url: (id: string) => `/market/${id}`,
        icon: User,
      }
    ]
    const { container } = render(<NavMain items={marketOnlyItems} marketId={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })
})
