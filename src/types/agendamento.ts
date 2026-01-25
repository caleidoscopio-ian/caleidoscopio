// Tipos para o sistema de agendamentos

export enum StatusAgendamento {
  AGENDADO = 'AGENDADO',
  CONFIRMADO = 'CONFIRMADO',
  CANCELADO = 'CANCELADO',
  ATENDIDO = 'ATENDIDO',
  FALTOU = 'FALTOU'
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
