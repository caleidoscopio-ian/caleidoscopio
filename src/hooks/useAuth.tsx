'use client'

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { managerClient } from '@/lib/manager-client'
import { installFetchInterceptor } from '@/lib/fetch-interceptor'
import {
  registrarExpiracao,
  limparExpiracao,
  restanteMs,
  proximoIntervaloMs,
  precisaRenovarAoFocar,
} from '@/lib/sessao-token'

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
  /** Nome do perfil RBAC (página de permissões). null enquanto carrega. */
  rbacRole: string | null
  /** Perfil que vale de fato: RBAC quando conhecido, senão o do SSO */
  roleEfetivo: string
  /** false enquanto o perfil RBAC ainda não voltou do servidor */
  rbacCarregado: boolean
  tenant: AuthUser['tenant'] | null
  config: AuthUser['config'] | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  // O perfil RBAC é a fonte de verdade de autorização, mas vive só no Sistema 2
  // — o objeto de sessão vindo do login do Manager carrega apenas o role do SSO.
  // Sem buscá-lo aqui, a interface decide por um valor que o servidor ignora.
  const [rbacRole, setRbacRole] = useState<string | null>(null)
  const [rbacCarregado, setRbacCarregado] = useState(false)
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
    limparExpiracao()
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
      // O Sistema 1 devolve expiresIn (2h hoje). Guardar a expiração real deixa
      // o agendamento acompanhar automaticamente se essa validade mudar lá.
      registrarExpiracao(result.expiresIn)
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

  // Renovação do token SSO enquanto a sessão está aberta. Mantém o acesso vivo
  // por até 7 dias (validade do token de sessão do Sistema 1) sem nunca expirar
  // no meio do uso. Ver a política em src/lib/sessao-token.ts.
  useEffect(() => {
    if (!user) return

    let timer: ReturnType<typeof setTimeout> | null = null
    let cancelado = false

    const limpar = () => {
      if (timer) clearTimeout(timer)
      timer = null
    }

    const renovarAgora = async (): Promise<boolean> => {
      const renovado = await refreshToken()
      if (!renovado) {
        logout('expired')
        return false
      }
      return true
    }

    const agendar = () => {
      limpar()
      if (cancelado) return
      timer = setTimeout(async () => {
        if (cancelado) return
        if (await renovarAgora()) agendar()
      }, proximoIntervaloMs(restanteMs()))
    }

    // Nenhum timer cobre o notebook que dormiu: o navegador estrangula (e chega
    // a congelar) timers de aba em segundo plano. Ao reativar a aba, se o token
    // está perto do fim, renova na hora — antes que o primeiro clique leve 401.
    const aoMudarVisibilidade = async () => {
      if (cancelado || document.visibilityState !== 'visible') return
      if (!precisaRenovarAoFocar(restanteMs())) return
      if (await renovarAgora()) agendar()
    }

    agendar()
    document.addEventListener('visibilitychange', aoMudarVisibilidade)

    return () => {
      cancelado = true
      limpar()
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Busca o perfil RBAC sempre que a sessão muda
  useEffect(() => {
    if (!user) {
      setRbacRole(null)
      setRbacCarregado(false)
      return
    }

    let cancelado = false
    ;(async () => {
      try {
        const res = await fetch('/api/me/filial', {
          headers: {
            'X-User-Data': btoa(JSON.stringify(user)),
            'X-Auth-Token': user.token,
          },
        })
        const dados = await res.json()
        if (cancelado) return
        setRbacRole(dados?.rbacRole ?? null)
      } catch {
        // Falha de rede não deve conceder acesso: mantém o perfil desconhecido
        if (!cancelado) setRbacRole(null)
      } finally {
        if (!cancelado) setRbacCarregado(true)
      }
    })()

    return () => {
      cancelado = true
    }
  }, [user])

  // Enquanto o RBAC não chega, não assume privilégio: a interface mostra menos,
  // nunca mais. O servidor valida de novo em toda requisição.
  const roleEfetivo = (rbacRole ?? (rbacCarregado ? user?.role : null) ?? '').toUpperCase()

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: roleEfetivo === 'ADMIN' || roleEfetivo === 'SUPER_ADMIN',
    rbacRole,
    roleEfetivo,
    rbacCarregado,
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