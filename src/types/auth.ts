// Tipos compatíveis com o Sistema 1 (Manager)

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER'
export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'

export interface AuthUser {
  id: string
  email: string
  name: string // Sistema 1 usa 'name' ao invés de 'nome'
  role: UserRole
  tenantId: string | null
  tenant: {
    id: string
    name: string
    slug: string
    status: TenantStatus
  } | null
}

export interface AuthSession {
  user: AuthUser
  expires: string
  token: string
}

export interface LoginCredentials {
  email: string
  password: string // Sistema 1 usa 'password' ao invés de 'senha'
  tenantSlug?: string
}

export interface ProductToken {
  id: string
  token: string
  userId: string
  productId: string
  expiresAt: string
  isRevoked: boolean
}

// Context do usuário para o Sistema 2
export interface CaleidoscopioUser {
  // Dados do Sistema 1
  id: string
  email: string
  name: string
  role: UserRole

  // Dados do tenant
  tenantId: string
  tenant: {
    id: string
    name: string
    slug: string
    status: TenantStatus
  }

  // Token de acesso ao Caleidoscópio
  productToken: string
}