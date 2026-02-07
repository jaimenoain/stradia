'use client'

import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { createMarket } from '@/app/app/(dashboard)/admin/markets/actions'

export function CreateMarketModal() {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [region, setRegion] = React.useState('')
  const [currency, setCurrency] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: createMarket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['markets'] })
      setOpen(false)
      setName('')
      setRegion('')
      setCurrency('')
      setError(null)
    },
    onError: (err) => {
      setError(err.message || 'Failed to create market')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !region || !currency) {
      setError('All fields are required')
      return
    }
    mutate({ name, region_code: region, currency })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Market
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Market</DialogTitle>
          <DialogDescription>
            Add a new market to your organization. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="e.g. Japan"
                disabled={isPending}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="region" className="text-right text-sm font-medium">
                Region
              </label>
              <Input
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="col-span-3"
                placeholder="e.g. JP"
                disabled={isPending}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="currency" className="text-right text-sm font-medium">
                Currency
              </label>
              <Input
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="col-span-3"
                placeholder="e.g. JPY"
                disabled={isPending}
              />
            </div>
          </div>
          {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Market'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
