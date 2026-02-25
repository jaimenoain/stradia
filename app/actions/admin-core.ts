import { z } from 'zod';
import crypto from 'crypto';
import { PrismaClient, Tenant, User, UserRole as PrismaUserRole } from '@prisma/client';
import { SupabaseClient } from '@supabase/supabase-js';

export type ActionState = {
  success: boolean;
  message: string;
  inviteLink?: string;
  errors?: {
    name?: string[];
    active_markets_limit?: string[];
    user_seat_limit?: string[];
    ai_token_quota?: string[];
    email?: string[];
    password?: string[];
    tenant_id?: string[];
  };
};

// Define local UserRole to verify logic independent of Prisma Enum availability in tests
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  GLOBAL_ADMIN = 'GLOBAL_ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  LOCAL_USER = 'LOCAL_USER',
  READ_ONLY = 'READ_ONLY',
}

export type AdminCoreUser = {
  id: string;
  role: string; // Accept string to be compatible with both Enum and String from DB
};

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Company Name is required'),
  // Optional limits with defaults
  active_markets_limit: z.number().int().min(1).optional().default(5),
  user_seat_limit: z.number().int().min(1).optional().default(10),
  ai_token_quota: z.number().int().min(0).optional().default(1000),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export async function createCustomerCore(
  user: AdminCoreUser,
  db: PrismaClient,
  input: CreateCustomerInput
): Promise<Tenant> {
  // 1. Security First: Verify SUPER_ADMIN role
  if (user.role !== UserRole.SUPER_ADMIN) {
    throw new Error('Forbidden: Only Super Admins can create customers');
  }

  // 2. Database Transaction: Create Tenant
  // Note: 'Domain/Slug' requested by user is not in schema, mapping to 'name' or omitting.
  // We use the defaults provided by Zod schema or explicitly set them here if Zod defaults aren't applied before calling core.
  // Zod defaults are applied during parsing, so input should have them if parsed.
  // However, if called manually in tests with raw object, we might miss defaults if not careful.
  // But strictly speaking, core functions expect valid input.

  // To be safe, we can fall back to defaults here if undefined, but Zod should handle it if used.
  // We will assume input is valid as per schema (or passed manually with necessary fields).

  return await db.tenant.create({
    data: {
      name: input.name,
      active_markets_limit: input.active_markets_limit ?? 5,
      user_seat_limit: input.user_seat_limit ?? 10,
      ai_token_quota: input.ai_token_quota ?? 1000,
      ai_tokens_used: 0,
      is_active: true,
      // stripe_customer_id is optional and not in input yet
    },
  });
}

export const createCustomerUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  tenant_id: z.string().uuid('Invalid Tenant ID'),
});

export type CreateCustomerUserInput = z.infer<typeof createCustomerUserSchema>;

export async function createCustomerUserCore(
  user: AdminCoreUser,
  db: PrismaClient,
  authAdmin: SupabaseClient,
  input: CreateCustomerUserInput
): Promise<{ user: User; inviteLink?: string }> {
  // 1. Security First: Verify SUPER_ADMIN role
  if (user.role !== UserRole.SUPER_ADMIN) {
    throw new Error('Forbidden: Only Super Admins can create customer users');
  }

  const providedPassword = input.password?.trim() ? input.password : undefined;
  const password = providedPassword || crypto.randomBytes(16).toString('hex');

  // 2. Create User in Supabase Auth
  const { data: authData, error: authError } = await authAdmin.auth.admin.createUser({
    email: input.email,
    password,
    email_confirm: true,
    user_metadata: {
      tenant_id: input.tenant_id,
      role: 'GLOBAL_ADMIN',
    },
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create user in Supabase: ${authError?.message}`);
  }

  const authUserId = authData.user.id;
  let inviteLink: string | undefined;

  // 3. Generate Invite/Recovery Link if password was auto-generated
  if (!providedPassword) {
    const { data: linkData, error: linkError } = await authAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: input.email,
    });

    if (linkError) {
      // Rollback: Delete user from Supabase Auth
      await authAdmin.auth.admin.deleteUser(authUserId);
      throw new Error(`Failed to generate invite link: ${linkError.message}`);
    }

    inviteLink = linkData.properties?.action_link;
  }

  try {
    // 4. Create User in Prisma
    const newUser = await db.user.create({
      data: {
        id: authUserId,
        email: input.email,
        tenant_id: input.tenant_id,
        role: PrismaUserRole.GLOBAL_ADMIN,
        password_hash: 'managed-by-supabase', // Placeholder
        language_preference: 'en',
      },
    });

    return { user: newUser, inviteLink };
  } catch (error) {
    // 5. Rollback: Delete user from Supabase Auth if DB creation fails
    // We attempt to delete, but if that fails, we can't do much more than log/throw.
    await authAdmin.auth.admin.deleteUser(authUserId);
    throw error;
  }
}
