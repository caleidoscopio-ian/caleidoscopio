// Utilitários de autenticação para o servidor
// Extrai dados do usuário logado das APIs do Sistema 2

import { NextRequest } from 'next/server'
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
 * Verifica se o usuário tem permissão para uma determinada ação
 */
export function hasPermission(user: AuthUser, action: string): boolean {
  const adminRoles = ['ADMIN', 'SUPER_ADMIN']
  const terapeutaRoles = ['USER', 'TERAPEUTA', ...adminRoles] // USER = Terapeuta

  switch (action) {
    case 'view_patients':
      return terapeutaRoles.includes(user.role)

    case 'create_patients':
      return terapeutaRoles.includes(user.role)

    case 'edit_patients':
      return terapeutaRoles.includes(user.role)

    case 'delete_patients':
      return adminRoles.includes(user.role)

    case 'view_professionals':
      return terapeutaRoles.includes(user.role) // Terapeutas podem ver lista de profissionais

    case 'create_professionals':
      return adminRoles.includes(user.role)

    case 'edit_professionals':
      return adminRoles.includes(user.role)

    case 'delete_professionals':
      return adminRoles.includes(user.role)

    // Permissões de prontuários
    case 'view_medical_records':
    case 'create_medical_records':
    case 'edit_medical_records':
    case 'delete_medical_records':
      return terapeutaRoles.includes(user.role)

    // Permissões de atividades
    case 'view_activities':
    case 'create_activities':
    case 'edit_activities':
      return terapeutaRoles.includes(user.role)

    case 'delete_activities':
      return adminRoles.includes(user.role)

    // Permissões de sessões
    case 'view_sessions':
    case 'create_sessions':
    case 'edit_sessions':
      return terapeutaRoles.includes(user.role)

    // Permissões de anamneses
    case 'view_anamneses':
    case 'create_anamneses':
    case 'edit_anamneses':
      return terapeutaRoles.includes(user.role)

    case 'delete_anamneses':
      return adminRoles.includes(user.role)

    case 'manage_users':
      return adminRoles.includes(user.role)

    default:
      return false
  }
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