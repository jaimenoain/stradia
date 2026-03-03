'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createCustomerCore,
  createCustomerSchema,
  createCustomerUserCore,
  createCustomerUserSchema,
  createGlobalMarketCore,
  createGlobalMarketSchema,
  deleteGlobalMarketCore,
  getGlobalUsersCore,
  getActiveTenantsCore,
  ActionState,
} from './admin-core';

export async function createGlobalMarketAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, message: 'Unauthorized' }
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  })

  if (!dbUser) {
    return { success: false, message: 'User not found in database' }
  }

  const validatedFields = createGlobalMarketSchema.safeParse({
    name: formData.get('name'),
    region_code: formData.get('region_code'),
    timezone: formData.get('timezone'),
    tenant_id: formData.get('tenant_id'),
  })

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  try {
    await createGlobalMarketCore(
      { id: user.id, role: dbUser.role as unknown as string },
      prisma,
      validatedFields.data
    )

    revalidatePath('/admin/markets')
    return { success: true, message: 'Market created successfully' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create market';
    return { success: false, message }
  }
}

export async function deleteGlobalMarketAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const marketId = formData.get('marketId') as string

  if (!marketId) {
    return { success: false, message: 'Market ID is required' }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, message: 'Unauthorized' }
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  })

  if (!dbUser) {
    return { success: false, message: 'User not found in database' }
  }

  try {
    await deleteGlobalMarketCore(
      { id: user.id, role: dbUser.role as unknown as string },
      prisma,
      marketId
    )

    revalidatePath('/admin/markets')
    return { success: true, message: 'Market deleted successfully' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete market';
    return { success: false, message }
  }
}

export async function createCustomerUser(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

  let dbUser: { id: string; role: string } | null = null;
  let userId = user?.id;

  if (useMocks && !user) {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const mockRole = cookieStore.get('mock_role')?.value;
    if (mockRole) {
       userId = 'mock-user-id';
       dbUser = { id: userId, role: mockRole };
    }
  }

  if ((authError || !user) && !dbUser) {
    return { success: false, message: 'Unauthorized' };
  }

  if (!dbUser && userId) {
      dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });
  }

  if (!dbUser) {
    if (useMocks) {
         const { cookies } = await import('next/headers');
         const cookieStore = await cookies();
         const mockRole = cookieStore.get('mock_role')?.value;
         if (mockRole) {
             dbUser = { id: 'mock-user-id', role: mockRole };
         }
    }
  }

  if (!dbUser) {
    return { success: false, message: 'User not found in database' };
  }

  const rawData = {
    email: formData.get('email'),
    password: formData.get('password') || undefined,
    tenant_id: formData.get('tenant_id'),
  };

  const validatedFields = createCustomerUserSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors as ActionState['errors'],
    };
  }

  try {
    let inviteLink: string | undefined;

    if (!useMocks) {
      const adminClient = createAdminClient();
      const result = await createCustomerUserCore(
        { id: dbUser.id, role: dbUser.role },
        prisma,
        adminClient,
        validatedFields.data
      );
      inviteLink = result.inviteLink;
    } else {
      inviteLink = 'http://localhost:3000/mock-invite';
    }

    revalidatePath('/admin/customers');
    return {
      success: true,
      message: inviteLink
        ? 'Customer user created. Invite link generated.'
        : 'Customer user created successfully',
      inviteLink,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create customer user';
    return { success: false, message };
  }
}

export async function getGlobalUsers() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });

  if (!dbUser) {
    throw new Error('User not found in database');
  }

  return await getGlobalUsersCore({ id: dbUser.id, role: dbUser.role as string }, prisma);
}

export async function getActiveTenants() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized');
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });

  if (!dbUser) {
    throw new Error('User not found in database');
  }

  return await getActiveTenantsCore({ id: dbUser.id, role: dbUser.role as string }, prisma);
}

export async function createCustomer(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

  let dbUser: { id: string; role: string } | null = null;
  let userId = user?.id;

  if (useMocks && !user) {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const mockRole = cookieStore.get('mock_role')?.value;
    if (mockRole) {
       userId = 'mock-user-id';
       dbUser = { id: userId, role: mockRole };
    }
  }

  if ((authError || !user) && !dbUser) {
    return { success: false, message: 'Unauthorized' };
  }

  if (!dbUser && userId) {
      dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });
  }

  if (!dbUser) {
    if (useMocks) {
         const { cookies } = await import('next/headers');
         const cookieStore = await cookies();
         const mockRole = cookieStore.get('mock_role')?.value;
         if (mockRole) {
             dbUser = { id: 'mock-user-id', role: mockRole };
         }
    }
  }

  if (!dbUser) {
    return { success: false, message: 'User not found in database' };
  }

  // Parse fields. Handle optional numeric fields by converting strings to numbers if present.
  const rawData = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    active_markets_limit: formData.get('active_markets_limit')
      ? Number(formData.get('active_markets_limit'))
      : undefined,
    user_seat_limit: formData.get('user_seat_limit')
      ? Number(formData.get('user_seat_limit'))
      : undefined,
    ai_token_quota: formData.get('ai_token_quota')
      ? Number(formData.get('ai_token_quota'))
      : undefined,
  };

  const validatedFields = createCustomerSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Validation failed',
      errors: validatedFields.error.flatten().fieldErrors as ActionState['errors'],
    };
  }

  try {
    if (!useMocks) {
      await createCustomerCore(
        { id: dbUser.id, role: dbUser.role },
        prisma,
        validatedFields.data
      );
    }

    revalidatePath('/admin/customers');
    revalidatePath('/'); // Revalidate root just in case
    return { success: true, message: 'Customer created successfully' };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create customer';
    return { success: false, message };
  }
}
