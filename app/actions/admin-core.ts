import { z } from 'zod';
import { PrismaClient, Tenant } from '@prisma/client';

export type ActionState = {
  success: boolean;
  message: string;
  errors?: {
    name?: string[];
    active_markets_limit?: string[];
    user_seat_limit?: string[];
    ai_token_quota?: string[];
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
