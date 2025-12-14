'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { managerClient } from '@/lib/manager-client'

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

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuth = async () => {
    try {
      console.log('🔍 useAuth - Iniciando verificação...')
      const storedUser = localStorage.getItem('edu_auth_user')
      const storedToken = localStorage.getItem('edu_auth_token')

      console.log('📱 useAuth - Dados localStorage:', {
        temUser: !!storedUser,
        temToken: !!storedToken,
        userEmail: storedUser ? JSON.parse(storedUser).email : null
      })

      if (storedUser && storedToken) {
        const userData = JSON.parse(storedUser)
        console.log('🔍 useAuth - Validando token...')
        const isValid = await validateToken(storedToken)

        if (isValid) {
          console.log('✅ useAuth - Token válido, setando usuário:', userData.email)
          setUser(userData)
        } else {
          console.log('❌ useAuth - Token inválido, fazendo logout')
          logout()
        }
      } else {
        console.log('❌ useAuth - Não há dados de autenticação no localStorage')
      }
    } catch (error) {
      console.error('❌ useAuth - Erro na verificação:', error)
      logout()
    } finally {
      setLoading(false)
      console.log('🏁 useAuth - Verificação finalizada')
    }
  }

  const validateToken = async (token: string): Promise<boolean> => {
    try {
      return await managerClient.validateSSOToken(token)
    } catch (error) {
      console.error('Erro ao validar token:', error)
      return false
    }
  }

  const login = (userData: AuthUser) => {
    console.log('✅ useAuth - Login: Setando usuário no contexto:', userData.email)
    setUser(userData)
  }

  const logout = () => {
    // Limpar dados locais
    localStorage.removeItem('edu_auth_user')
    localStorage.removeItem('edu_auth_token')
    setUser(null)

    // Limpar sessão do Sistema 1
    try {
      managerClient.clearSession()
    } catch (error) {
      console.warn('Aviso: Erro ao limpar sessão do Sistema 1:', error)
    }

    // Redirecionar para login local
    if (typeof window !== 'undefined') {
      router.push('/login')
    }
  }

  // Verificar token periodicamente (a cada 5 minutos)
  useEffect(() => {
    if (user) {
      const interval = setInterval(async () => {
        const token = localStorage.getItem('edu_auth_token')
        if (token) {
          const isValid = await validateToken(token)
          if (!isValid) {
            logout()
          }
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