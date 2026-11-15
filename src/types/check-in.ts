import { StatusAgendamento, STATUS_AGENDAMENTO_LABELS, type Agendamento } from '@/types/agendamento'

export type CheckInAction = 'confirmar' | 'checkin' | 'iniciar' | 'finalizar' | 'no-show' | 'reabrir'

// Reutiliza o mapa centralizado de labels
export const STATUS_LABELS = STATUS_AGENDAMENTO_LABELS

export const STATUS_BADGE: Record<StatusAgendamento, string> = {
  [StatusAgendamento.AGENDADO]:       'bg-info-soft text-info-ink',
  [StatusAgendamento.CONFIRMADO]:     'bg-success-soft text-success-ink',
  [StatusAgendamento.EM_ATENDIMENTO]: 'bg-warning-soft text-warning-ink',
  [StatusAgendamento.ATENDIDO]:       'bg-violet-soft text-violet-ink',
  [StatusAgendamento.FALTOU]:         'bg-surface-sunken text-ink-3',
  [StatusAgendamento.CANCELADO]:      'bg-danger-soft text-danger-ink',
}

export interface AgendamentoCheckIn extends Agendamento {
  paciente: {
    id: string
    nome: string
    foto?: string | null
    cor_agenda?: string | null
    telefone?: string | null
    convenioId?: string | null
    convenio?: { id: string; razao_social: string; nome_fantasia?: string | null } | null
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
