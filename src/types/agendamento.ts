// Tipos para o sistema de agendamentos

export enum StatusAgendamento {
  AGENDADO = 'AGENDADO',
  CONFIRMADO = 'CONFIRMADO',
  EM_ATENDIMENTO = 'EM_ATENDIMENTO',
  ATENDIDO = 'ATENDIDO',
  FALTOU = 'FALTOU',
  CANCELADO = 'CANCELADO',
}

export const STATUS_AGENDAMENTO_LABELS: Record<StatusAgendamento, string> = {
  [StatusAgendamento.AGENDADO]:       'Agendado',
  [StatusAgendamento.CONFIRMADO]:     'Confirmado',
  [StatusAgendamento.EM_ATENDIMENTO]: 'Em Atendimento',
  [StatusAgendamento.ATENDIDO]:       'Finalizado',
  [StatusAgendamento.FALTOU]:         'Faltou',
  [StatusAgendamento.CANCELADO]:      'Cancelado',
}

export const STATUS_AGENDAMENTO_BADGE: Record<StatusAgendamento, string> = {
  [StatusAgendamento.AGENDADO]:       'bg-blue-50 border-blue-300 text-blue-800',
  [StatusAgendamento.CONFIRMADO]:     'bg-green-50 border-green-300 text-green-800',
  [StatusAgendamento.EM_ATENDIMENTO]: 'bg-amber-50 border-amber-300 text-amber-800',
  [StatusAgendamento.ATENDIDO]:       'bg-purple-50 border-purple-300 text-purple-800',
  [StatusAgendamento.FALTOU]:         'bg-gray-50 border-gray-300 text-gray-800',
  [StatusAgendamento.CANCELADO]:      'bg-red-50 border-red-300 text-red-800',
}

export interface Agendamento {
  id: string
  pacienteId: string
  profissionalId: string
  data_hora: Date | string
  horario_fim: Date | string
  duracao_minutos?: number // Campo legado, calculado automaticamente
  salaId: string
  sala?: string | null
  procedimentoId?: string | null
  status: StatusAgendamento
  observacoes?: string | null
  // Check-in / fluxo operacional
  confirmado_em?: string | null
  confirmado_por?: string | null
  hora_chegada?: string | null
  checkin_por?: string | null
  hora_inicio_real?: string | null
  hora_fim_real?: string | null
  motivo_falta?: string | null
  createdAt: Date | string
  updatedAt: Date | string

  // Relacionamentos populados
  paciente?: {
    id: string
    nome: string
    foto?: string | null
    cor_agenda?: string | null
    telefone?: string | null
  }
  profissional?: {
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

export interface CreateAgendamentoInput {
  pacienteId: string
  profissionalId: string
  data_hora: Date | string
  horario_fim: Date | string
  sala: string
  procedimento?: string
  status?: StatusAgendamento
  observacoes?: string
}

export interface UpdateAgendamentoInput {
  pacienteId?: string
  profissionalId?: string
  data_hora?: Date | string
  horario_fim?: Date | string
  sala?: string
  procedimento?: string
  status?: StatusAgendamento
  observacoes?: string
}

export interface AgendamentoFilters {
  profissionalId?: string
  pacienteId?: string
  status?: StatusAgendamento
  data_inicio?: Date | string
  data_fim?: Date | string
  sala?: string
}

// Slot de horário para a agenda
export interface TimeSlot {
  time: string // "08:00", "08:30", etc
  hour: number // 8
  minute: number // 0
}

// Agendamento formatado para exibição na grade
export interface AgendamentoSlot {
  agendamento: Agendamento
  startSlot: number // índice do slot inicial
  slotsOccupied: number // quantos slots ocupa (duracao / 30)
}
