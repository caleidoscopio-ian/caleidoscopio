// Mock do Sistema Manager para desenvolvimento do Sistema 2
// Simula as respostas do Sistema 1 (Caleidoscópio Manager)

interface LoginCredentials {
  email: string
  password: string
}

interface MockUser {
  id: string
  email: string
  name: string
  role: string
}

interface MockTenant {
  id: string
  name: string
  slug: string
  plan: {
    id: string
    name: string
  }
}

interface MockConfig {
  tenant: {
    maxStudents: number
    enableCertificates: boolean
    enableLiveClasses: boolean
    contentAccess: string
  }
}

// Dados mock para teste
const MOCK_USERS = [
  {
    email: 'admin@clinica-exemplo.com',
    password: 'clinica123!@#',
    user: {
      id: 'user_1',
      email: 'admin@clinica-exemplo.com',
      name: 'Dr. João Silva',
      role: 'ADMIN'
    },
    tenant: {
      id: 'tenant_1',
      name: 'Clínica Exemplo',
      slug: 'clinica-exemplo',
      plan: {
        id: 'plan_premium',
        name: 'Premium'
      }
    },
    config: {
      tenant: {
        maxStudents: 100,
        enableCertificates: true,
        enableLiveClasses: true,
        contentAccess: 'full'
      }
    }
  },
  {
    email: 'terapeuta1@clinica-exemplo.com',
    password: 'user123!@#',
    user: {
      id: 'user_2',
      email: 'terapeuta1@clinica-exemplo.com',
      name: 'Maria Santos',
      role: 'TERAPEUTA'
    },
    tenant: {
      id: 'tenant_1',
      name: 'Clínica Exemplo',
      slug: 'clinica-exemplo',
      plan: {
        id: 'plan_premium',
        name: 'Premium'
      }
    },
    config: {
      tenant: {
        maxStudents: 100,
        enableCertificates: true,
        enableLiveClasses: true,
        contentAccess: 'limited'
      }
    }
  }
]

class MockManagerClient {
  private baseUrl: string

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl
  }

  // ETAPA 1: Autenticar usuário (mock)
  async authenticateUser(credentials: LoginCredentials) {
    console.log('🔐 [MOCK] Iniciando login para:', credentials.email)

    // Simular delay da rede
    await new Promise(resolve => setTimeout(resolve, 500))

    const mockData = MOCK_USERS.find(
      u => u.email === credentials.email && u.password === credentials.password
    )

    if (!mockData) {
      throw new Error('Credenciais inválidas')
    }

    console.log('✅ [MOCK] Login validado')
    return { user: mockData.user }
  }

  // ETAPA 2: Verificar acesso (mock)
  async validateAccess(userEmail: string) {
    console.log('🔍 [MOCK] Verificando acesso para:', userEmail)

    await new Promise(resolve => setTimeout(resolve, 300))

    const mockData = MOCK_USERS.find(u => u.email === userEmail)

    if (!mockData) {
      throw new Error('Usuário não encontrado')
    }

    console.log('✅ [MOCK] Acesso confirmado')
    return {
      hasAccess: true,
      user: mockData.user,
      tenant: mockData.tenant,
      config: mockData.config
    }
  }

  // ETAPA 3: Gerar token SSO (mock)
  async generateSSOToken() {
    console.log('🎫 [MOCK] Gerando token SSO')

    await new Promise(resolve => setTimeout(resolve, 200))

    const token = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    console.log('✅ [MOCK] Token gerado')
    return {
      token,
      valid: true
    }
  }

  // Validar token (mock)
  async validateSSOToken(token: string): Promise<boolean> {
    console.log('🔍 [MOCK] Validando token:', token.substring(0, 20) + '...')

    await new Promise(resolve => setTimeout(resolve, 200))

    // Simular token válido se começar com "mock_token_"
    const isValid = token.startsWith('mock_token_')

    console.log(isValid ? '✅ [MOCK] Token válido' : '❌ [MOCK] Token inválido')
    return isValid
  }

  // Processo completo SSO (mock)
  async ssoLogin(credentials: LoginCredentials) {
    console.log('🚀 [MOCK] Iniciando processo SSO completo')

    try {
      // ETAPA 1: Autenticar
      const loginResult = await this.authenticateUser(credentials)
      if (!loginResult) {
        throw new Error('Falha na autenticação')
      }

      // ETAPA 2: Verificar acesso
      const accessResult = await this.validateAccess(credentials.email)
      if (!accessResult) {
        throw new Error('Acesso negado ao módulo educacional')
      }

      // ETAPA 3: Gerar token SSO
      const ssoResult = await this.generateSSOToken()
      if (!ssoResult) {
        throw new Error('Erro ao gerar token de acesso')
      }

      console.log('🎉 [MOCK] Processo SSO completo!')

      // Retornar dados completos
      return {
        user: accessResult.user,
        tenant: accessResult.tenant,
        config: accessResult.config,
        token: ssoResult.token
      }
    } catch (error) {
      console.error('❌ [MOCK] Erro no processo SSO:', error)
      throw error
    }
  }
}

// Instância singleton do cliente mock
export const mockManagerClient = new MockManagerClient()

// Helper para alternar entre mock e real
export const getManagerClient = () => {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_MANAGER === 'true'

  if (useMock) {
    console.log('🔧 Usando MockManagerClient para desenvolvimento')
    return mockManagerClient
  }

  // Importar o cliente real quando em produção
  console.log('🌐 Usando ManagerClient real')
  const { managerClient } = require('./manager-client')
  return managerClient
}