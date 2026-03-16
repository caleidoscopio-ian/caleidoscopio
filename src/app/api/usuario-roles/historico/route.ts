import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'
import { Prisma } from '@prisma/client'

// GET /api/usuario-roles/historico — Audit log de alterações de role
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ error: 'Sem tenant' }, { status: 403 })
    if (!await hasPermission(user, 'manage_permissions')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const usuarioId = searchParams.get('usuarioId')
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')
    const formato = searchParams.get('formato') // 'csv'
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)

    const where: Prisma.UsuarioRoleHistoricoWhereInput = {
      tenantId: user.tenant.id,
    }

    if (usuarioId) where.usuarioId = usuarioId
    if (dataInicio) where.createdAt = { gte: new Date(dataInicio) }
    if (dataFim) {
      where.createdAt = {
        ...(typeof where.createdAt === 'object' && where.createdAt !== null ? where.createdAt : {}),
        lte: new Date(dataFim),
      }
    }

    const [historico, total] = await Promise.all([
      prisma.usuarioRoleHistorico.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.usuarioRoleHistorico.count({ where }),
    ])

    // Buscar nomes das roles para exibição
    const roleIds = [
      ...new Set([
        ...historico.map(h => h.roleAnteriorId).filter(Boolean),
        ...historico.map(h => h.roleNovoId).filter(Boolean),
      ]),
    ] as string[]

    const roles = await prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, nome: true },
    })
    const roleNomeMap = new Map(roles.map(r => [r.id, r.nome]))

    const historicoEnriquecido = historico.map(h => ({
      ...h,
      roleAnteriorNome: h.roleAnteriorId ? (roleNomeMap.get(h.roleAnteriorId) ?? 'Desconhecido') : null,
      roleNovoNome: h.roleNovoId ? (roleNomeMap.get(h.roleNovoId) ?? 'Desconhecido') : null,
    }))

    // Export CSV
    if (formato === 'csv') {
      const headers = ['Data', 'Usuário ID', 'Ação', 'Perfil Anterior', 'Perfil Novo', 'Alterado Por', 'Justificativa']
      const rows = historicoEnriquecido.map(h => [
        h.createdAt.toISOString(),
        h.usuarioId,
        h.acao,
        h.roleAnteriorNome ?? '',
        h.roleNovoNome ?? '',
        h.alterado_por,
        h.justificativa ?? '',
      ])
      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="historico-roles.csv"',
        },
      })
    }

    return NextResponse.json({
      data: historicoEnriquecido,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('GET /api/usuario-roles/historico error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
