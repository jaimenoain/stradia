import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { createCustomerCore, createCustomerUserCore, UserRole } from '@/app/actions/admin-core';
import { PrismaClient } from '@prisma/client';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock Prisma Client
const mockPrisma = {
  tenant: {
    create: vi.fn(),
  },
  user: {
    create: vi.fn(),
  },
} as unknown as PrismaClient;

// Mock Supabase Admin Client
const mockAuthAdmin = {
  auth: {
    admin: {
      createUser: vi.fn(),
      deleteUser: vi.fn(),
      generateLink: vi.fn(),
    },
  },
} as unknown as SupabaseClient;

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

describe('Admin Core - createCustomerUserCore', () => {
  const superAdminUser = {
    id: 'super-admin-id',
    role: UserRole.SUPER_ADMIN,
  };

  const globalAdminUser = {
    id: 'global-admin-id',
    role: UserRole.GLOBAL_ADMIN,
  };

  const validInput = {
    email: 'admin@testcorp.com',
    password: 'password123',
    tenant_id: 'tenant-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow SUPER_ADMIN to create a user', async () => {
    // Setup mocks
    (mockAuthAdmin.auth.admin.createUser as Mock).mockResolvedValue({
      data: { user: { id: 'auth-user-id' } },
      error: null,
    });

    const mockUser = {
      id: 'auth-user-id',
      email: validInput.email,
      role: 'GLOBAL_ADMIN',
      tenant_id: validInput.tenant_id,
    };
    (mockPrisma.user.create as Mock).mockResolvedValue(mockUser);

    // Execute
    const result = await createCustomerUserCore(superAdminUser, mockPrisma, mockAuthAdmin, validInput);

    // Assert
    expect(mockAuthAdmin.auth.admin.createUser).toHaveBeenCalledWith({
      email: validInput.email,
      password: validInput.password,
      email_confirm: true,
      user_metadata: {
        tenant_id: validInput.tenant_id,
        role: 'GLOBAL_ADMIN',
      },
    });

    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        id: 'auth-user-id',
        email: validInput.email,
        tenant_id: validInput.tenant_id,
        role: 'GLOBAL_ADMIN',
        password_hash: 'managed-by-supabase',
        language_preference: 'en',
      },
    });

    expect(result).toEqual({ user: mockUser, inviteLink: undefined });
  });

  it('should auto-generate password and return invite link if password is NOT provided', async () => {
    // Setup mocks
    (mockAuthAdmin.auth.admin.createUser as Mock).mockResolvedValue({
      data: { user: { id: 'auth-user-id' } },
      error: null,
    });

    (mockAuthAdmin.auth.admin.generateLink as Mock).mockResolvedValue({
      data: { properties: { action_link: 'http://invite.link' } },
      error: null,
    });

    const mockUser = {
      id: 'auth-user-id',
      email: validInput.email,
      role: 'GLOBAL_ADMIN',
      tenant_id: validInput.tenant_id,
    };
    (mockPrisma.user.create as Mock).mockResolvedValue(mockUser);

    const inputNoPassword = {
      email: validInput.email,
      tenant_id: validInput.tenant_id,
      // password missing
    };

    // Execute
    const result = await createCustomerUserCore(superAdminUser, mockPrisma, mockAuthAdmin, inputNoPassword);

    // Assert
    // Check createUser called with A password (any string)
    expect(mockAuthAdmin.auth.admin.createUser).toHaveBeenCalledWith(expect.objectContaining({
      email: validInput.email,
      password: expect.any(String), // Any string
      email_confirm: true,
    }));

    // Check generateLink called
    expect(mockAuthAdmin.auth.admin.generateLink).toHaveBeenCalledWith({
      type: 'recovery',
      email: validInput.email,
    });

    expect(result).toEqual({ user: mockUser, inviteLink: 'http://invite.link' });
  });

  it('should rollback Supabase user creation if Prisma creation fails', async () => {
    // Setup mocks
    (mockAuthAdmin.auth.admin.createUser as Mock).mockResolvedValue({
      data: { user: { id: 'auth-user-id' } },
      error: null,
    });

    (mockPrisma.user.create as Mock).mockRejectedValue(new Error('DB Error'));

    // Execute & Assert
    await expect(createCustomerUserCore(superAdminUser, mockPrisma, mockAuthAdmin, validInput))
      .rejects.toThrow('DB Error');

    expect(mockAuthAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('auth-user-id');
  });

  it('should throw error if Supabase creation fails', async () => {
    // Setup mocks
    (mockAuthAdmin.auth.admin.createUser as Mock).mockResolvedValue({
      data: { user: null },
      error: { message: 'Auth Error' },
    });

    // Execute & Assert
    await expect(createCustomerUserCore(superAdminUser, mockPrisma, mockAuthAdmin, validInput))
      .rejects.toThrow('Failed to create user in Supabase: Auth Error');

    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('should THROW error if user is NOT SUPER_ADMIN', async () => {
    // Execute & Assert
    await expect(createCustomerUserCore(globalAdminUser, mockPrisma, mockAuthAdmin, validInput))
      .rejects.toThrow('Forbidden: Only Super Admins can create customer users');

    expect(mockAuthAdmin.auth.admin.createUser).not.toHaveBeenCalled();
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });
});
