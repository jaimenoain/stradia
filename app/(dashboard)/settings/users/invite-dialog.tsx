"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { inviteUser } from "@/app/actions/users"
import { Market, UserRole } from "./types"

const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.nativeEnum(UserRole),
  market_ids: z.array(z.string()).optional(),
}).refine((data) => {
  if ((data.role === 'LOCAL_USER' || data.role === 'SUPERVISOR') && (!data.market_ids || data.market_ids.length === 0)) {
    return false
  }
  return true
}, {
  message: "At least one market must be selected for this role",
  path: ["market_ids"],
})

type InviteUserFormValues = z.infer<typeof inviteUserSchema>

export function InviteUserDialog({
  open,
  onOpenChange,
  availableMarkets,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableMarkets: Market[]
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: "",
      role: UserRole.LOCAL_USER,
      market_ids: [],
    },
  })

  const role = form.watch("role")
  const showMarkets = role === 'LOCAL_USER' || role === 'SUPERVISOR'

  const onSubmit = (data: InviteUserFormValues) => {
    startTransition(async () => {
      try {
        await inviteUser({
          email: data.email,
          role: data.role,
          market_ids: data.market_ids || [],
        })

        toast({
          title: "Success",
          description: "User invited successfully.",
        })

        form.reset()
        onOpenChange(false)
        router.refresh()
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to invite user.",
          variant: "destructive",
        })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Add a new user to your organization.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="user@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(UserRole).map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showMarkets && (
              <FormField
                control={form.control}
                name="market_ids"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Markets</FormLabel>
                      <FormDescription>
                        Select the markets this user can access.
                      </FormDescription>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto space-y-2 border p-2 rounded-md">
                      {availableMarkets.map((market) => (
                        <FormField
                          key={market.id}
                          control={form.control}
                          name="market_ids"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={market.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(market.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), market.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== market.id
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {market.name}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Inviting..." : "Invite User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
