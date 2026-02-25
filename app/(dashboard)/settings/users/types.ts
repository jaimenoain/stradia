// Define UserRole manually to avoid importing @prisma/client in Client Components
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  GLOBAL_ADMIN = 'GLOBAL_ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  LOCAL_USER = 'LOCAL_USER',
  READ_ONLY = 'READ_ONLY',
}

export interface Market {
  id: string
  name: string
}

export interface User {
  id: string
  email: string
  role: UserRole
  markets: {
    market: Market
  }[]
}
