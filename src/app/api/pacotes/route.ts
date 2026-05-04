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
    const includeInativos = searchParams.get('includeInativos') === 'true'

    const where: Prisma.PacoteWhereInput = { tenantId: user.tenant.id }
    if (!includeInativos) where.ativo = true
    if (search) where.nome = { contains: search, mode: 'insensitive' }

    const pacotes = await prisma.pacote.findMany({
      where,
      include: {
        _count: { select: { procedimentos: true } },
        convenio: { select: { id: true, razao_social: true, nome_fantasia: true } },
        procedimentos: {
          include: {
            procedimento: { select: { id: true, nome: true, valor: true, duracao_padrao: true, cor: true, icone: true } },
          },
        },
      },
      orderBy: { nome: 'asc' },
    })

    return NextResponse.json({ success: true, data: pacotes, total: pacotes.length })
  } catch (error) {
    console.error('Erro ao buscar pacotes:', error)
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
    const { nome, descricao, tipo, valor_total, valor_particular, valor_original, total_sessoes, validade_dias, cor, icone, convenioId, observacoes, procedimentos } = body

    if (!nome) return NextResponse.json({ success: false, error: 'Nome é obrigatório' }, { status: 400 })
    if (!tipo) return NextResponse.json({ success: false, error: 'Tipo é obrigatório' }, { status: 400 })
    if (!valor_total) return NextResponse.json({ success: false, error: 'Valor total é obrigatório' }, { status: 400 })
    if (!procedimentos?.length) return NextResponse.json({ success: false, error: 'Adicione ao menos um procedimento' }, { status: 400 })

    const pacote = await prisma.$transaction(async (tx) => {
      const created = await tx.pacote.create({
        data: {
          tenantId: user.tenant!.id,
          nome,
          descricao: descricao || null,
          tipo,
          valor_total: new Prisma.Decimal(valor_total),
          valor_particular: valor_particular != null ? new Prisma.Decimal(valor_particular) : null,
          valor_original: valor_original != null ? new Prisma.Decimal(valor_original) : null,
          total_sessoes: total_sessoes || null,
          validade_dias: validade_dias || null,
          cor: cor || null,
          icone: icone || null,
          convenioId: convenioId || null,
          observacoes: observacoes || null,
        },
      })

      await tx.pacoteProcedimento.createMany({
        data: procedimentos.map((p: { procedimentoId: string; quantidade: number; observacoes?: string }) => ({
          pacoteId: created.id,
          procedimentoId: p.procedimentoId,
          quantidade: p.quantidade,
          observacoes: p.observacoes || null,
        })),
      })

      await tx.pacoteHistorico.create({
        data: {
          pacoteId: created.id,
          tenantId: user.tenant!.id,
          tipo_alteracao: 'CRIACAO',
          descricao: `Pacote "${nome}" criado com ${procedimentos.length} procedimento(s).`,
          dados_novos: { nome, tipo, valor_total, procedimentos } as Prisma.InputJsonValue,
          usuario_nome: user.name || user.email,
          usuario_id: user.id,
        },
      })

      return created
    })

    return NextResponse.json({ success: true, data: pacote }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar pacote:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
