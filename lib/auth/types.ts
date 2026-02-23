import { User, UserRole } from '@prisma/client';

export { UserRole };

export type MockSessionUser = Pick<User, 'id' | 'tenant_id' | 'email' | 'role'>;
