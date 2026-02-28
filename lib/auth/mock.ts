import { MockSessionUser, UserRole } from './types';

export const MOCK_USERS: MockSessionUser[] = [
  {
    id: 'user-global-admin',
    tenant_id: 'tenant-1',
    email: 'admin@stradia.io',
    role: UserRole.GLOBAL_ADMIN,
    app_metadata: { role: UserRole.GLOBAL_ADMIN, tenant_id: 'tenant-1' }
  },
  {
    id: 'user-supervisor',
    tenant_id: 'tenant-1',
    email: 'supervisor@stradia.io',
    role: UserRole.SUPERVISOR,
  },
  {
    id: 'user-local',
    tenant_id: 'tenant-1',
    email: 'user@stradia.io',
    role: UserRole.LOCAL_USER,
    market_id: 'market-123',
  },
  {
    id: 'user-super-admin',
    tenant_id: 'tenant-1',
    email: 'superadmin@stradia.io',
    role: UserRole.SUPER_ADMIN,
    app_metadata: { role: UserRole.SUPER_ADMIN, tenant_id: 'tenant-1' }
  },
  {
    id: 'user-read-only',
    tenant_id: 'tenant-1',
    email: 'readonly@stradia.io',
    role: UserRole.READ_ONLY,
  },
];

export function getMockUserByEmail(email: string): MockSessionUser | undefined {
  return MOCK_USERS.find((u) => u.email === email);
}

export function getMockUserByRole(role: UserRole): MockSessionUser | undefined {
  return MOCK_USERS.find((u) => u.role === role);
}
