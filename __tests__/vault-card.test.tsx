import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VaultCard } from '../app/app/(dashboard)/[marketId]/settings/vault/vault-card'
import { createClient } from '@/lib/supabase/client'

// Mock createClient
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// Mock Dialog components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock VaultConnectionDialog
jest.mock('../app/app/(dashboard)/[marketId]/settings/vault/vault-connection-dialog', () => ({
  VaultConnectionDialog: ({ open }: { open: boolean }) => open ? <div>Mocked Dialog</div> : null,
}))

describe('VaultCard', () => {
  const mockSignInWithOAuth = jest.fn()
  const mockSupabase = {
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }

  beforeEach(() => {
    (createClient as jest.Mock).mockReturnValue(mockSupabase)
    mockSignInWithOAuth.mockClear()
    // We rely on JSDOM default location.origin which is typically 'http://localhost'
  })

  it('renders Connect GTM button for GTM provider', () => {
    render(<VaultCard provider="GTM" isConnected={false} marketId="market-123" />)
    expect(screen.getByRole('button', { name: /Connect GTM/i })).toBeInTheDocument()
    expect(screen.getByText('Connect with your provider account to enable this integration.')).toBeInTheDocument()
  })

  it('calls signInWithOAuth with correct parameters when Connect GTM is clicked', async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null })
    render(<VaultCard provider="GTM" isConnected={false} marketId="market-123" />)

    const button = screen.getByRole('button', { name: /Connect GTM/i })
    fireEvent.click(button)

    // JSDOM default origin is http://localhost
    const expectedOrigin = 'http://localhost'

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/tagmanager.edit.containers https://www.googleapis.com/auth/analytics.edit',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo: `${expectedOrigin}/auth/callback?next=/app/market-123/settings/vault&type=vault_connect&market_id=market-123&provider=GTM`,
        },
      })
    })
  })

  it('renders Reconnect button when GTM is connected', () => {
    render(<VaultCard provider="GTM" isConnected={true} marketId="market-123" />)
    expect(screen.getByRole('button', { name: /Reconnect/i })).toBeInTheDocument()
  })

  it('renders standard Connect button for other providers', () => {
    render(<VaultCard provider="META" isConnected={false} marketId="market-123" />)
    expect(screen.getByRole('button', { name: /^Connect$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Connect GTM/i })).not.toBeInTheDocument()
  })
})
