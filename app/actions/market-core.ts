import { z } from 'zod';
import { PrismaClient, Market } from '@prisma/client';

export type ActionState = {
  success: boolean;
  message: string;
  errors?: {
    name?: string[];
    region_code?: string[];
    timezone?: string[];
  };
};

export const marketSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  region_code: z.string().min(1, 'Region code is required'),
  timezone: z.string().min(1, 'Timezone is required'),
});

// Define local UserRole to verify logic independent of Prisma Enum availability in tests
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  GLOBAL_ADMIN = 'GLOBAL_ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  LOCAL_USER = 'LOCAL_USER',
  READ_ONLY = 'READ_ONLY',
}

export type MarketCoreUser = {
  id: string;
  tenant_id: string;
  role: string; // Accept string to be compatible with both Enum and String from DB
};

export async function createMarketCore(
  user: MarketCoreUser,
  db: PrismaClient,
  input: z.infer<typeof marketSchema>
): Promise<Market> {
  // Authorization check using local enum or string comparison
  if (user.role !== UserRole.GLOBAL_ADMIN) {
    throw new Error('Forbidden: Only Global Admins can create markets');
  }

  const { name, region_code, timezone } = input;

  const tenant = await db.tenant.findUnique({
    where: { id: user.tenant_id },
    select: { active_markets_limit: true },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const currentMarketCount = await db.market.count({
    where: {
      tenant_id: user.tenant_id,
      is_active: true,
      deleted_at: null,
    },
  });

  if (currentMarketCount >= tenant.active_markets_limit) {
    throw new Error('Active Market limit reached');
  }

  return await db.market.create({
    data: {
      tenant_id: user.tenant_id,
      name,
      region_code,
      timezone,
      is_active: true,
    },
  });
}

export async function deleteMarketCore(
  user: MarketCoreUser,
  db: PrismaClient,
  marketId: string
): Promise<Market> {
  if (user.role !== UserRole.GLOBAL_ADMIN) {
    throw new Error('Forbidden: Only Global Admins can delete markets');
  }

  const market = await db.market.findUnique({
    where: { id: marketId },
  });

  if (!market || market.tenant_id !== user.tenant_id) {
    throw new Error('Market not found or access denied');
  }

  return await db.market.update({
    where: { id: marketId },
    data: {
      is_active: false,
      deleted_at: new Date(),
    },
  });
}
