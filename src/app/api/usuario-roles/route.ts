import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'
import { invalidatePermissionCache } from '@/lib/auth/permission-service'

// GET /api/usuario-roles — Listar usuários do tenant com suas roles
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ error: 'Sem tenant' }, { status: 403 })
    if (!await hasPermission(user, 'manage_permissions')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const tenantId = user.tenant.id

    // Buscar profissionais do banco local (mesma fonte que /api/usuarios-sistema1)
    const profissionais = await prisma.profissional.findMany({
      where: {
        tenantId,
        ativo: true,
      },
      select: {
        id: true,
        usuarioId: true,
        nome: true,
        email: true,
        especialidade: true,
      },
      orderBy: { nome: 'asc' },
    })

    // Buscar UsuarioRoles locais do tenant
    const usuarioRoles = await prisma.usuarioRole.findMany({
      where: { tenantId },
      include: {
        role: {
          select: { id: true, nome: true, isSystem: true },
        },
      },
    })

    const roleMap = new Map(usuarioRoles.map(ur => [ur.usuarioId, ur]))

    // Mesclar profissionais com roles locais
    const result = profissionais
      .filter(p => p.usuarioId) // Apenas profissionais vinculados a um usuário
      .map(p => ({
        id: p.usuarioId!,
        nome: p.nome,
        email: p.email || '',
        ssoRole: roleMap.get(p.usuarioId!)?.role?.nome === 'SUPER_ADMIN' ? 'SUPER_ADMIN'
               : roleMap.get(p.usuarioId!)?.role?.nome === 'ADMIN' ? 'ADMIN'
               : 'USER',
        roleAtual: roleMap.get(p.usuarioId!)?.role ?? null,
        usuarioRoleId: roleMap.get(p.usuarioId!)?.id ?? null,
        ativo: roleMap.get(p.usuarioId!)?.ativo ?? true,
        especialidade: p.especialidade,
      }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/usuario-roles error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST /api/usuario-roles — Atribuir role a um usuário
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ error: 'Sem tenant' }, { status: 403 })
    if (!await hasPermission(user, 'manage_permissions')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const { usuarioId, roleId, justificativa } = body

    if (!usuarioId || !roleId) {
      return NextResponse.json({ error: 'usuarioId e roleId são obrigatórios' }, { status: 400 })
    }

    const tenantId = user.tenant.id

    // Validar que a role pertence ao tenant
    const role = await prisma.role.findFirst({
      where: { id: roleId, tenantId, ativo: true },
    })
    if (!role) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

    // Verificar se já existe atribuição
    const existing = await prisma.usuarioRole.findUnique({
      where: { usuarioId_tenantId: { usuarioId, tenantId } },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Usuário já possui perfil. Use PUT para alterar.' },
        { status: 409 }
      )
    }

    const usuarioRole = await prisma.usuarioRole.create({
      data: {
        usuarioId,
        tenantId,
        roleId,
        atribuido_por: user.id,
        justificativa: justificativa ?? null,
        ativo: true,
      },
    })

    await prisma.usuarioRoleHistorico.create({
      data: {
        usuarioId,
        tenantId,
        roleAnteriorId: null,
        roleNovoId: roleId,
        acao: 'ATRIBUICAO',
        alterado_por: user.id,
        justificativa: justificativa ?? null,
      },
    })

    invalidatePermissionCache(usuarioId, tenantId)

    return NextResponse.json(usuarioRole, { status: 201 })
  } catch (error) {
    console.error('POST /api/usuario-roles error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PUT /api/usuario-roles — Alterar role de um usuário
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ error: 'Sem tenant' }, { status: 403 })
    if (!await hasPermission(user, 'manage_permissions')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const { usuarioId, roleId, justificativa } = body

    if (!usuarioId || !roleId) {
      return NextResponse.json({ error: 'usuarioId e roleId são obrigatórios' }, { status: 400 })
    }

    const tenantId = user.tenant.id

    // Validar role
    const role = await prisma.role.findFirst({
      where: { id: roleId, tenantId, ativo: true },
    })
    if (!role) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

    // Buscar atribuição atual
    const existing = await prisma.usuarioRole.findUnique({
      where: { usuarioId_tenantId: { usuarioId, tenantId } },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Usuário não possui perfil. Use POST para atribuir.' },
        { status: 404 }
      )
    }

    const roleAnteriorId = existing.roleId

    const updated = await prisma.usuarioRole.update({
      where: { id: existing.id },
      data: { roleId, atribuido_por: user.id, justificativa: justificativa ?? null },
    })

    await prisma.usuarioRoleHistorico.create({
      data: {
        usuarioId,
        tenantId,
        roleAnteriorId,
        roleNovoId: roleId,
        acao: 'ALTERACAO',
        alterado_por: user.id,
        justificativa: justificativa ?? null,
      },
    })

    invalidatePermissionCache(usuarioId, tenantId)

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT /api/usuario-roles error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
