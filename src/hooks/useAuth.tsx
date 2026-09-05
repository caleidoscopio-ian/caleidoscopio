'use client'

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { managerClient } from '@/lib/manager-client'
import { installFetchInterceptor } from '@/lib/fetch-interceptor'

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
    plan: {
      id: string
      name: string
    }
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

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const validateToken = async (token: string): Promise<boolean> => {
    try {
      return await managerClient.validateSSOToken(token)
    } catch {
      return false
    }
  }

  const login = (userData: AuthUser) => {
    setUser(userData)
  }

  // reason 'expired' = disparado automaticamente (token/sessão morreu) — mostra aviso
  // no login. Sem reason = logout manual (botão "Sair"), sem aviso nenhum.
  const logout = (reason?: 'expired') => {
    localStorage.removeItem('edu_auth_user')
    localStorage.removeItem('edu_auth_token')
    localStorage.removeItem('edu_session_token')
    setUser(null)

    if (reason === 'expired' && typeof window !== 'undefined') {
      sessionStorage.setItem('caleidoscopio_session_expired', '1')
    }

    // Limpar sessão do Sistema 1
    try {
      managerClient.clearSession()
    } catch {
      // ignora — sessão local já foi limpa acima
    }

    // Redirecionar para login local
    if (typeof window !== 'undefined') {
      router.push('/login')
    }
  }

  // Renova o token SSO (curta duração) usando o token de sessão do Sistema 1
  // (7 dias), sem exigir novo login. Retorna false se a sessão também já
  // expirou (aí sim precisa logar de novo). `baseUser` é usado como fallback
  // quando ainda não há usuário no estado do React (ex.: checkAuth inicial).
  const refreshToken = useCallback(async (baseUser?: AuthUser): Promise<boolean> => {
    const sessionToken = localStorage.getItem('edu_session_token')
    if (!sessionToken) return false

    try {
      const result = await managerClient.generateSSOToken(sessionToken)
      if (!result?.token) return false

      localStorage.setItem('edu_auth_token', result.token)
      setUser((prev) => {
        const base = prev ?? baseUser
        if (!base) return prev
        const updated = { ...base, token: result.token }
        localStorage.setItem('edu_auth_user', JSON.stringify(updated))
        return updated
      })
      return true
    } catch {
      return false
    }
  }, [])

  const checkAuth = useCallback(async () => {
    try {
      const storedUser = localStorage.getItem('edu_auth_user')
      const storedToken = localStorage.getItem('edu_auth_token')

      if (storedUser && storedToken) {
        const userData = JSON.parse(storedUser)
        const isValid = await validateToken(storedToken)

        if (isValid) {
          setUser(userData)
        } else {
          const renovado = await refreshToken(userData)
          if (!renovado) {
            logout('expired')
          }
        }
      }
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken])

  useEffect(() => {
    checkAuth()
    // Centraliza a reação a qualquer 401 vindo de qualquer fetch (apiCall ou
    // fetch cru direto num componente) — evita alerts genéricos e a corrida
    // entre /login e /sem-permissao quando a sessão expira.
    installFetchInterceptor(() => logout('expired'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Renovar o token periodicamente (a cada 5 minutos) enquanto a aba estiver
  // aberta e o usuário ativo — mantém a sessão viva por até 7 dias (duração
  // do token de sessão do Sistema 1) sem nunca expirar no meio do uso.
  useEffect(() => {
    if (user) {
      const interval = setInterval(async () => {
        const renovado = await refreshToken()
        if (!renovado) {
          logout('expired')
        }
      }, 5 * 60 * 1000) // 5 minutos

      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
    tenant: user?.tenant || null,
    config: user?.config || null
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}