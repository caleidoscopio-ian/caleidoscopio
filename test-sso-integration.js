// Script de teste para verificar integração SSO completa
// Este script simula o fluxo de login do Sistema 2 com o Sistema 1

console.log('🧪 Testando integração SSO completa...\n')

// Configurações
const SISTEMA_1_URL = 'http://localhost:3000'
const SISTEMA_2_URL = 'http://localhost:3001'

// Credenciais de teste do seed.ts
const testCredentials = [
  {
    email: 'admin@clinica-exemplo.com',
    password: 'clinica123!@#',
    description: 'Admin do Tenant'
  },
  {
    email: 'terapeuta1@clinica-exemplo.com',
    password: 'user123!@#',
    description: 'Usuário Regular 1'
  },
  {
    email: 'admin@caleidoscopio.com',
    password: 'admin123!@#',
    description: 'Super Admin'
  }
]

async function testLogin(credentials) {
  console.log(`\n🔐 Testando login: ${credentials.description}`)
  console.log(`📧 Email: ${credentials.email}`)

  // Cookie jar manual para manter sessão entre requisições
  let sessionCookie = null

  try {
    // ETAPA 1: Teste de autenticação direta no Sistema 1
    console.log('\n📌 ETAPA 1: Autenticação no Sistema 1')

    const loginResponse = await fetch(`${SISTEMA_1_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password
      })
    })

    // Capturar cookie de sessão
    const setCookieHeader = loginResponse.headers.get('set-cookie')
    if (setCookieHeader && setCookieHeader.includes('session=')) {
      const sessionMatch = setCookieHeader.match(/session=([^;]+)/)
      if (sessionMatch) {
        sessionCookie = sessionMatch[1]
        console.log('🍪 Cookie de sessão capturado')
      }
    }

    const loginData = await loginResponse.json()

    if (!loginResponse.ok) {
      console.log(`❌ Erro na autenticação: ${loginData.error || loginResponse.status}`)
      return false
    }

    console.log(`✅ Login bem-sucedido!`)
    console.log(`👤 Usuário: ${loginData.user.name}`)
    console.log(`🏢 Tenant: ${loginData.user.tenant?.name || 'N/A'}`)
    console.log(`🎫 Token: ${loginData.token.substring(0, 20)}...`)

    // ETAPA 2: Teste de validação de acesso ao módulo educacional
    console.log('\n📌 ETAPA 2: Validação de acesso ao módulo educacional')

    const accessResponse = await fetch(`${SISTEMA_1_URL}/api/auth/validate-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(sessionCookie ? { 'Cookie': `session=${sessionCookie}` } : {})
      },
      body: JSON.stringify({
        productSlug: 'educational',
        userEmail: credentials.email
      })
    })

    const accessData = await accessResponse.json()

    if (!accessData.hasAccess) {
      console.log(`❌ Acesso negado: ${accessData.error}`)
      return false
    }

    console.log(`✅ Acesso autorizado!`)
    console.log(`🏢 Clínica: ${accessData.tenant?.name}`)
    console.log(`📦 Plano: ${accessData.tenant?.plan?.name}`)

    // ETAPA 3: Teste de geração de token SSO
    console.log('\n📌 ETAPA 3: Geração de token SSO')

    const ssoResponse = await fetch(`${SISTEMA_1_URL}/api/products/sso/educational`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(sessionCookie ? { 'Cookie': `session=${sessionCookie}` } : {})
      }
    })

    const ssoData = await ssoResponse.json()

    if (!ssoResponse.ok) {
      console.log(`❌ Erro na geração do token SSO: ${ssoData.error}`)
      return false
    }

    console.log(`✅ Token SSO gerado!`)
    console.log(`🎫 Token: ${ssoData.token.substring(0, 20)}...`)
    console.log(`⏰ Expira em: ${ssoData.expiresIn} segundos`)

    console.log(`\n🎉 Teste completo SUCESSO para ${credentials.description}!`)
    return true

  } catch (error) {
    console.error(`❌ Erro no teste: ${error.message}`)
    return false
  }
}

async function runAllTests() {
  console.log('🚀 Iniciando testes de integração SSO...')

  let successCount = 0
  let totalTests = testCredentials.length

  for (const credentials of testCredentials) {
    const success = await testLogin(credentials)
    if (success) {
      successCount++
    }

    // Delay entre testes
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMO DOS TESTES')
  console.log('='.repeat(60))
  console.log(`✅ Sucessos: ${successCount}/${totalTests}`)
  console.log(`❌ Falhas: ${totalTests - successCount}/${totalTests}`)

  if (successCount === totalTests) {
    console.log('🎉 TODOS OS TESTES PASSARAM! Integração SSO funcionando!')
  } else {
    console.log('⚠️  Alguns testes falharam. Verifique as configurações.')
  }
}

// Executar testes
runAllTests().catch(console.error)