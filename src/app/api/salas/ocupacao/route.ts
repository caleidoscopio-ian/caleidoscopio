import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'
import { Prisma } from '@prisma/client'

const STATUS_OCUPADOS = ['AGENDADO', 'CONFIRMADO', 'EM_ATENDIMENTO', 'ATENDIDO'] as const
const STATUS_CANCELADOS = ['FALTOU', 'CANCELADO'] as const

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Sem tenant' }, { status: 403 })
    if (!await hasPermission(user, 'view_rooms'))
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')
    const filialId = searchParams.get('filialId')
    const salaId = searchParams.get('salaId')
    const incluirCancelados = searchParams.get('incluirCancelados') === 'true'

    if (!dataInicio || !dataFim) {
      return NextResponse.json({ success: false, error: 'dataInicio e dataFim são obrigatórios' }, { status: 400 })
    }

    const inicio = new Date(dataInicio)
    const fim = new Date(dataFim)
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
      return NextResponse.json({ success: false, error: 'Datas inválidas' }, { status: 400 })
    }

    // Limite de 35 dias para performance
    const diffDias = (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDias > 35) {
      return NextResponse.json({ success: false, error: 'Período máximo de 35 dias' }, { status: 400 })
    }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes((user.role ?? '').toUpperCase())

    // Filtro de filial: non-admin usa a filial do usuário
    const filialFiltro = !isAdmin
      ? (user.filialId ?? undefined)
      : (filialId ?? undefined)

    const salaWhere: Prisma.SalaWhereInput = {
      tenantId: user.tenant.id,
      ativo: true,
      ...(filialFiltro ? { filialId: filialFiltro } : {}),
      ...(salaId ? { id: salaId } : {}),
    }

    const salas = await prisma.sala.findMany({
      where: salaWhere,
      include: {
        filial: { select: { id: true, nome: true, cor: true } },
      },
      orderBy: [{ filial: { nome: 'asc' } }, { nome: 'asc' }],
    })

    if (salas.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total_salas: 0,
        total_agendamentos: 0,
        periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
      })
    }

    const salaIds = salas.map((s) => s.id)
    const statusFiltro = incluirCancelados
      ? [...STATUS_OCUPADOS, ...STATUS_CANCELADOS]
      : [...STATUS_OCUPADOS]

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        salaId: { in: salaIds },
        data_hora: { gte: inicio, lte: fim },
        status: { in: statusFiltro as unknown as Prisma.EnumStatusAgendamentoFilter['in'] },
      },
      include: {
        paciente: { select: { id: true, nome: true } },
        profissional: { select: { id: true, nome: true, especialidade: true } },
        procedimento: { select: { id: true, nome: true, cor: true } },
      },
      orderBy: { data_hora: 'asc' },
    })

    // Agrupar agendamentos por sala
    const agendamentosPorSala = new Map<string, typeof agendamentos>()
    for (const ag of agendamentos) {
      const lista = agendamentosPorSala.get(ag.salaId) ?? []
      lista.push(ag)
      agendamentosPorSala.set(ag.salaId, lista)
    }

    const data = salas.map((sala) => ({
      id: sala.id,
      nome: sala.nome,
      cor: sala.cor,
      capacidade: sala.capacidade,
      filial: sala.filial
        ? { id: sala.filial.id, nome: sala.filial.nome, cor: sala.filial.cor }
        : null,
      agendamentos: (agendamentosPorSala.get(sala.id) ?? []).map((ag) => ({
        id: ag.id,
        data_hora: ag.data_hora.toISOString(),
        horario_fim: ag.horario_fim.toISOString(),
        status: ag.status,
        paciente: ag.paciente ? { id: ag.paciente.id, nome: ag.paciente.nome } : null,
        profissional: ag.profissional
          ? { id: ag.profissional.id, nome: ag.profissional.nome, especialidade: ag.profissional.especialidade }
          : null,
        procedimento: ag.procedimento
          ? { id: ag.procedimento.id, nome: ag.procedimento.nome, cor: ag.procedimento.cor }
          : null,
      })),
    }))

    return NextResponse.json({
      success: true,
      data,
      total_salas: salas.length,
      total_agendamentos: agendamentos.length,
      periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
    })
  } catch (error) {
    console.error('Erro ao buscar ocupação de salas:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
