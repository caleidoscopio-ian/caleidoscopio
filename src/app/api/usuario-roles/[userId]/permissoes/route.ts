import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/server'
import { getEffectivePermissions } from '@/lib/auth/permission-service'

// GET /api/usuario-roles/[userId]/permissoes — Permissões efetivas de um usuário
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ error: 'Sem tenant' }, { status: 403 })

    const { userId } = await params

    // Usuário pode ver suas próprias permissões; admins podem ver de qualquer usuário
    const adminRoles = ['ADMIN', 'SUPER_ADMIN']
    if (userId !== user.id && !adminRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const permSet = await getEffectivePermissions(userId, user.tenant.id)

    if (!permSet) {
      // Sem registro RBAC — retornar baseado na role SSO (fallback)
      return NextResponse.json({
        roleName: user.role,
        roleId: null,
        permissions: {},
        source: 'sso-fallback',
      })
    }

    // Converter Map para objeto serializável
    const permissionsObj: Record<string, string[]> = {}
    for (const [recurso, acoes] of permSet.permissions.entries()) {
      permissionsObj[recurso] = Array.from(acoes)
    }

    return NextResponse.json({
      roleName: permSet.roleName,
      roleId: permSet.roleId,
      permissions: permissionsObj,
      source: 'rbac',
    })
  } catch (error) {
    console.error('GET /api/usuario-roles/[userId]/permissoes error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
