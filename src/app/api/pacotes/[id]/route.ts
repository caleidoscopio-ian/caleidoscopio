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
    if (!await hasPermission(user, 'view_procedimentos')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { id } = await params

    const pacote = await prisma.pacote.findFirst({
      where: { id, tenantId: user.tenant.id },
      include: {
        _count: { select: { procedimentos: true } },
        convenio: { select: { id: true, razao_social: true, nome_fantasia: true } },
        procedimentos: {
          include: {
            procedimento: { select: { id: true, nome: true, valor: true, duracao_padrao: true, cor: true, icone: true } },
          },
        },
        historicos: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })

    if (!pacote) return NextResponse.json({ success: false, error: 'Pacote não encontrado' }, { status: 404 })

    return NextResponse.json({ success: true, data: pacote })
  } catch (error) {
    console.error('Erro ao buscar pacote:', error)
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
    if (!await hasPermission(user, 'edit_procedimentos')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.pacote.findFirst({ where: { id, tenantId: user.tenant.id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Pacote não encontrado' }, { status: 404 })

    const { nome, descricao, tipo, valor_total, valor_particular, valor_original, total_sessoes, validade_dias, cor, icone, convenioId, observacoes, procedimentos } = body

    const anterior = { nome: existing.nome, tipo: existing.tipo, valor_total: existing.valor_total }

    const updated = await prisma.$transaction(async (tx) => {
      const up = await tx.pacote.update({
        where: { id },
        data: {
          nome: nome ?? existing.nome,
          descricao: descricao !== undefined ? descricao : existing.descricao,
          tipo: tipo ?? existing.tipo,
          valor_total: valor_total != null ? new Prisma.Decimal(valor_total) : existing.valor_total,
          valor_particular: valor_particular != null ? new Prisma.Decimal(valor_particular) : existing.valor_particular,
          valor_original: valor_original != null ? new Prisma.Decimal(valor_original) : existing.valor_original,
          total_sessoes: total_sessoes !== undefined ? total_sessoes : existing.total_sessoes,
          validade_dias: validade_dias !== undefined ? validade_dias : existing.validade_dias,
          cor: cor !== undefined ? cor : existing.cor,
          icone: icone !== undefined ? icone : existing.icone,
          convenioId: convenioId !== undefined ? convenioId : existing.convenioId,
          observacoes: observacoes !== undefined ? observacoes : existing.observacoes,
        },
      })

      if (procedimentos) {
        await tx.pacoteProcedimento.deleteMany({ where: { pacoteId: id } })
        await tx.pacoteProcedimento.createMany({
          data: procedimentos.map((p: { procedimentoId: string; quantidade: number; observacoes?: string }) => ({
            pacoteId: id,
            procedimentoId: p.procedimentoId,
            quantidade: p.quantidade,
            observacoes: p.observacoes || null,
          })),
        })
      }

      await tx.pacoteHistorico.create({
        data: {
          pacoteId: id,
          tenantId: user.tenant!.id,
          tipo_alteracao: 'ALTERACAO',
          descricao: 'Pacote atualizado.',
          dados_anteriores: anterior as Prisma.InputJsonValue,
          dados_novos: { nome, tipo, valor_total } as Prisma.InputJsonValue,
          usuario_nome: user.name || user.email,
          usuario_id: user.id,
        },
      })

      return up
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Erro ao atualizar pacote:', error)
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
    if (!await hasPermission(user, 'delete_procedimentos')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { id } = await params

    const existing = await prisma.pacote.findFirst({ where: { id, tenantId: user.tenant.id } })
    if (!existing) return NextResponse.json({ success: false, error: 'Pacote não encontrado' }, { status: 404 })

    await prisma.$transaction([
      prisma.pacote.update({ where: { id }, data: { ativo: false } }),
      prisma.pacoteHistorico.create({
        data: {
          pacoteId: id,
          tenantId: user.tenant.id,
          tipo_alteracao: 'DESATIVACAO',
          descricao: 'Pacote desativado.',
          dados_anteriores: { ativo: true } as Prisma.InputJsonValue,
          dados_novos: { ativo: false } as Prisma.InputJsonValue,
          usuario_nome: user.name || user.email,
          usuario_id: user.id,
        },
      }),
    ])

    return NextResponse.json({ success: true, message: 'Pacote desativado' })
  } catch (error) {
    console.error('Erro ao desativar pacote:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
