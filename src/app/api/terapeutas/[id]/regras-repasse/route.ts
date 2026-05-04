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
    if (!await hasPermission(user, 'view_professionals')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { id: profissionalId } = await params

    // Verificar que o profissional pertence ao tenant
    const profissional = await prisma.profissional.findFirst({
      where: { id: profissionalId, tenantId: user.tenant.id },
    })
    if (!profissional) return NextResponse.json({ success: false, error: 'Profissional não encontrado' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const includeInativos = searchParams.get('includeInativos') === 'true'

    const where: Prisma.RegraRepasseWhereInput = {
      profissionalId,
      tenantId: user.tenant.id, // 🔒 CRÍTICO
    }

    if (!includeInativos) {
      where.ativo = true
    }

    const regras = await prisma.regraRepasse.findMany({
      where,
      include: {
        convenio: { select: { id: true, razao_social: true, nome_fantasia: true } },
        procedimento: { select: { id: true, nome: true, codigo: true } },
      },
      orderBy: [{ prioridade: 'desc' }, { vigencia_inicio: 'desc' }],
    })

    return NextResponse.json({ success: true, data: regras, total: regras.length })
  } catch (error) {
    console.error('Erro ao buscar regras de repasse:', error)
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
    if (!await hasPermission(user, 'edit_professionals')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { id: profissionalId } = await params

    const profissional = await prisma.profissional.findFirst({
      where: { id: profissionalId, tenantId: user.tenant.id },
    })
    if (!profissional) return NextResponse.json({ success: false, error: 'Profissional não encontrado' }, { status: 404 })

    const body = await request.json()
    const { tipo, valor, descricao, convenioId, procedimentoId, vigencia_inicio, vigencia_fim, prioridade } = body

    if (!tipo || valor === undefined || valor === null) {
      return NextResponse.json({ success: false, error: 'Tipo e valor são obrigatórios' }, { status: 400 })
    }

    if (!['PERCENTUAL', 'VALOR_FIXO', 'VALOR_HORA'].includes(tipo)) {
      return NextResponse.json({ success: false, error: 'Tipo de repasse inválido' }, { status: 400 })
    }

    if (tipo === 'PERCENTUAL' && Number(valor) > 100) {
      return NextResponse.json({ success: false, error: 'Percentual não pode exceder 100%' }, { status: 400 })
    }

    const inicio = vigencia_inicio ? new Date(vigencia_inicio) : new Date()
    const fim = vigencia_fim ? new Date(vigencia_fim) : null

    // Verificar conflito: mesmos critérios + vigência sobreposta
    const conflito = await prisma.regraRepasse.findFirst({
      where: {
        profissionalId,
        tenantId: user.tenant.id,
        ativo: true,
        convenioId: convenioId || null,
        procedimentoId: procedimentoId || null,
        AND: [
          { vigencia_inicio: { lte: fim || new Date('2099-12-31') } },
          {
            OR: [
              { vigencia_fim: null },
              { vigencia_fim: { gte: inicio } },
            ],
          },
        ],
      },
    })

    if (conflito) {
      return NextResponse.json({
        success: false,
        error: 'Já existe uma regra de repasse ativa com os mesmos critérios e vigência sobreposta',
      }, { status: 409 })
    }

    const regra = await prisma.regraRepasse.create({
      data: {
        tenantId: user.tenant.id,
        profissionalId,
        tipo,
        valor: new Prisma.Decimal(valor),
        descricao: descricao || null,
        convenioId: convenioId || null,
        procedimentoId: procedimentoId || null,
        vigencia_inicio: inicio,
        vigencia_fim: fim,
        prioridade: prioridade ?? 0,
        ativo: true,
      },
      include: {
        convenio: { select: { id: true, razao_social: true, nome_fantasia: true } },
        procedimento: { select: { id: true, nome: true, codigo: true } },
      },
    })

    // Registrar histórico
    await prisma.regraRepasseHistorico.create({
      data: {
        regraRepasseId: regra.id,
        tenantId: user.tenant.id,
        tipo_alteracao: 'CRIACAO',
        descricao: `Regra criada: ${tipo} de ${valor}${tipo === 'PERCENTUAL' ? '%' : ' R$'}`,
        dados_anteriores: Prisma.JsonNull,
        dados_novos: { tipo, valor, convenioId, procedimentoId, vigencia_inicio: inicio, vigencia_fim: fim, prioridade } as Prisma.InputJsonValue,
        usuario_nome: user.name || user.email,
        usuario_id: user.id,
      },
    })

    return NextResponse.json({ success: true, data: regra }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar regra de repasse:', error)
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
    if (!await hasPermission(user, 'edit_professionals')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { id: profissionalId } = await params
    const body = await request.json()
    const { regraId, tipo, valor, descricao, convenioId, procedimentoId, vigencia_inicio, vigencia_fim, prioridade } = body

    if (!regraId) return NextResponse.json({ success: false, error: 'ID da regra é obrigatório' }, { status: 400 })

    const regra = await prisma.regraRepasse.findFirst({
      where: { id: regraId, profissionalId, tenantId: user.tenant.id },
    })
    if (!regra) return NextResponse.json({ success: false, error: 'Regra não encontrada' }, { status: 404 })

    if (tipo === 'PERCENTUAL' && Number(valor) > 100) {
      return NextResponse.json({ success: false, error: 'Percentual não pode exceder 100%' }, { status: 400 })
    }

    const inicio = vigencia_inicio ? new Date(vigencia_inicio) : regra.vigencia_inicio
    const fim = vigencia_fim ? new Date(vigencia_fim) : (vigencia_fim === null ? null : regra.vigencia_fim)

    const dadosAnteriores = {
      tipo: regra.tipo,
      valor: regra.valor,
      descricao: regra.descricao,
      convenioId: regra.convenioId,
      procedimentoId: regra.procedimentoId,
      vigencia_inicio: regra.vigencia_inicio,
      vigencia_fim: regra.vigencia_fim,
      prioridade: regra.prioridade,
    }

    const atualizada = await prisma.regraRepasse.update({
      where: { id: regraId },
      data: {
        tipo: tipo ?? regra.tipo,
        valor: valor !== undefined ? new Prisma.Decimal(valor) : regra.valor,
        descricao: descricao !== undefined ? descricao : regra.descricao,
        convenioId: convenioId !== undefined ? (convenioId || null) : regra.convenioId,
        procedimentoId: procedimentoId !== undefined ? (procedimentoId || null) : regra.procedimentoId,
        vigencia_inicio: inicio,
        vigencia_fim: fim,
        prioridade: prioridade ?? regra.prioridade,
      },
      include: {
        convenio: { select: { id: true, razao_social: true, nome_fantasia: true } },
        procedimento: { select: { id: true, nome: true, codigo: true } },
      },
    })

    await prisma.regraRepasseHistorico.create({
      data: {
        regraRepasseId: regraId,
        tenantId: user.tenant.id,
        tipo_alteracao: 'ALTERACAO',
        descricao: 'Regra de repasse atualizada',
        dados_anteriores: dadosAnteriores as Prisma.InputJsonValue,
        dados_novos: { tipo, valor, descricao, convenioId, procedimentoId, vigencia_inicio: inicio, vigencia_fim: fim, prioridade } as Prisma.InputJsonValue,
        usuario_nome: user.name || user.email,
        usuario_id: user.id,
      },
    })

    return NextResponse.json({ success: true, data: atualizada })
  } catch (error) {
    console.error('Erro ao atualizar regra de repasse:', error)
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
    if (!await hasPermission(user, 'edit_professionals')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { id: profissionalId } = await params
    const { searchParams } = new URL(request.url)
    const regraId = searchParams.get('regraId')

    if (!regraId) return NextResponse.json({ success: false, error: 'ID da regra é obrigatório' }, { status: 400 })

    const regra = await prisma.regraRepasse.findFirst({
      where: { id: regraId, profissionalId, tenantId: user.tenant.id },
    })
    if (!regra) return NextResponse.json({ success: false, error: 'Regra não encontrada' }, { status: 404 })

    await prisma.regraRepasse.update({ where: { id: regraId }, data: { ativo: false } })

    await prisma.regraRepasseHistorico.create({
      data: {
        regraRepasseId: regraId,
        tenantId: user.tenant.id,
        tipo_alteracao: 'DESATIVACAO',
        descricao: 'Regra de repasse desativada',
        dados_anteriores: { ativo: true } as Prisma.InputJsonValue,
        dados_novos: { ativo: false } as Prisma.InputJsonValue,
        usuario_nome: user.name || user.email,
        usuario_id: user.id,
      },
    })

    return NextResponse.json({ success: true, message: 'Regra de repasse desativada' })
  } catch (error) {
    console.error('Erro ao desativar regra de repasse:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
