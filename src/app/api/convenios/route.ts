import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    }

    if (!user.tenant?.id) {
      return NextResponse.json({ success: false, error: 'Usuário não está associado a uma clínica' }, { status: 403 })
    }

    if (!await hasPermission(user, 'view_convenios')) {
      return NextResponse.json({ success: false, error: 'Sem permissão para visualizar convênios' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: Prisma.ConvenioWhereInput = {
      tenantId: user.tenant.id, // 🔒 CRÍTICO: Filtrar por tenant
    }

    if (!includeInactive) {
      where.ativo = true
    }

    if (status && ['ATIVO', 'INATIVO', 'SUSPENSO', 'EM_NEGOCIACAO'].includes(status)) {
      where.status = status as Prisma.EnumStatusConvenioFilter
    }

    if (search) {
      where.OR = [
        { razao_social: { contains: search, mode: 'insensitive' } },
        { nome_fantasia: { contains: search, mode: 'insensitive' } },
        { cnpj: { contains: search } },
      ]
    }

    const convenios = await prisma.convenio.findMany({
      where,
      include: {
        _count: {
          select: {
            tabelas: { where: { ativo: true } },
            anexos: true,
            historicos: true,
          },
        },
      },
      orderBy: { razao_social: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: convenios,
      total: convenios.length,
      tenant: { id: user.tenant.id, name: user.tenant.name },
    })
  } catch (error) {
    console.error('Erro ao buscar convênios:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    }

    if (!user.tenant?.id) {
      return NextResponse.json({ success: false, error: 'Usuário não está associado a uma clínica' }, { status: 403 })
    }

    if (!await hasPermission(user, 'create_convenios')) {
      return NextResponse.json({ success: false, error: 'Sem permissão para criar convênios' }, { status: 403 })
    }

    const body = await request.json()
    const {
      razao_social, nome_fantasia, cnpj, registro_ans, tipo, status,
      telefone, email, site, endereco, contato_nome, contato_telefone, contato_email,
      prazo_pagamento_dias, dia_fechamento, dia_entrega_guias, percentual_repasse,
      data_inicio_contrato, data_fim_contrato, data_ultimo_reajuste, observacoes,
    } = body

    if (!razao_social || !cnpj || !tipo) {
      return NextResponse.json({ success: false, error: 'Razão social, CNPJ e tipo são obrigatórios' }, { status: 400 })
    }

    // Validar CNPJ único por tenant
    const cnpjLimpo = cnpj.replace(/\D/g, '')
    const existente = await prisma.convenio.findFirst({
      where: { tenantId: user.tenant.id, cnpj: cnpjLimpo },
    })

    if (existente) {
      return NextResponse.json({ success: false, error: 'Já existe um convênio com este CNPJ' }, { status: 409 })
    }

    const convenio = await prisma.convenio.create({
      data: {
        tenantId: user.tenant.id,
        razao_social,
        nome_fantasia: nome_fantasia || null,
        cnpj: cnpjLimpo,
        registro_ans: registro_ans || null,
        tipo,
        status: status || 'EM_NEGOCIACAO',
        telefone: telefone || null,
        email: email || null,
        site: site || null,
        endereco: endereco || null,
        contato_nome: contato_nome || null,
        contato_telefone: contato_telefone || null,
        contato_email: contato_email || null,
        prazo_pagamento_dias: prazo_pagamento_dias ?? null,
        dia_fechamento: dia_fechamento ?? null,
        dia_entrega_guias: dia_entrega_guias ?? null,
        percentual_repasse: percentual_repasse ?? null,
        data_inicio_contrato: data_inicio_contrato ? new Date(data_inicio_contrato) : null,
        data_fim_contrato: data_fim_contrato ? new Date(data_fim_contrato) : null,
        data_ultimo_reajuste: data_ultimo_reajuste ? new Date(data_ultimo_reajuste) : null,
        observacoes: observacoes || null,
      },
    })

    // Registrar histórico automático
    await prisma.convenioHistorico.create({
      data: {
        convenioId: convenio.id,
        tenantId: user.tenant.id,
        tipo: 'CRIACAO',
        titulo: 'Convênio criado',
        descricao: `Convênio "${razao_social}" criado no sistema.`,
        usuario_nome: user.name || user.email,
        usuario_id: user.id,
        dados_novos: convenio as unknown as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({ success: true, data: convenio }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar convênio:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    }

    if (!user.tenant?.id) {
      return NextResponse.json({ success: false, error: 'Usuário não está associado a uma clínica' }, { status: 403 })
    }

    if (!await hasPermission(user, 'edit_convenios')) {
      return NextResponse.json({ success: false, error: 'Sem permissão para editar convênios' }, { status: 403 })
    }

    const body = await request.json()
    const { id, ...dados } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID do convênio é obrigatório' }, { status: 400 })
    }

    // Verificar ownership
    const convenioExistente = await prisma.convenio.findFirst({
      where: { id, tenantId: user.tenant.id },
    })

    if (!convenioExistente) {
      return NextResponse.json({ success: false, error: 'Convênio não encontrado' }, { status: 404 })
    }

    // Validar CNPJ único por tenant (se mudou)
    if (dados.cnpj) {
      const cnpjLimpo = dados.cnpj.replace(/\D/g, '')
      const conflito = await prisma.convenio.findFirst({
        where: { tenantId: user.tenant.id, cnpj: cnpjLimpo, NOT: { id } },
      })
      if (conflito) {
        return NextResponse.json({ success: false, error: 'Já existe outro convênio com este CNPJ' }, { status: 409 })
      }
      dados.cnpj = cnpjLimpo
    }

    // Converter datas
    if (dados.data_inicio_contrato) dados.data_inicio_contrato = new Date(dados.data_inicio_contrato)
    if (dados.data_fim_contrato) dados.data_fim_contrato = new Date(dados.data_fim_contrato)
    if (dados.data_ultimo_reajuste) dados.data_ultimo_reajuste = new Date(dados.data_ultimo_reajuste)

    // Limpar campos vazios para null
    const camposOpcionais = ['nome_fantasia', 'registro_ans', 'telefone', 'email', 'site', 'endereco',
      'contato_nome', 'contato_telefone', 'contato_email', 'versao_tiss', 'codigo_operadora',
      'codigo_prestador', 'numero_lote_padrao', 'observacoes']
    for (const campo of camposOpcionais) {
      if (campo in dados && dados[campo] === '') dados[campo] = null
    }

    const convenioAtualizado = await prisma.convenio.update({
      where: { id },
      data: dados,
    })

    // Registrar histórico automático
    await prisma.convenioHistorico.create({
      data: {
        convenioId: id,
        tenantId: user.tenant.id,
        tipo: 'ALTERACAO_DADOS',
        titulo: 'Dados atualizados',
        descricao: `Dados do convênio "${convenioAtualizado.razao_social}" foram atualizados.`,
        usuario_nome: user.name || user.email,
        usuario_id: user.id,
        dados_anteriores: convenioExistente as unknown as Prisma.InputJsonValue,
        dados_novos: convenioAtualizado as unknown as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({ success: true, data: convenioAtualizado })
  } catch (error) {
    console.error('Erro ao atualizar convênio:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    }

    if (!user.tenant?.id) {
      return NextResponse.json({ success: false, error: 'Usuário não está associado a uma clínica' }, { status: 403 })
    }

    if (!await hasPermission(user, 'delete_convenios')) {
      return NextResponse.json({ success: false, error: 'Sem permissão para excluir convênios' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID do convênio é obrigatório' }, { status: 400 })
    }

    // Verificar ownership
    const convenio = await prisma.convenio.findFirst({
      where: { id, tenantId: user.tenant.id },
    })

    if (!convenio) {
      return NextResponse.json({ success: false, error: 'Convênio não encontrado' }, { status: 404 })
    }

    // Soft delete
    await prisma.convenio.update({
      where: { id },
      data: { ativo: false },
    })

    // Registrar histórico automático
    await prisma.convenioHistorico.create({
      data: {
        convenioId: id,
        tenantId: user.tenant.id,
        tipo: 'SUSPENSAO',
        titulo: 'Convênio desativado',
        descricao: `Convênio "${convenio.razao_social}" foi desativado no sistema.`,
        usuario_nome: user.name || user.email,
        usuario_id: user.id,
      },
    })

    return NextResponse.json({ success: true, message: 'Convênio desativado com sucesso' })
  } catch (error) {
    console.error('Erro ao desativar convênio:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
