import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'
import { calcularMinutosDisponiveis, minutosAgendamento } from '@/lib/ocupacao'
import type { OcupacaoProfissional, OcupacaoResumo } from '@/types/ocupacao-profissional'

const STATUS_OCUPADOS = ['AGENDADO', 'CONFIRMADO', 'EM_ATENDIMENTO', 'ATENDIDO'] as const
const STATUS_FALTA = ['FALTOU'] as const
const STATUS_CANCELADO = ['CANCELADO'] as const

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Sem tenant' }, { status: 403 })
    if (!await hasPermission(user, 'view_schedule'))
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const dataInicioParam = searchParams.get('dataInicio')
    const dataFimParam = searchParams.get('dataFim')
    const filialIdParam = searchParams.get('filialId')
    const profissionalIdParam = searchParams.get('profissionalId')

    if (!dataInicioParam || !dataFimParam)
      return NextResponse.json({ success: false, error: 'dataInicio e dataFim são obrigatórios' }, { status: 400 })

    const dataInicio = new Date(dataInicioParam)
    const dataFim = new Date(dataFimParam)
    if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime()))
      return NextResponse.json({ success: false, error: 'Datas inválidas' }, { status: 400 })

    const diffDias = (dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDias > 60)
      return NextResponse.json({ success: false, error: 'Período máximo de 60 dias' }, { status: 400 })

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes((user.role ?? '').toUpperCase())
    const filialFiltro = !isAdmin ? (user.filialId ?? null) : (filialIdParam ?? null)

    // Buscar profissionais com suas grades
    const profissionaisDb = await prisma.profissional.findMany({
      where: {
        tenantId: user.tenant.id,
        ativo: true,
        ...(profissionalIdParam ? { id: profissionalIdParam } : {}),
        ...(filialFiltro ? {
          OR: [
            { filiais: { some: { filialId: filialFiltro } } },
            { filiais: { none: {} } },
          ],
        } : {}),
      },
      select: {
        id: true,
        nome: true,
        especialidade: true,
        grades: {
          where: { tenantId: user.tenant.id, ativo: true },
          select: { diaSemana: true, hora_inicio: true, hora_fim: true, filialId: true, ativo: true },
        },
      },
      orderBy: { nome: 'asc' },
    })

    if (profissionaisDb.length === 0) {
      return NextResponse.json({
        success: true,
        periodo: { inicio: dataInicio.toISOString(), fim: dataFim.toISOString() },
        profissionais: [],
        resumo: { taxa_media: 0, total_agendamentos: 0, horas_disponiveis: 0, horas_agendadas: 0, atendendo_agora: 0, profissionais_sem_grade: 0 },
      })
    }

    const profIds = profissionaisDb.map((p) => p.id)

    // Buscar todos os agendamentos do período de uma vez
    // Filtra por data_hora dentro do intervalo (início e fim do dia)
    const agendamentosDb = await prisma.agendamento.findMany({
      where: {
        profissionalId: { in: profIds },
        paciente: { tenantId: user.tenant.id },
        data_hora: { gte: dataInicio, lte: dataFim },
      },
      select: {
        id: true,
        profissionalId: true,
        data_hora: true,
        horario_fim: true,
        status: true,
      },
    })

    // Agrupar por profissional
    const agsPorProf = new Map<string, typeof agendamentosDb>()
    for (const ag of agendamentosDb) {
      const lista = agsPorProf.get(ag.profissionalId) ?? []
      lista.push(ag)
      agsPorProf.set(ag.profissionalId, lista)
    }

    const profissionais: OcupacaoProfissional[] = profissionaisDb.map((prof) => {
      const ags = agsPorProf.get(prof.id) ?? []
      const tem_grade = prof.grades.length > 0

      const minDisp = tem_grade
        ? calcularMinutosDisponiveis(prof.grades, dataInicio, dataFim, filialFiltro)
        : 0

      let minAgendados = 0
      let totalAgendamentos = 0
      let faltas = 0
      let cancelamentos = 0
      let atendendo_agora = false

      for (const ag of ags) {
        const statusStr = ag.status as string
        if ((STATUS_OCUPADOS as readonly string[]).includes(statusStr)) {
          minAgendados += minutosAgendamento(ag.data_hora, ag.horario_fim)
          totalAgendamentos++
          // Atendendo agora: EM_ATENDIMENTO é um estado operacional ao vivo —
          // a sessão está em curso por definição, independente do horário agendado.
          if (statusStr === 'EM_ATENDIMENTO') {
            atendendo_agora = true
          }
        } else if ((STATUS_FALTA as readonly string[]).includes(statusStr)) {
          faltas++
        } else if ((STATUS_CANCELADO as readonly string[]).includes(statusStr)) {
          cancelamentos++
        }
      }

      // Sem grade → taxa 0 (sem denominador); tem_grade=false é o sinalizador real
      const taxa = minDisp > 0 ? minAgendados / minDisp : 0

      return {
        id: prof.id,
        nome: prof.nome,
        especialidade: prof.especialidade,
        minutos_disponiveis: minDisp,
        minutos_agendados: minAgendados,
        total_agendamentos: totalAgendamentos,
        taxa_ocupacao: taxa,
        faltas,
        cancelamentos,
        atendendo_agora,
        tem_grade,
      }
    })

    // Resumo — taxa média e horas apenas de quem tem grade (denominador válido)
    const comGrade = profissionais.filter((p) => p.tem_grade)
    const taxa_media = comGrade.length > 0
      ? comGrade.reduce((s, p) => s + p.taxa_ocupacao, 0) / comGrade.length
      : 0

    const resumo: OcupacaoResumo = {
      taxa_media,
      total_agendamentos: profissionais.reduce((s, p) => s + p.total_agendamentos, 0),
      // Horas disponíveis e agendadas: só para quem tem grade (comparação válida)
      horas_disponiveis: Math.round(comGrade.reduce((s, p) => s + p.minutos_disponiveis, 0) / 60),
      horas_agendadas: Math.round(comGrade.reduce((s, p) => s + p.minutos_agendados, 0) / 60),
      atendendo_agora: profissionais.filter((p) => p.atendendo_agora).length,
      profissionais_sem_grade: profissionais.filter((p) => !p.tem_grade).length,
    }

    return NextResponse.json({
      success: true,
      periodo: { inicio: dataInicio.toISOString(), fim: dataFim.toISOString() },
      profissionais,
      resumo,
    })
  } catch (error) {
    console.error('Erro ao calcular ocupação:', error)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
