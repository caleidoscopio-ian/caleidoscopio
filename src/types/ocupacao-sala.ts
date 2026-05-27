export type StatusAgendamento =
  | 'AGENDADO'
  | 'CONFIRMADO'
  | 'EM_ATENDIMENTO'
  | 'ATENDIDO'
  | 'FALTOU'
  | 'CANCELADO'

export const STATUS_LABEL: Record<StatusAgendamento, string> = {
  AGENDADO: 'Agendado',
  CONFIRMADO: 'Confirmado',
  EM_ATENDIMENTO: 'Em atendimento',
  ATENDIDO: 'Atendido',
  FALTOU: 'Faltou',
  CANCELADO: 'Cancelado',
}

export const STATUS_COR: Record<StatusAgendamento, string> = {
  AGENDADO: '#3b82f6',
  CONFIRMADO: '#10b981',
  EM_ATENDIMENTO: '#f59e0b',
  ATENDIDO: '#6b7280',
  FALTOU: '#ef4444',
  CANCELADO: '#9ca3af',
}

/** Status que indicam uso real da sala */
export const STATUS_OCUPADOS: StatusAgendamento[] = [
  'AGENDADO',
  'CONFIRMADO',
  'EM_ATENDIMENTO',
  'ATENDIDO',
]

export interface AgendamentoOcupacao {
  id: string
  data_hora: string
  horario_fim: string
  status: StatusAgendamento
  paciente: { id: string; nome: string } | null
  profissional: { id: string; nome: string; especialidade: string | null } | null
  procedimento: { id: string; nome: string; cor: string | null } | null
}

export interface SalaOcupacao {
  id: string
  nome: string
  cor: string | null
  capacidade: number | null
  filial: { id: string; nome: string; cor: string | null } | null
  agendamentos: AgendamentoOcupacao[]
}

export interface OcupacaoResponse {
  success: boolean
  data: SalaOcupacao[]
  total_salas: number
  total_agendamentos: number
  periodo: { inicio: string; fim: string }
}
