import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

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
): Promise<ActionState> {
  // Authorization check using local enum or string comparison
  if (user.role !== UserRole.GLOBAL_ADMIN) {
    return { success: false, message: 'Forbidden: Only Global Admins can create markets' };
  }

  const { name, region_code, timezone } = input;

  try {
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenant_id },
      select: { active_markets_limit: true },
    });

    if (!tenant) {
      return { success: false, message: 'Tenant not found' };
    }

    const currentMarketCount = await db.market.count({
      where: {
        tenant_id: user.tenant_id,
        is_active: true,
        deleted_at: null,
      },
    });

    if (currentMarketCount >= tenant.active_markets_limit) {
      return { success: false, message: 'Active Market limit reached' };
    }

    await db.market.create({
      data: {
        tenant_id: user.tenant_id,
        name,
        region_code,
        timezone,
        is_active: true,
      },
    });

    return { success: true, message: 'Market created successfully' };
  } catch (error) {
    console.error('Failed to create market:', error);
    return { success: false, message: 'Failed to create market' };
  }
}

export async function deleteMarketCore(
  user: MarketCoreUser,
  db: PrismaClient,
  marketId: string
): Promise<ActionState> {
  if (user.role !== UserRole.GLOBAL_ADMIN) {
    return { success: false, message: 'Forbidden: Only Global Admins can delete markets' };
  }

  try {
    const market = await db.market.findUnique({
      where: { id: marketId },
    });

    if (!market || market.tenant_id !== user.tenant_id) {
      return { success: false, message: 'Market not found or access denied' };
    }

    await db.market.update({
      where: { id: marketId },
      data: {
        is_active: false,
        deleted_at: new Date(),
      },
    });

    return { success: true, message: 'Market deleted successfully' };
  } catch (error) {
    console.error('Failed to delete market:', error);
    return { success: false, message: 'Failed to delete market' };
  }
}
