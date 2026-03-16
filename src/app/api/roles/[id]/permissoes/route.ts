import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'
import { invalidateRoleCache } from '@/lib/auth/permission-service'

// GET /api/roles/[id]/permissoes — Permissões de uma role
export async function GET(
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

    const { id } = await params

    const role = await prisma.role.findFirst({
      where: { id, tenantId: user.tenant.id },
    })
    if (!role) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

    const permissoes = await prisma.rolePermissao.findMany({
      where: { roleId: id },
      include: { recurso: true, acao: true },
    })

    // Retornar como mapa: { recursoSlug: acaoSlug[] }
    const result: Record<string, string[]> = {}
    for (const p of permissoes) {
      if (!result[p.recurso.slug]) result[p.recurso.slug] = []
      result[p.recurso.slug].push(p.acao.slug)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/roles/[id]/permissoes error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PUT /api/roles/[id]/permissoes — Salvar permissões (substituição completa)
export async function PUT(
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

    const { id } = await params

    const role = await prisma.role.findFirst({
      where: { id, tenantId: user.tenant.id },
    })
    if (!role) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    if (role.isSystem) {
      return NextResponse.json({ error: 'Permissões de perfis de sistema não podem ser alteradas' }, { status: 403 })
    }

    // Body: { permissoes: { recurso: string, acao: string }[] }
    const body = await request.json()
    const permissoesInput: { recurso: string; acao: string }[] = body.permissoes ?? []

    // Buscar IDs de recursos e ações
    const [recursos, acoes] = await Promise.all([
      prisma.recurso.findMany(),
      prisma.acao.findMany(),
    ])
    const recursoMap = new Map(recursos.map(r => [r.slug, r.id]))
    const acaoMap = new Map(acoes.map(a => [a.slug, a.id]))

    // Montar novas permissões
    const novasPermissoes = permissoesInput
      .map(p => {
        const recursoId = recursoMap.get(p.recurso)
        const acaoId = acaoMap.get(p.acao)
        if (!recursoId || !acaoId) return null
        return { roleId: id, recursoId, acaoId }
      })
      .filter((p): p is { roleId: string; recursoId: string; acaoId: string } => p !== null)

    // Substituir todas as permissões em transação
    await prisma.$transaction([
      prisma.rolePermissao.deleteMany({ where: { roleId: id } }),
      prisma.rolePermissao.createMany({ data: novasPermissoes, skipDuplicates: true }),
    ])

    // Invalidar cache de todos os usuários com esta role
    invalidateRoleCache(id)

    return NextResponse.json({ success: true, total: novasPermissoes.length })
  } catch (error) {
    console.error('PUT /api/roles/[id]/permissoes error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
