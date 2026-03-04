import { z } from 'zod';
import { PrismaClient, Market } from '@prisma/client';

export type ActionState = {
  success: boolean;
  message: string;
  errors?: {
    name?: string[];
    region_code?: string[];
    timezone?: string[];
    tenant_id?: string[];
    marketId?: string[];
  };
};

export const marketSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  region_code: z.string().min(1, 'Region code is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  tenant_id: z.string().uuid('Invalid Tenant ID').optional(),
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
  if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.GLOBAL_ADMIN) {
    throw new Error('Forbidden: Only Super Admins and Global Admins can create markets');
  }

  const { name, region_code, timezone } = input;

  const targetTenantId = user.role === UserRole.SUPER_ADMIN && input.tenant_id ? input.tenant_id : user.tenant_id;

  const tenant = await db.tenant.findUnique({
    where: { id: targetTenantId },
    select: { active_markets_limit: true },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const currentMarketCount = await db.market.count({
    where: {
      tenant_id: targetTenantId,
      is_active: true,
      deleted_at: null,
    },
  });

  if (currentMarketCount >= tenant.active_markets_limit) {
    throw new Error('Active Market limit reached for this tenant');
  }

  return await db.market.create({
    data: {
      tenant_id: targetTenantId,
      name,
      region_code,
      timezone,
      is_active: true,
    },
  });
}

export async function getMarketsCore(
  user: MarketCoreUser,
  db: PrismaClient
) {
  if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.GLOBAL_ADMIN) {
    throw new Error('Forbidden: Only Super Admins and Global Admins can fetch markets');
  }

  const whereClause = user.role === UserRole.SUPER_ADMIN ? {} : { tenant_id: user.tenant_id };

  return await db.market.findMany({
    where: whereClause,
    include: {
      tenant: {
        select: { id: true, name: true },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });
}

export async function deleteMarketCore(
  user: MarketCoreUser,
  db: PrismaClient,
  marketId: string
): Promise<Market> {
  if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.GLOBAL_ADMIN) {
    throw new Error('Forbidden: Only Super Admins and Global Admins can delete markets');
  }

  const market = await db.market.findUnique({
    where: { id: marketId },
  });

  if (!market) {
    throw new Error('Market not found');
  }

  if (user.role !== UserRole.SUPER_ADMIN && market.tenant_id !== user.tenant_id) {
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

export async function updateMarketCore(
  user: MarketCoreUser,
  db: PrismaClient,
  marketId: string,
  input: z.infer<typeof marketSchema>
): Promise<Market> {
  if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.GLOBAL_ADMIN) {
    throw new Error('Forbidden: Only Super Admins and Global Admins can update markets');
  }

  const market = await db.market.findUnique({
    where: { id: marketId },
  });

  if (!market) {
    throw new Error('Market not found');
  }

  if (user.role !== UserRole.SUPER_ADMIN && market.tenant_id !== user.tenant_id) {
    throw new Error('Market not found or access denied');
  }

  const targetTenantId = user.role === UserRole.SUPER_ADMIN && input.tenant_id ? input.tenant_id : market.tenant_id;

  // If changing tenant (only SUPER_ADMIN can do this realistically, but let's check limits anyway)
  if (targetTenantId !== market.tenant_id) {
    const tenant = await db.tenant.findUnique({
      where: { id: targetTenantId },
      select: { active_markets_limit: true },
    });

    if (!tenant) {
      throw new Error('Target tenant not found');
    }

    const currentMarketCount = await db.market.count({
      where: {
        tenant_id: targetTenantId,
        is_active: true,
        deleted_at: null,
      },
    });

    if (currentMarketCount >= tenant.active_markets_limit) {
      throw new Error('Active Market limit reached for the target tenant');
    }
  }

  return await db.market.update({
    where: { id: marketId },
    data: {
      tenant_id: targetTenantId,
      name: input.name,
      region_code: input.region_code,
      timezone: input.timezone,
    },
  });
}
