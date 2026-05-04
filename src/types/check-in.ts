import { StatusAgendamento, STATUS_AGENDAMENTO_LABELS, type Agendamento } from '@/types/agendamento'

export type CheckInAction = 'confirmar' | 'checkin' | 'iniciar' | 'finalizar' | 'no-show' | 'reabrir'

// Reutiliza o mapa centralizado de labels
export const STATUS_LABELS = STATUS_AGENDAMENTO_LABELS

export const STATUS_BADGE: Record<StatusAgendamento, string> = {
  [StatusAgendamento.AGENDADO]:       'bg-blue-100 text-blue-700 border-blue-200',
  [StatusAgendamento.CONFIRMADO]:     'bg-green-100 text-green-700 border-green-200',
  [StatusAgendamento.EM_ATENDIMENTO]: 'bg-amber-100 text-amber-700 border-amber-200',
  [StatusAgendamento.ATENDIDO]:       'bg-purple-100 text-purple-700 border-purple-200',
  [StatusAgendamento.FALTOU]:         'bg-gray-100 text-gray-700 border-gray-200',
  [StatusAgendamento.CANCELADO]:      'bg-red-100 text-red-700 border-red-200',
}

export interface AgendamentoCheckIn extends Agendamento {
  paciente: {
    id: string
    nome: string
    foto?: string | null
    cor_agenda?: string | null
    telefone?: string | null
  }
  profissional: {
    id: string
    nome: string
    especialidade: string
    email?: string | null
  }
  salaRelacao?: {
    id: string
    nome: string
    cor?: string | null
  } | null
  procedimento?: {
    id: string
    nome: string
    codigo?: string | null
    cor?: string | null
  } | null
}

/** Retorna minutos de atraso (positivo = atrasado, negativo = adiantado/no horário) */
export function calcularAtrasoMinutos(ag: AgendamentoCheckIn): number {
  const inicio = new Date(ag.data_hora).getTime()
  const referencia = ag.hora_chegada
    ? new Date(ag.hora_chegada).getTime()
    : Date.now()
  return Math.floor((referencia - inicio) / 60000)
}

/** Ações disponíveis por status */
export const ACOES_POR_STATUS: Record<StatusAgendamento, CheckInAction[]> = {
  [StatusAgendamento.AGENDADO]:       ['confirmar', 'checkin', 'no-show'],
  [StatusAgendamento.CONFIRMADO]:     ['checkin', 'iniciar', 'no-show'],
  [StatusAgendamento.EM_ATENDIMENTO]: ['finalizar'],
  [StatusAgendamento.ATENDIDO]:       ['reabrir'],
  [StatusAgendamento.FALTOU]:         ['reabrir'],
  [StatusAgendamento.CANCELADO]:      ['reabrir'],
}

export const ACAO_LABELS: Record<CheckInAction, string> = {
  confirmar:  'Confirmar',
  checkin:    'Check-in',
  iniciar:    'Iniciar',
  finalizar:  'Finalizar',
  'no-show':  'No-show',
  reabrir:    'Reabrir',
}
