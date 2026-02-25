import { prisma } from '@/lib/prisma';
import type { PrismaClient } from '@prisma/client';

/**
 * Checks if a tenant is active.
 *
 * @param tenantId The ID of the tenant to check.
 * @param db Optional Prisma client instance (useful for testing with a mock DB).
 * @returns Promise<boolean> True if the tenant exists and is active, false otherwise.
 */
export async function isTenantActive(
  tenantId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: PrismaClient | any = prisma
): Promise<boolean> {
  if (!tenantId) return false;

  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { is_active: true },
    });

    return tenant?.is_active ?? false;
  } catch {
    // Fail closed (deny access) on error
    return false;
  }
}
