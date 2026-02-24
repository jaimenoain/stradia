import { PrismaClient, UserRole } from '@prisma/client';

export interface ProvisionUserDTO {
  email: string;
  role: 'GLOBAL_ADMIN' | 'SUPERVISOR' | 'LOCAL_USER' | 'READ_ONLY';
  market_ids: string[]; // Required if role is SUPERVISOR or LOCAL_USER
}

export async function provisionUserCore(
  prisma: PrismaClient,
  tenantId: string,
  dto: ProvisionUserDTO
) {
  // Validate Market Assignment
  if ((dto.role === 'LOCAL_USER' || dto.role === 'SUPERVISOR') && (!dto.market_ids || dto.market_ids.length === 0)) {
    throw new Error('User role requires at least one market assignment.');
  }

  // GLOBAL_ADMIN ignores market_ids. READ_ONLY might or might not need markets?
  // Assuming READ_ONLY behaves like LOCAL_USER/SUPERVISOR regarding access scope?
  // Prompt says: "If role is LOCAL_USER or SUPERVISOR, the market_ids array MUST NOT be empty."
  // It doesn't mention READ_ONLY. But assuming READ_ONLY is also scoped?
  // Schema defines READ_ONLY.
  // I will stick to the prompt: only enforce for LOCAL_USER and SUPERVISOR.
  // But for GLOBAL_ADMIN, force empty.

  const marketIds = dto.role === 'GLOBAL_ADMIN' ? [] : dto.market_ids || [];

  return await prisma.$transaction(async (tx) => {
    // 1. Create User
    const user = await tx.user.create({
      data: {
        tenant_id: tenantId,
        email: dto.email,
        password_hash: 'pending', // Simulate Supabase Auth placeholder
        role: dto.role as UserRole,
        language_preference: 'en', // Default
      },
    });

    // 2. Assign Markets (if any)
    if (marketIds.length > 0) {
      await tx.userMarket.createMany({
        data: marketIds.map((marketId) => ({
          user_id: user.id,
          market_id: marketId,
        })),
      });
    }

    return user;
  });
}

export async function updateUserRoleAndMarketsCore(
  prisma: PrismaClient,
  tenantId: string,
  userId: string,
  dto: ProvisionUserDTO
) {
  // Validate Market Assignment
  if ((dto.role === 'LOCAL_USER' || dto.role === 'SUPERVISOR') && (!dto.market_ids || dto.market_ids.length === 0)) {
    throw new Error('User role requires at least one market assignment.');
  }

  const marketIds = dto.role === 'GLOBAL_ADMIN' ? [] : dto.market_ids || [];

  return await prisma.$transaction(async (tx) => {
    // Check if user exists and is in tenant
    const existingUser = await tx.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser || existingUser.tenant_id !== tenantId) {
      throw new Error('User not found in this tenant.');
    }

    // Last Admin Rule
    // If we are changing role FROM GLOBAL_ADMIN to something else
    if (existingUser.role === 'GLOBAL_ADMIN' && dto.role !== 'GLOBAL_ADMIN') {
      const adminCount = await tx.user.count({
        where: {
          tenant_id: tenantId,
          role: 'GLOBAL_ADMIN',
        },
      });

      if (adminCount <= 1) {
        throw new Error('Cannot demote the last GLOBAL_ADMIN.');
      }
    }

    // Update User Role
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        role: dto.role as UserRole,
        // Update email if provided
        email: dto.email,
      },
    });

    // Update Markets: Delete all existing and insert new
    // Clear existing
    await tx.userMarket.deleteMany({
      where: { user_id: userId },
    });

    // Insert new
    if (marketIds.length > 0) {
        await tx.userMarket.createMany({
            data: marketIds.map((marketId) => ({
                user_id: user.id,
                market_id: marketId,
            })),
        });
    }

    return user;
  });
}
