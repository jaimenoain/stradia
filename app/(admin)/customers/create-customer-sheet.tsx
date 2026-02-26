'use client';

import { useActionState, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createCustomer, ActionState } from '@/app/actions/admin-actions';
import { Loader2 } from 'lucide-react';

const initialState: ActionState = {
  success: false,
  message: '',
};

export function CreateCustomerSheet({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createCustomer, initialState);
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  useEffect(() => {
    if (state.success) {
      toast({
        variant: 'success',
        title: 'Success',
        description: state.message,
      });
      router.refresh();
      setOpen(false);
      // Reset form state
      setName('');
      setSlug('');
      setIsSlugManuallyEdited(false);
    } else if (state.message) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast, router]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (!isSlugManuallyEdited) {
      const generatedSlug = newName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value);
    setIsSlugManuallyEdited(true);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add Customer</SheetTitle>
          <SheetDescription>
            Create a new organization.
          </SheetDescription>
        </SheetHeader>
        <form action={formAction} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Company Name</Label>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={handleNameChange}
              placeholder="Acme Corp"
              required
            />
            {state.errors?.name && (
              <p className="text-sm text-red-500">{state.errors.name.join(', ')}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="slug">Domain / Slug</Label>
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={handleSlugChange}
              placeholder="acme-corp"
            />
             <p className="text-xs text-muted-foreground">
              Automatically generated from company name.
            </p>
          </div>
          <SheetFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Customer
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
