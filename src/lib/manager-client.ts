// Cliente para comunicação com o Sistema 1 (Caleidoscópio Manager)
// Seguindo protocolo REAL conforme análise do Sistema 1

// URL base do Sistema 1 (Manager)
const MANAGER_API_URL = process.env.NEXT_PUBLIC_MANAGER_API_URL || 'http://localhost:3000'

// Configurações padrão para requests com CORS e cookies
const DEFAULT_FETCH_OPTIONS: RequestInit = {
  credentials: 'include', // CRÍTICO: Manter cookies entre requisições (gerenciamento automático)
  mode: 'cors',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
}

interface LoginCredentials {
  email: string
  password: string
  tenantSlug?: string
}

// Resposta real do Sistema 1 - API Login
interface LoginResponse {
  success: boolean
  user: {
    id: string
    email: string
    name: string
    role: string
    tenant?: {
      id: string
      name: string
      slug: string
      status: string
    }
  }
  token: string
}

// Resposta real do Sistema 1 - API Validate Access
interface ValidateAccessResponse {
  hasAccess: boolean
  user?: {
    id: string
    email: string
    name: string
    role: string
  }
  tenant?: {
    id: string
    name: string
    slug: string
    cnpj?: string
    plan: {
      id: string
      name: string
      slug: string
    }
  }
  config?: {
    plan: any
    tenant: any
  }
  product?: {
    id: string
    name: string
    slug: string
    description: string
  }
  error?: string
}

// Resposta real do Sistema 1 - API SSO Token
interface SSOTokenResponse {
  token: string
  redirectUrl: string
  expiresIn: number
}

// Resposta real do Sistema 1 - API Validate Token
interface ValidateTokenResponse {
  valid: boolean
  user?: {
    userId: string
    email: string
    name: string
    role: string
    tenant?: {
      id: string
      name: string
      slug: string
    }
  }
  error?: string
}

class ManagerClient {
  private baseUrl: string
  private productSlug = 'educational' // Produto fixo: educacional

  constructor(baseUrl: string = MANAGER_API_URL) {
    this.baseUrl = baseUrl
  }

