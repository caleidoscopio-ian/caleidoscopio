import React, { createContext, useContext } from 'react'
import type { Decorator } from '@storybook/nextjs-vite'
import { mockAdminUser, mockTherapistUser, mockReadonlyUser } from '../fixtures'

// Replicar a interface AuthContextType do useAuth.tsx
interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  tenant: {
    id: string
    name: string
    slug: string
    cnpj?: string
    plan: { id: string; name: string }
  }
  config: {
    tenant: {
      maxStudents: number
      enableCertificates: boolean
      enableLiveClasses: boolean
      contentAccess: string
    }
  }
  token: string
  loginTime: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (userData: AuthUser) => void
  logout: () => void
  isAuthenticated: boolean
  isAdmin: boolean
  tenant: AuthUser['tenant'] | null
  config: AuthUser['config'] | null
}

// Usar o contexto real do projeto via módulo
// Criamos um mock do contexto compatível
export const MockAuthContext = createContext<AuthContextType | undefined>(undefined)

// Substituir o módulo useAuth para usar o mock context
// O @storybook/nextjs-vite mocka next/navigation automaticamente
// Aqui precisamos prover o AuthContext

function createAuthValue(user: AuthUser | null): AuthContextType {
  return {
    user,
    loading: false,
    login: () => {},
    logout: () => {},
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
    tenant: user?.tenant || null,
    config: user?.config || null,
  }
}

// Exportar os valores prontos para uso direto nas stories
export const authValues = {
  admin: createAuthValue(mockAdminUser as AuthUser),
  terapeuta: createAuthValue(mockTherapistUser as AuthUser),
  readonly: createAuthValue(mockReadonlyUser as AuthUser),
  unauthenticated: createAuthValue(null),
}

// Decorator que injeta o AuthContext mocado
// Para componentes que usam useAuth(), precisamos que o contexto
// seja fornecido via MockAuthContext com o mesmo formato
export const withAuth = (
  profile: 'admin' | 'terapeuta' | 'readonly' | 'unauthenticated' = 'terapeuta'
): Decorator => {
  const WithAuthDecorator = (Story: Parameters<Decorator>[0]) => (
    <MockAuthContext.Provider value={authValues[profile]}>
      <Story />
    </MockAuthContext.Provider>
  )
  WithAuthDecorator.displayName = `WithAuth(${profile})`
  return WithAuthDecorator
}

// Hook para usar o mock — deve ser importado nos arquivos que precisam
export const useMockAuth = () => {
  const context = useContext(MockAuthContext)
  return context ?? authValues.terapeuta
}

// Decorator global padrão — usa authProfile do parameters (default: terapeuta)
function AuthDecoratorFn(Story: Parameters<Decorator>[0], context: Parameters<Decorator>[1]) {
  const profile = (context.parameters?.authProfile as keyof typeof authValues) ?? 'terapeuta'
  return (
    <MockAuthContext.Provider value={authValues[profile]}>
      <Story />
    </MockAuthContext.Provider>
  )
}
AuthDecoratorFn.displayName = 'AuthDecorator'
export const AuthDecorator: Decorator = AuthDecoratorFn
