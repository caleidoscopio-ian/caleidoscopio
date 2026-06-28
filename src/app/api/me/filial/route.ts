import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth/server'

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN']

// GET /api/me/filial — retorna a filial vinculada e o perfil RBAC do usuário logado.
// O perfil RBAC (página de permissões) é a fonte de verdade para "isAdmin".
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ error: 'Sem tenant' }, { status: 403 })

    const ur = await prisma.usuarioRole.findUnique({
      where: { usuarioId_tenantId: { usuarioId: user.id, tenantId: user.tenant.id } },
      select: {
        filialId: true,
        filial: { select: { id: true, nome: true, cor: true, ativo: true } },
        role: { select: { nome: true } },
      },
    })

    // Fonte de verdade = role RBAC; fallback p/ role do SSO
    const rbacRole = ur?.role?.nome ?? null
    const roleEfetivo = (rbacRole ?? user.role ?? '').toUpperCase()
    const isAdmin = ADMIN_ROLES.includes(roleEfetivo)

    return NextResponse.json({
      filialId: ur?.filialId ?? null,
      filial: ur?.filial ?? null,
      rbacRole,
      isAdmin,
    })
  } catch (error) {
    console.error('GET /api/me/filial error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
