import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Usuário sem clínica associada' }, { status: 403 })
    if (!await hasPermission(user, 'view_procedimentos')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const especialidade = searchParams.get('especialidade') || ''
    const includeInativos = searchParams.get('includeInativos') === 'true'

    const where: Prisma.ProcedimentoWhereInput = {
      tenantId: user.tenant.id,
    }

    if (!includeInativos) where.ativo = true
    if (especialidade) where.especialidade = especialidade
    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
      ]
    }

    const procedimentos = await prisma.procedimento.findMany({
      where,
      include: {
        _count: {
          select: {
            agendamentos: true,
            tabelasConvenio: true,
            regrasRepasse: true,
            pacoteProcedimentos: true,
          },
        },
      },
      orderBy: [{ especialidade: 'asc' }, { nome: 'asc' }],
    })

    return NextResponse.json({ success: true, data: procedimentos, total: procedimentos.length })
  } catch (error) {
    console.error('Erro ao buscar procedimentos:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Usuário sem clínica associada' }, { status: 403 })
    if (!await hasPermission(user, 'create_procedimentos')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const body = await request.json()
    const { nome, codigo, descricao, valor, valor_particular, duracao_padrao, tempo_minimo, tempo_maximo, especialidade, requer_autorizacao, observacoes, cor, icone } = body

    if (!nome) return NextResponse.json({ success: false, error: 'Nome é obrigatório' }, { status: 400 })

    if (codigo) {
      const dup = await prisma.procedimento.findFirst({
        where: { tenantId: user.tenant.id, codigo, ativo: true },
      })
      if (dup) return NextResponse.json({ success: false, error: 'Já existe um procedimento com este código' }, { status: 409 })
    }

    const procedimento = await prisma.procedimento.create({
      data: {
        tenantId: user.tenant.id,
        nome,
        codigo: codigo || null,
        descricao: descricao || null,
        valor: valor != null ? new Prisma.Decimal(valor) : null,
        valor_particular: valor_particular != null ? new Prisma.Decimal(valor_particular) : null,
        duracao_padrao: duracao_padrao || null,
        tempo_minimo: tempo_minimo || null,
        tempo_maximo: tempo_maximo || null,
        especialidade: especialidade || null,
        requer_autorizacao: requer_autorizacao ?? false,
        observacoes: observacoes || null,
        cor: cor || null,
        icone: icone || null,
      },
    })

    return NextResponse.json({ success: true, data: procedimento }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar procedimento:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Usuário sem clínica associada' }, { status: 403 })
    if (!await hasPermission(user, 'edit_procedimentos')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const body = await request.json()
    const { id, nome, codigo, descricao, valor, valor_particular, duracao_padrao, tempo_minimo, tempo_maximo, especialidade, requer_autorizacao, observacoes, cor, icone } = body

    if (!id || !nome) return NextResponse.json({ success: false, error: 'ID e nome são obrigatórios' }, { status: 400 })

    const existing = await prisma.procedimento.findFirst({
      where: { id, tenantId: user.tenant.id },
    })
    if (!existing) return NextResponse.json({ success: false, error: 'Procedimento não encontrado' }, { status: 404 })

    if (codigo && codigo !== existing.codigo) {
      const dup = await prisma.procedimento.findFirst({
        where: { tenantId: user.tenant.id, codigo, ativo: true, id: { not: id } },
      })
      if (dup) return NextResponse.json({ success: false, error: 'Já existe outro procedimento com este código' }, { status: 409 })
    }

    const updated = await prisma.procedimento.update({
      where: { id },
      data: {
        nome,
        codigo: codigo || null,
        descricao: descricao || null,
        valor: valor != null ? new Prisma.Decimal(valor) : null,
        valor_particular: valor_particular != null ? new Prisma.Decimal(valor_particular) : null,
        duracao_padrao: duracao_padrao || null,
        tempo_minimo: tempo_minimo || null,
        tempo_maximo: tempo_maximo || null,
        especialidade: especialidade || null,
        requer_autorizacao: requer_autorizacao ?? false,
        observacoes: observacoes || null,
        cor: cor || null,
        icone: icone || null,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Erro ao atualizar procedimento:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Usuário sem clínica associada' }, { status: 403 })
    if (!await hasPermission(user, 'delete_procedimentos')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'ID é obrigatório' }, { status: 400 })

    const existing = await prisma.procedimento.findFirst({
      where: { id, tenantId: user.tenant.id },
    })
    if (!existing) return NextResponse.json({ success: false, error: 'Procedimento não encontrado' }, { status: 404 })

    await prisma.procedimento.update({ where: { id }, data: { ativo: false } })

    return NextResponse.json({ success: true, message: 'Procedimento desativado' })
  } catch (error) {
    console.error('Erro ao desativar procedimento:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
