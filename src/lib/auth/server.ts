// Utilitários de autenticação para o servidor
// Extrai dados do usuário logado das APIs do Sistema 2

import { NextRequest } from 'next/server'
import { managerClient } from '@/lib/manager-client'
import { checkPermission } from '@/lib/auth/permission-service'
import { mapLegacyAction } from '@/lib/auth/action-map'

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
  config: Record<string, unknown>
  token: string
  loginTime: string
}

/**
 * Extrai dados do usuário autenticado dos headers customizados
 * O frontend vai enviar os dados do usuário nos headers para as APIs
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    console.log('🔍 Auth Server - Verificando headers de autenticação...')

    // Tentar extrair dados do usuário dos headers customizados
    const userDataHeader = request.headers.get('X-User-Data')
    const tokenHeader = request.headers.get('X-Auth-Token')

    console.log('📡 Headers recebidos:', {
      hasUserData: !!userDataHeader,
      hasToken: !!tokenHeader,
      userDataLength: userDataHeader?.length || 0
    })

    if (!userDataHeader || !tokenHeader) {
      console.log('❌ Auth Server - Headers de autenticação não encontrados')
      return null
    }

    let userData: AuthUser
    try {
      // Decodificar dados do usuário (vem em base64 para evitar problemas com caracteres especiais)
      const userDataDecoded = Buffer.from(userDataHeader, 'base64').toString('utf-8')
      userData = JSON.parse(userDataDecoded)
      console.log('📋 Dados do usuário decodificados:', {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        tenant: userData.tenant?.name || 'N/A'
      })
    } catch (parseError) {
      console.error('❌ Auth Server - Erro ao decodificar dados do usuário:', parseError)
      return null
    }

    // SEMPRE validar token com Sistema 1 (localhost:3000)
    console.log('🔍 Auth Server - Validando token SSO com Sistema 1...')

    try {
      const isValidToken = await managerClient.validateSSOToken(tokenHeader)

      if (!isValidToken) {
        console.log('❌ Auth Server - Token SSO inválido ou expirado')
        console.log('💡 Dica: Verifique se o Sistema 1 está rodando em localhost:3000')
        return null
      }

      console.log('✅ Auth Server - Token validado com sucesso no Sistema 1')
    } catch (validationError) {
      console.error('❌ Auth Server - Erro ao validar token com Sistema 1:', validationError)
      console.error('💡 Dica: Verifique se o Sistema 1 está rodando em localhost:3000')
      return null
    }

    console.log('✅ Auth Server - Usuário autenticado com sucesso:')
    console.log(`   👤 Usuário: ${userData.name} (${userData.email})`)
    console.log(`   🏥 Clínica: ${userData.tenant?.name} (${userData.tenant?.id})`)
    console.log(`   🔑 Role: ${userData.role}`)

    return userData

  } catch (error) {
    console.error('❌ Auth Server - Erro na autenticação:', error)
    return null
  }
}

/**
 * Verifica se o usuário tem permissão para uma determinada ação.
 *
 * Resolução 100% via RBAC dinâmico do banco.
 * Se o usuário não tiver UsuarioRole, acesso é negado.
 * O bootstrap (ensureDefaultRole) garante que todo usuário tenha role no login.
 */
export async function hasPermission(user: AuthUser, action: string): Promise<boolean> {
  if (!user.tenant?.id) return false

  const mapped = mapLegacyAction(action)
  if (!mapped) {
    console.warn(`[hasPermission] Ação não mapeada: "${action}" — acesso negado`)
    return false
  }

  const result = await checkPermission(user.id, user.tenant.id, mapped.resource, mapped.action)

  // null = sem UsuarioRole no banco → acesso negado
  // O bootstrap deveria ter criado no login. Se chegou aqui, é erro de configuração.
  if (result === null) {
    console.warn(`[hasPermission] Sem UsuarioRole para user=${user.id}, tenant=${user.tenant.id} — acesso negado`)
    return false
  }

  return result
}

/**
 * Middleware de autenticação para APIs
 */
export async function withAuth<T>(
  request: NextRequest,
  handler: (user: AuthUser, request: NextRequest) => Promise<T>
): Promise<T> {
  const user = await getAuthenticatedUser(request)

  if (!user) {
    throw new Error('Usuário não autenticado')
  }

  return handler(user, request)
}