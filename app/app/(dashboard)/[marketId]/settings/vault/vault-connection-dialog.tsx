'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveVaultSecret } from './actions'
import { VaultProvider } from './types'

interface VaultConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  marketId: string
  provider: VaultProvider
}

export function VaultConnectionDialog({
  open,
  onOpenChange,
  marketId,
  provider,
}: VaultConnectionDialogProps) {
  const [token, setToken] = useState('')
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      await saveVaultSecret(marketId, provider, token)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaultStatus', marketId] })
      onOpenChange(false)
      setToken('')
    },
    onError: (error) => {
      console.error('Failed to save secret:', error)
      alert('Failed to save secret')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect {provider}</DialogTitle>
          <DialogDescription>
            Enter your API Key / Token for {provider}. It will be encrypted and stored securely.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="token">
                  API Key
                </Label>
                <Input
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  type="password"
                  required
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save connection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
