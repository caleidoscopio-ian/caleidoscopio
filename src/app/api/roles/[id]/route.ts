import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'

// GET /api/roles/[id] — Detalhes de uma role
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
      include: {
        permissoes: {
          include: { recurso: true, acao: true },
        },
        _count: {
          select: { usuarios: { where: { ativo: true } } },
        },
      },
    })

    if (!role) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

    return NextResponse.json(role)
  } catch (error) {
    console.error('GET /api/roles/[id] error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PUT /api/roles/[id] — Atualizar role customizada
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
      return NextResponse.json({ error: 'Perfis de sistema não podem ser editados' }, { status: 403 })
    }

    const body = await request.json()
    const { nome, descricao, ativo } = body

    if (nome !== undefined && !nome?.trim()) {
      return NextResponse.json({ error: 'Nome não pode ser vazio' }, { status: 400 })
    }

    // Verificar nome duplicado (se mudou)
    if (nome && nome.trim() !== role.nome) {
      const existing = await prisma.role.findUnique({
        where: { tenantId_nome: { tenantId: user.tenant.id, nome: nome.trim() } },
      })
      if (existing) {
        return NextResponse.json({ error: 'Já existe um perfil com este nome' }, { status: 409 })
      }
    }

    const updated = await prisma.role.update({
      where: { id },
      data: {
        ...(nome !== undefined && { nome: nome.trim() }),
        ...(descricao !== undefined && { descricao: descricao?.trim() || null }),
        ...(ativo !== undefined && { ativo }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT /api/roles/[id] error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE /api/roles/[id] — Desativar role (soft delete)
export async function DELETE(
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
      include: {
        _count: { select: { usuarios: { where: { ativo: true } } } },
      },
    })

    if (!role) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    if (role.isSystem) {
      return NextResponse.json({ error: 'Perfis de sistema não podem ser removidos' }, { status: 403 })
    }
    if (role._count.usuarios > 0) {
      return NextResponse.json(
        { error: `Este perfil está em uso por ${role._count.usuarios} usuário(s). Reatribua antes de desativar.` },
        { status: 409 }
      )
    }

    await prisma.role.update({
      where: { id },
      data: { ativo: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/roles/[id] error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
