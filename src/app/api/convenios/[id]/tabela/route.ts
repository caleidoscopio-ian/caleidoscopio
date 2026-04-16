import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'
import { Prisma } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Usuário sem clínica associada' }, { status: 403 })
    if (!await hasPermission(user, 'view_convenios')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { id: convenioId } = await params
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    // Verificar que o convênio pertence ao tenant
    const convenio = await prisma.convenio.findFirst({
      where: { id: convenioId, tenantId: user.tenant.id },
    })
    if (!convenio) return NextResponse.json({ success: false, error: 'Convênio não encontrado' }, { status: 404 })

    const where: Prisma.ConvenioTabelaWhereInput = {
      convenioId,
      tenantId: user.tenant.id, // 🔒 CRÍTICO
      ativo: true,
    }

    if (search) {
      where.OR = [
        { nome_procedimento: { contains: search, mode: 'insensitive' } },
        { codigo_procedimento: { contains: search, mode: 'insensitive' } },
      ]
    }

    const tabela = await prisma.convenioTabela.findMany({
      where,
      orderBy: { nome_procedimento: 'asc' },
    })

    return NextResponse.json({ success: true, data: tabela, total: tabela.length })
  } catch (error) {
    console.error('Erro ao buscar tabela:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Usuário sem clínica associada' }, { status: 403 })
    if (!await hasPermission(user, 'edit_convenios')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { id: convenioId } = await params
    const body = await request.json()

    const convenio = await prisma.convenio.findFirst({
      where: { id: convenioId, tenantId: user.tenant.id },
    })
    if (!convenio) return NextResponse.json({ success: false, error: 'Convênio não encontrado' }, { status: 404 })

    const { codigo_procedimento, nome_procedimento, valor_convenio, ...resto } = body

    if (!codigo_procedimento || !nome_procedimento || valor_convenio === undefined) {
      return NextResponse.json({ success: false, error: 'Código, nome e valor são obrigatórios' }, { status: 400 })
    }

    // Verificar código único por convênio
    const existente = await prisma.convenioTabela.findFirst({
      where: { convenioId, codigo_procedimento, ativo: true },
    })
    if (existente) {
      return NextResponse.json({ success: false, error: 'Já existe um procedimento com este código neste convênio' }, { status: 409 })
    }

    const item = await prisma.convenioTabela.create({
      data: {
        convenioId,
        tenantId: user.tenant.id,
        codigo_procedimento,
        nome_procedimento,
        valor_convenio,
        valor_particular: resto.valor_particular ?? null,
        valor_co_participacao: resto.valor_co_participacao ?? null,
        codigo_tiss: resto.codigo_tiss || null,
        tipo_guia: resto.tipo_guia || null,
        tipo_tabela: resto.tipo_tabela || null,
        grau_participacao: resto.grau_participacao || null,
        vigencia_inicio: resto.vigencia_inicio ? new Date(resto.vigencia_inicio) : null,
        vigencia_fim: resto.vigencia_fim ? new Date(resto.vigencia_fim) : null,
        procedimentoId: resto.procedimentoId || null,
      },
    })

    // Registrar no histórico do convênio
    await prisma.convenioHistorico.create({
      data: {
        convenioId,
        tenantId: user.tenant.id,
        tipo: 'ALTERACAO_TABELA',
        titulo: 'Procedimento adicionado à tabela',
        descricao: `Procedimento "${nome_procedimento}" (${codigo_procedimento}) adicionado com valor R$ ${Number(valor_convenio).toFixed(2)}.`,
        usuario_nome: user.name || user.email,
        usuario_id: user.id,
      },
    })

    return NextResponse.json({ success: true, data: item }, { status: 201 })
  } catch (error) {
    console.error('Erro ao adicionar à tabela:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Usuário sem clínica associada' }, { status: 403 })
    if (!await hasPermission(user, 'edit_convenios')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { id: convenioId } = await params
    const body = await request.json()
    const { itemId, ...dados } = body

    if (!itemId) return NextResponse.json({ success: false, error: 'ID do item é obrigatório' }, { status: 400 })

    const item = await prisma.convenioTabela.findFirst({
      where: { id: itemId, convenioId, tenantId: user.tenant.id },
    })
    if (!item) return NextResponse.json({ success: false, error: 'Item não encontrado' }, { status: 404 })

    if (dados.vigencia_inicio) dados.vigencia_inicio = new Date(dados.vigencia_inicio)
    if (dados.vigencia_fim) dados.vigencia_fim = new Date(dados.vigencia_fim)

    const atualizado = await prisma.convenioTabela.update({
      where: { id: itemId },
      data: dados,
    })

    return NextResponse.json({ success: true, data: atualizado })
  } catch (error) {
    console.error('Erro ao atualizar item da tabela:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Usuário sem clínica associada' }, { status: 403 })
    if (!await hasPermission(user, 'edit_convenios')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { id: convenioId } = await params
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')

    if (!itemId) return NextResponse.json({ success: false, error: 'ID do item é obrigatório' }, { status: 400 })

    const item = await prisma.convenioTabela.findFirst({
      where: { id: itemId, convenioId, tenantId: user.tenant.id },
    })
    if (!item) return NextResponse.json({ success: false, error: 'Item não encontrado' }, { status: 404 })

    await prisma.convenioTabela.update({ where: { id: itemId }, data: { ativo: false } })

    return NextResponse.json({ success: true, message: 'Procedimento removido da tabela' })
  } catch (error) {
    console.error('Erro ao remover da tabela:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
