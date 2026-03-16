import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'
import { Prisma } from '@prisma/client'

// GET /api/roles — Listar roles do tenant
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ error: 'Sem tenant' }, { status: 403 })
    if (!await hasPermission(user, 'manage_permissions')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const busca = searchParams.get('busca')

    const where: Prisma.RoleWhereInput = {
      tenantId: user.tenant.id,
    }

    if (busca) {
      where.nome = { contains: busca, mode: 'insensitive' }
    }

    const roles = await prisma.role.findMany({
      where,
      include: {
        _count: {
          select: { usuarios: { where: { ativo: true } } },
        },
      },
      orderBy: [
        { isSystem: 'desc' },
        { nome: 'asc' },
      ],
    })

    return NextResponse.json(roles)
  } catch (error) {
    console.error('GET /api/roles error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST /api/roles — Criar nova role customizada
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ error: 'Sem tenant' }, { status: 403 })
    if (!await hasPermission(user, 'manage_permissions')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const { nome, descricao } = body

    if (!nome?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    // Verificar nome duplicado
    const existing = await prisma.role.findUnique({
      where: { tenantId_nome: { tenantId: user.tenant.id, nome: nome.trim() } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Já existe um perfil com este nome' }, { status: 409 })
    }

    const role = await prisma.role.create({
      data: {
        tenantId: user.tenant.id,
        nome: nome.trim(),
        descricao: descricao?.trim() || null,
        isSystem: false,
        ativo: true,
      },
    })

    return NextResponse.json(role, { status: 201 })
  } catch (error) {
    console.error('POST /api/roles error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
