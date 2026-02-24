'use client'

import { useState, useActionState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Trash2, Plus, Loader2 } from 'lucide-react'
import { createMarketAction, deleteMarketAction, ActionState } from '@/app/actions/market-actions'

export type MarketWithStatus = {
    id: string
    name: string
    region_code: string
    timezone: string
    is_active: boolean
    deleted_at: Date | string | null
}

const timezones = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
]

const initialState: ActionState = {
  success: false,
  message: '',
}

export function MarketManager({ markets }: { markets: MarketWithStatus[] }) {
  const { toast } = useToast()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [marketToDelete, setMarketToDelete] = useState<MarketWithStatus | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  const [createState, createAction, isCreating] = useActionState(createMarketAction, initialState)
  const [deleteState, deleteAction, isDeleting] = useActionState(deleteMarketAction, initialState)

  useEffect(() => {
    if (createState.message) {
      if (createState.success) {
        toast({ title: 'Success', description: createState.message })
        setIsAddOpen(false)
      } else {
        toast({ title: 'Error', description: createState.message, variant: 'destructive' })
      }
    }
  }, [createState, toast])

  useEffect(() => {
    if (deleteState.message) {
      if (deleteState.success) {
        toast({ title: 'Success', description: deleteState.message })
        setIsDeleteOpen(false)
        setMarketToDelete(null)
        setDeleteConfirmation('')
      } else {
        toast({ title: 'Error', description: deleteState.message, variant: 'destructive' })
      }
    }
  }, [deleteState, toast])

  const openDeleteDialog = (market: MarketWithStatus) => {
    setMarketToDelete(market)
    setDeleteConfirmation('')
    setIsDeleteOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Markets</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add New Market</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Market</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new market.
              </DialogDescription>
            </DialogHeader>
            <form action={createAction} className="space-y-4">
              <div className="grid gap-2">
                <label htmlFor="name" className="text-sm font-medium">Name</label>
                <Input id="name" name="name" placeholder="e.g. North America" required />
                {createState.errors?.name && <p className="text-red-500 text-sm">{createState.errors.name.join(', ')}</p>}
              </div>
              <div className="grid gap-2">
                <label htmlFor="region_code" className="text-sm font-medium">Region Code</label>
                <Input id="region_code" name="region_code" placeholder="e.g. NA" required />
                {createState.errors?.region_code && <p className="text-red-500 text-sm">{createState.errors.region_code.join(', ')}</p>}
              </div>
              <div className="grid gap-2">
                <label htmlFor="timezone" className="text-sm font-medium">Timezone</label>
                <Select name="timezone" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {createState.errors?.timezone && <p className="text-red-500 text-sm">{createState.errors.timezone.join(', ')}</p>}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create Market'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Market Name</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Timezone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {markets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">No markets found.</TableCell>
              </TableRow>
            ) : (
              markets.map((market) => (
                <TableRow key={market.id}>
                  <TableCell className="font-medium">{market.name}</TableCell>
                  <TableCell>{market.region_code}</TableCell>
                  <TableCell>{market.timezone}</TableCell>
                  <TableCell>
                    {market.deleted_at ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Deleted
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                        </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {!market.deleted_at && (
                        <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(market)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                            <span className="sr-only">Delete</span>
                        </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Delete Market</DialogTitle>
                <DialogDescription>
                    This action cannot be undone. Please type <strong>{marketToDelete?.name}</strong> to confirm.
                </DialogDescription>
            </DialogHeader>
            <form action={deleteAction} className="space-y-4">
                <input type="hidden" name="marketId" value={marketToDelete?.id || ''} />
                <Input
                    name="confirmName"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="Type market name to confirm"
                    required
                />
                <DialogFooter>
                    <Button
                        type="submit"
                        variant="destructive"
                        disabled={isDeleting || deleteConfirmation !== marketToDelete?.name}
                    >
                        {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : 'Confirm Delete'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
