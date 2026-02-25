"use client"

import { useState, useTransition } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Edit, UserPlus, Trash, ChevronLeft, ChevronRight } from "lucide-react"
import { InviteUserDialog } from "./invite-dialog"
import { EditUserSheet } from "./edit-sheet"
import { User, Market, UserRole } from "./types"

interface UserDirectoryClientProps {
  users: User[]
  availableMarkets: Market[]
  currentUserRole: UserRole
  totalCount: number
  currentPage: number
  pageSize: number
}

export function UserDirectoryClient({
  users,
  availableMarkets,
  currentUserRole,
  totalCount,
  currentPage,
  pageSize
}: UserDirectoryClientProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setIsEditOpen(true)
  }

  const handleDelete = (user: User) => {
    // Placeholder for delete logic
    console.log("Delete user:", user.id)
    alert("Delete functionality coming soon.")
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", newPage.toString())

    startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
    })
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Users</h2>
        <Button onClick={() => setIsInviteOpen(true)} disabled={currentUserRole !== 'GLOBAL_ADMIN'}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Market Access</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {user.role === 'GLOBAL_ADMIN' ? (
                      <span className="text-sm text-muted-foreground">All Markets</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {user.markets.length > 0 ? (
                          <>
                            {user.markets.slice(0, 3).map((um) => (
                              <Badge key={um.market.id} variant="secondary">
                                {um.market.name}
                              </Badge>
                            ))}
                            {user.markets.length > 3 && (
                              <Badge variant="secondary">+{user.markets.length - 3} more</Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">None assigned</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(user)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleDelete(user)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isPending}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {Math.max(1, totalPages)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isPending}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <InviteUserDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        availableMarkets={availableMarkets}
      />

      {selectedUser && (
        <EditUserSheet
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          user={selectedUser}
          availableMarkets={availableMarkets}
        />
      )}
    </div>
  )
}
