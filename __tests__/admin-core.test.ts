import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createCustomerCore, UserRole } from '@/app/actions/admin-core';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
const mockPrisma = {
  tenant: {
    create: vi.fn(),
  },
} as unknown as PrismaClient;

describe('Admin Core - createCustomerCore', () => {
  const superAdminUser = {
    id: 'super-admin-id',
    role: UserRole.SUPER_ADMIN,
  };

  const globalAdminUser = {
    id: 'global-admin-id',
    role: UserRole.GLOBAL_ADMIN,
  };

  const validInput = {
    name: 'Test Corp',
    active_markets_limit: 5,
    user_seat_limit: 10,
    ai_token_quota: 1000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow SUPER_ADMIN to create a tenant', async () => {
    // Setup mock return
    const mockTenant = {
      id: 'tenant-123',
      name: 'Test Corp',
      // ... other fields
    };
    (mockPrisma.tenant.create as Mock).mockResolvedValue(mockTenant);

    // Execute
    const result = await createCustomerCore(superAdminUser, mockPrisma, validInput);

    // Assert
    expect(mockPrisma.tenant.create).toHaveBeenCalledWith({
      data: {
        name: validInput.name,
        active_markets_limit: validInput.active_markets_limit,
        user_seat_limit: validInput.user_seat_limit,
        ai_token_quota: validInput.ai_token_quota,
        ai_tokens_used: 0,
        is_active: true,
      },
    });
    expect(result).toEqual(mockTenant);
  });

  it('should THROW error if user is NOT SUPER_ADMIN', async () => {
    // Execute & Assert
    await expect(createCustomerCore(globalAdminUser, mockPrisma, validInput))
      .rejects
      .toThrow('Forbidden: Only Super Admins can create customers');

    expect(mockPrisma.tenant.create).not.toHaveBeenCalled();
  });

  it('should THROW error if role is random string', async () => {
    const randomUser = {
      id: 'random-id',
      role: 'HACKER',
    };

    await expect(createCustomerCore(randomUser, mockPrisma, validInput))
      .rejects
      .toThrow('Forbidden: Only Super Admins can create customers');

    expect(mockPrisma.tenant.create).not.toHaveBeenCalled();
  });
});