  // ETAPA 1: Autenticar no Sistema Manager (conforme protocolo real)
  async authenticateUser(credentials: LoginCredentials): Promise<LoginResponse | null> {
    try {
      console.log('🔐 [REAL] Iniciando login para:', credentials.email)
      console.log('🌐 [REAL] Conectando com:', `${this.baseUrl}/api/auth/login`)

      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        ...DEFAULT_FETCH_OPTIONS,
        method: 'POST',
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          tenantSlug: credentials.tenantSlug
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ [REAL] Erro na resposta:', response.status, errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const loginData: LoginResponse = await response.json()
      console.log('✅ [REAL] Login validado no Manager')
      console.log('👤 [REAL] Usuário:', loginData.user.name, '/', loginData.user.role)

      if (!loginData.success || !loginData.user) {
        throw new Error('Resposta de login inválida do Sistema Manager')
      }

      return loginData
    } catch (error) {
      console.error('❌ [REAL] Erro no login:', error)

      // Diagnóstico específico para problemas de CORS
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('🚫 [REAL] Problema de conexão com Sistema Manager')
        console.error('💡 [REAL] Verifique se o Sistema 1 está rodando em localhost:3000')
        throw new Error('Erro de conexão com Sistema Manager. Verifique se está rodando na porta 3000.')
      }

      throw error
    }
  }

  // ETAPA 2: Verificar acesso ao módulo educacional (conforme protocolo real)
  async validateAccess(userEmail: string): Promise<ValidateAccessResponse | null> {
    try {
      console.log('🔍 [REAL] Verificando acesso para:', userEmail)

      const response = await fetch(`${this.baseUrl}/api/auth/validate-access`, {
        ...DEFAULT_FETCH_OPTIONS,
        method: 'POST',
        body: JSON.stringify({
          productSlug: this.productSlug,
          userEmail: userEmail
        })
      })

      const accessData: ValidateAccessResponse = await response.json()

      if (!accessData.hasAccess) {
        console.error('❌ [REAL] Acesso negado:', accessData.error)
        throw new Error(accessData.error || 'Você não tem acesso ao módulo educacional')
      }

      console.log('✅ [REAL] Acesso ao módulo educacional confirmado')
      console.log('🏢 [REAL] Clínica:', accessData.tenant?.name)
      console.log('📦 [REAL] Plano:', accessData.tenant?.plan?.name)

      return accessData
    } catch (error) {
      console.error('❌ [REAL] Erro na validação de acesso:', error)
      throw error
    }
  }

  // ETAPA 3: Gerar token SSO (conforme protocolo real)
  async generateSSOToken(): Promise<SSOTokenResponse | null> {
    try {
      console.log('🎫 [REAL] Gerando token SSO')

      const response = await fetch(`${this.baseUrl}/api/products/sso/${this.productSlug}`, {
        ...DEFAULT_FETCH_OPTIONS,
        method: 'POST'
      })

      if (!response.ok) {
        const ssoError = await response.json().catch(() => ({}))
        console.error('❌ [REAL] Erro ao gerar token SSO:', response.status, ssoError)
        throw new Error(ssoError.error || 'Erro ao gerar token de acesso')
      }

      const ssoData: SSOTokenResponse = await response.json()
      console.log('✅ [REAL] Token SSO gerado')
      console.log('⏰ [REAL] Expira em:', ssoData.expiresIn, 'segundos')

      return ssoData
    } catch (error) {
      console.error('❌ [REAL] Erro ao gerar token SSO:', error)
      throw error
    }
  }

  // Validar token SSO existente (conforme protocolo real)
  async validateSSOToken(token: string): Promise<boolean> {
    try {
      console.log('🔍 [REAL] Validando token SSO:', token.substring(0, 20) + '...')

      const response = await fetch(`${this.baseUrl}/api/products/sso/${this.productSlug}?token=${token}`, {
        ...DEFAULT_FETCH_OPTIONS
      })

      console.log('📡 [REAL] Resposta da validação:', response.status)

      if (!response.ok) {
        console.error('❌ [REAL] Erro HTTP na validação:', response.status, response.statusText)
        return false
      }

      const data: ValidateTokenResponse = await response.json()
      const isValid = data.valid === true

      console.log(isValid ? '✅ [REAL] Token válido' : '❌ [REAL] Token inválido')
      if (!isValid) {
        console.log('❌ [REAL] Detalhes do erro:', data)
      }

      return isValid
    } catch (error) {
      console.error('❌ [REAL] Erro ao validar token:', error)
      return false
    }
  }

  // Processo completo SSO conforme protocolo REAL do Sistema 1
  async ssoLogin(credentials: LoginCredentials) {
    console.log('🚀 [REAL] Iniciando processo SSO completo com Sistema 1')

    try {
      // ETAPA 1: Autenticar no Sistema Manager
      const loginResult = await this.authenticateUser(credentials)
      if (!loginResult?.success || !loginResult?.user) {
        throw new Error('Falha na autenticação')
      }

      // ETAPA 2: Verificar acesso ao módulo educacional
      const accessResult = await this.validateAccess(credentials.email)
      if (!accessResult?.hasAccess) {
        throw new Error('Acesso negado ao módulo educacional')
      }

      // ETAPA 3: Gerar token SSO
      const ssoResult = await this.generateSSOToken()
      if (!ssoResult?.token) {
        throw new Error('Erro ao gerar token de acesso')
      }

      console.log('🎉 [REAL] Processo SSO completo!')

      // Retornar dados no formato esperado pelo Sistema 2
      return {
        user: {
          id: accessResult.user?.id || loginResult.user.id,
          email: accessResult.user?.email || loginResult.user.email,
          name: accessResult.user?.name || loginResult.user.name,
          role: accessResult.user?.role || loginResult.user.role,
        },
        tenant: accessResult.tenant ? {
          id: accessResult.tenant.id,
          name: accessResult.tenant.name,
          slug: accessResult.tenant.slug,
          cnpj: accessResult.tenant.cnpj,
          plan: accessResult.tenant.plan
        } : loginResult.user.tenant,
        config: accessResult.config || {
          tenant: {
            maxStudents: 100,
            enableCertificates: true,
            enableLiveClasses: true,
            contentAccess: 'full'
          }
        },
        token: ssoResult.token
      }
    } catch (error) {
      console.error('❌ [REAL] Erro no processo SSO:', error)
      throw error
    }
  }

  // Buscar usuários de um tenant no Sistema 1
  async getUsers(tenantId: string, authToken: string): Promise<any> {
    try {
      console.log('👥 [REAL] Buscando usuários do tenant:', tenantId)

      const response = await fetch(`${this.baseUrl}/api/users?tenantId=${tenantId}`, {
        ...DEFAULT_FETCH_OPTIONS,
        method: 'GET',
        headers: {
          ...DEFAULT_FETCH_OPTIONS.headers,
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ [REAL] Erro ao buscar usuários:', response.status, errorData)
        throw new Error(errorData.error || 'Erro ao buscar usuários')
      }

      const data = await response.json()
      console.log(`✅ [REAL] ${data.users?.length || 0} usuários encontrados`)

      return data
    } catch (error) {
      console.error('❌ [REAL] Erro ao buscar usuários:', error)
      throw error
    }
  }

  // Criar usuário no Sistema 1 usando autenticação SSO
  async createUser(userData: {
    email: string
    name: string
    password: string
    role: string
    tenantId: string
  }, ssoToken: string): Promise<any> {
    try {
      console.log('👤 [REAL] Criando usuário via SSO:', userData.email)

      // Usar nova API que aceita token SSO
      const response = await fetch(`${this.baseUrl}/api/users/create-with-sso?token=${ssoToken}`, {
        ...DEFAULT_FETCH_OPTIONS,
        method: 'POST',
        body: JSON.stringify(userData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ [REAL] Erro ao criar usuário:', response.status, errorData)
        throw new Error(errorData.error || 'Erro ao criar usuário')
      }

      const data = await response.json()
      console.log('✅ [REAL] Usuário criado com sucesso via SSO:', data.user?.email)

      return data
    } catch (error) {
      console.error('❌ [REAL] Erro ao criar usuário:', error)
      throw error
    }
  }

  // Limpar sessão (usar no logout) - apenas placeholder, cookies são gerenciados automaticamente
  clearSession() {
    console.log('🗑️ [REAL] Sessão será limpa automaticamente pelo logout do servidor')
  }
}

// Instância singleton do cliente real
export const managerClient = new ManagerClient()