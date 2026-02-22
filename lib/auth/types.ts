export enum UserRole {
  GLOBAL_ADMIN = 'GLOBAL_ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  LOCAL_USER = 'LOCAL_USER',
  READ_ONLY = 'READ_ONLY'
}

export interface MockSessionUser {
  id: string;
  tenant_id: string;
  email: string;
  role: UserRole;
}
