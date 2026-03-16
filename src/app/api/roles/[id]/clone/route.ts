import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'
import { invalidateRoleCache } from '@/lib/auth/permission-service'

// POST /api/roles/[id]/clone — Clonar permissões de outra role para esta
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ error: 'Sem tenant' }, { status: 403 })
    if (!await hasPermission(user, 'manage_permissions')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { id: targetId } = await params
    const body = await request.json()
    const { sourceRoleId } = body

    if (!sourceRoleId) {
      return NextResponse.json({ error: 'sourceRoleId é obrigatório' }, { status: 400 })
    }

    // Validar role destino
    const targetRole = await prisma.role.findFirst({
      where: { id: targetId, tenantId: user.tenant.id },
    })
    if (!targetRole) return NextResponse.json({ error: 'Perfil destino não encontrado' }, { status: 404 })
    if (targetRole.isSystem) {
      return NextResponse.json({ error: 'Não é possível modificar permissões de perfis de sistema' }, { status: 403 })
    }

    // Validar role origem (deve ser do mesmo tenant)
    const sourceRole = await prisma.role.findFirst({
      where: { id: sourceRoleId, tenantId: user.tenant.id },
      include: {
        permissoes: true,
      },
    })
    if (!sourceRole) return NextResponse.json({ error: 'Perfil de origem não encontrado' }, { status: 404 })

    // Clonar permissões
    const novasPermissoes = sourceRole.permissoes.map(p => ({
      roleId: targetId,
      recursoId: p.recursoId,
      acaoId: p.acaoId,
    }))

    await prisma.$transaction([
      prisma.rolePermissao.deleteMany({ where: { roleId: targetId } }),
      prisma.rolePermissao.createMany({ data: novasPermissoes, skipDuplicates: true }),
    ])

    invalidateRoleCache(targetId)

    return NextResponse.json({ success: true, total: novasPermissoes.length })
  } catch (error) {
    console.error('POST /api/roles/[id]/clone error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
