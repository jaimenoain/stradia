import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { deleteUserCore } from '@/app/actions/users-core';
import { createMarketCore, UserRole } from '@/app/actions/market-core';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    count: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  tenant: {
    findUnique: vi.fn(),
  },
  market: {
    count: vi.fn(),
    create: vi.fn(),
  },
  userMarket: {
    createMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn((callback) => callback(mockPrisma)),
} as unknown as PrismaClient;

// Mock the module export
vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

describe('Provisioning Rules Verification', () => {
  const tenantId = 'tenant-123';
  const userId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Last Admin Rule (deleteUserCore)', () => {
    it('should allow deleting a Global Admin if another Global Admin exists', async () => {
      // Setup: User is Global Admin
      (mockPrisma.user.findUnique as Mock).mockResolvedValue({
        id: userId,
        tenant_id: tenantId,
        role: UserRole.GLOBAL_ADMIN,
      });

      // Setup: 2 Global Admins exist
      (mockPrisma.user.count as Mock).mockResolvedValue(2);

      // Execute
      await deleteUserCore(mockPrisma, tenantId, userId);

      // Assert
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should THROW error when deleting the LAST Global Admin', async () => {
      // Setup: User is Global Admin
      (mockPrisma.user.findUnique as Mock).mockResolvedValue({
        id: userId,
        tenant_id: tenantId,
        role: UserRole.GLOBAL_ADMIN,
      });

      // Setup: Only 1 Global Admin exists (the user themselves)
      (mockPrisma.user.count as Mock).mockResolvedValue(1);

      // Execute & Assert
      await expect(deleteUserCore(mockPrisma, tenantId, userId))
        .rejects
        .toThrow('Cannot delete the last GLOBAL_ADMIN');

      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      (mockPrisma.user.findUnique as Mock).mockResolvedValue(null);

      await expect(deleteUserCore(mockPrisma, tenantId, userId))
        .rejects
        .toThrow('User not found');
    });

    it('should throw error if user belongs to another tenant', async () => {
      (mockPrisma.user.findUnique as Mock).mockResolvedValue({
        id: userId,
        tenant_id: 'other-tenant',
        role: UserRole.LOCAL_USER,
      });

      await expect(deleteUserCore(mockPrisma, tenantId, userId))
        .rejects
        .toThrow('User not found in this tenant');
    });
  });

  describe('Tenant Market Limit (createMarketCore)', () => {
    const marketInput = {
      name: 'New Market',
      region_code: 'US',
      timezone: 'UTC',
    };

    const adminUser = {
      id: userId,
      tenant_id: tenantId,
      role: 'GLOBAL_ADMIN',
    };

    const nonAdminUser = {
      id: userId,
      tenant_id: tenantId,
      role: 'LOCAL_USER',
    };

    it('should allow creating a market if limit is NOT reached', async () => {
      // Setup: Limit is 5
      (mockPrisma.tenant.findUnique as Mock).mockResolvedValue({
        active_markets_limit: 5,
      });

      // Setup: Current count is 3
      (mockPrisma.market.count as Mock).mockResolvedValue(3);

      // Execute
      await createMarketCore(adminUser, mockPrisma, marketInput);

      // Assert
      expect(mockPrisma.market.create).toHaveBeenCalled();
    });

    it('should THROW error when Active Market limit is reached', async () => {
      // Setup: Limit is 5
      (mockPrisma.tenant.findUnique as Mock).mockResolvedValue({
        active_markets_limit: 5,
      });

      // Setup: Current count is 5
      (mockPrisma.market.count as Mock).mockResolvedValue(5);

      // Execute & Assert
      await expect(createMarketCore(adminUser, mockPrisma, marketInput))
        .rejects
        .toThrow('Active Market limit reached');

      expect(mockPrisma.market.create).not.toHaveBeenCalled();
    });

    it('should THROW error if user is not GLOBAL_ADMIN', async () => {
      await expect(createMarketCore(nonAdminUser, mockPrisma, marketInput))
        .rejects
        .toThrow('Forbidden: Only Global Admins can create markets');

      expect(mockPrisma.market.create).not.toHaveBeenCalled();
    });
  });
});
