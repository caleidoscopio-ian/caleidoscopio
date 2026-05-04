import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'
import { StatusAgendamento } from '@/types/agendamento'
import type { CheckInAction } from '@/types/check-in'

// Transições de status permitidas por ação
const TRANSICOES: Record<CheckInAction, StatusAgendamento[]> = {
  confirmar:  [StatusAgendamento.AGENDADO],
  checkin:    [StatusAgendamento.AGENDADO, StatusAgendamento.CONFIRMADO],
  iniciar:    [StatusAgendamento.CONFIRMADO],
  finalizar:  [StatusAgendamento.EM_ATENDIMENTO],
  'no-show':  [StatusAgendamento.AGENDADO, StatusAgendamento.CONFIRMADO],
  reabrir:    [StatusAgendamento.FALTOU, StatusAgendamento.CANCELADO, StatusAgendamento.ATENDIDO],
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Usuário sem clínica associada' }, { status: 403 })
    if (!await hasPermission(user, 'edit_schedule')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const body = await request.json()
    const { action, motivo } = body as { action: CheckInAction; motivo?: string }

    const acoes: CheckInAction[] = ['confirmar', 'checkin', 'iniciar', 'finalizar', 'no-show', 'reabrir']
    if (!action || !acoes.includes(action)) {
      return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 })
    }

    // Buscar agendamento verificando tenant
    const agendamento = await prisma.agendamento.findFirst({
      where: { id, paciente: { tenantId: user.tenant.id } },
    })

    if (!agendamento) {
      return NextResponse.json({ success: false, error: 'Agendamento não encontrado' }, { status: 404 })
    }

    // Validar transição permitida
    const statusPermitidos = TRANSICOES[action]
    if (!statusPermitidos.includes(agendamento.status as StatusAgendamento)) {
      return NextResponse.json(
        { success: false, error: `Ação "${action}" não permitida para status "${agendamento.status}"` },
        { status: 422 }
      )
    }

    const now = new Date()

    // Montar dados do update por ação
    type AgendamentoUpdate = {
      status?: StatusAgendamento
      confirmado_em?: Date | null
      confirmado_por?: string | null
      hora_chegada?: Date | null
      checkin_por?: string | null
      hora_inicio_real?: Date | null
      hora_fim_real?: Date | null
      motivo_falta?: string | null
    }

    let updateData: AgendamentoUpdate = {}

    switch (action) {
      case 'confirmar':
        updateData = { status: StatusAgendamento.CONFIRMADO, confirmado_em: now, confirmado_por: user.id }
        break
      case 'checkin':
        updateData = {
          status: StatusAgendamento.CONFIRMADO,
          hora_chegada: now,
          checkin_por: user.id,
          // Confirmar automaticamente se ainda AGENDADO
          ...(agendamento.status === StatusAgendamento.AGENDADO ? { confirmado_em: now, confirmado_por: user.id } : {}),
        }
        break
      case 'iniciar':
        updateData = { status: StatusAgendamento.EM_ATENDIMENTO, hora_inicio_real: now }
        break
      case 'finalizar':
        updateData = { status: StatusAgendamento.ATENDIDO, hora_fim_real: now }
        break
      case 'no-show':
        updateData = { status: StatusAgendamento.FALTOU, motivo_falta: motivo || null }
        break
      case 'reabrir':
        updateData = { status: StatusAgendamento.CONFIRMADO, motivo_falta: null }
        break
    }

    const atualizado = await prisma.agendamento.update({
      where: { id },
      data: updateData,
      include: {
        paciente: { select: { id: true, nome: true, foto: true, cor_agenda: true, telefone: true } },
        profissional: { select: { id: true, nome: true, especialidade: true, email: true } },
        salaRelacao: { select: { id: true, nome: true, cor: true } },
        procedimento: { select: { id: true, nome: true, codigo: true, cor: true } },
      },
    })

    return NextResponse.json({ success: true, data: atualizado })
  } catch (error) {
    console.error('Erro ao executar ação de check-in:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
