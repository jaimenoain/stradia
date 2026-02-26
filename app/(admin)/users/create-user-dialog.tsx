'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Copy } from 'lucide-react';
import { createCustomerUser } from '@/app/actions/admin-actions';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Define TenantOption locally to avoid Prisma import in Client Component
export interface TenantOption {
  id: string;
  name: string;
}

const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  tenant_id: z.string().uuid('Please select an organization'),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateUserDialogProps {
  tenants: TenantOption[];
}

export function CreateUserDialog({ tenants }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      tenant_id: '',
    },
  });

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('email', data.email);
      formData.append('tenant_id', data.tenant_id);

      try {
        const result = await createCustomerUser({ success: false, message: '' }, formData);

        if (result.success) {
          if (result.inviteLink) {
            setInviteLink(result.inviteLink);
            toast({
              title: 'Success',
              description: 'User created. Please share the invite link.',
            });
          } else {
            toast({
              title: 'Success',
              description: 'User created successfully.',
            });
            setOpen(false);
            router.refresh();
          }
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: result.message || 'Failed to create user.',
          });
          // Show field errors if any
          if (result.errors) {
            Object.entries(result.errors).forEach(([key, messages]) => {
              if (messages && messages.length > 0) {
                // @ts-expect-error - key is string, but setError expects known field
                form.setError(key, { message: messages[0] });
              }
            });
          }
        }
      } catch {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'An unexpected error occurred.',
        });
      }
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && inviteLink) {
      // If closing after success (with link), refresh the data
      router.refresh();
      // Reset state for next time
      setInviteLink(null);
      form.reset();
    } else if (!newOpen) {
      form.reset();
    }
    setOpen(newOpen);
  };

  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast({
        title: 'Copied',
        description: 'Invite link copied to clipboard.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>
            Create a new user and assign them to an organization.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm font-medium mb-2">User created successfully!</p>
              <p className="text-xs text-muted-foreground mb-4">
                Share this magic link with the user to set their password.
              </p>
              <div className="flex items-center space-x-2">
                <Input value={inviteLink} readOnly className="font-mono text-xs" />
                <Button size="icon" variant="outline" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Close</Button>
            </DialogFooter>
          </div>
        ) : (
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
                name="tenant_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an organization" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Role</FormLabel>
                <Input disabled value="Global Admin" />
                <p className="text-[0.8rem] text-muted-foreground">
                  Role is currently fixed to Global Admin for tenant users.
                </p>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isPending ? 'Creating...' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
