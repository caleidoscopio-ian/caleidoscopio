export interface Filial {
  id: string
  tenantId: string
  nome: string
  cidade?: string | null
  endereco?: string | null
  telefone?: string | null
  email?: string | null
  cor?: string | null
  ativo: boolean
  createdAt: string | Date
  updatedAt: string | Date
  _count?: {
    salas: number
    pacientes: number
    profissionais: number
    convenios: number
    procedimentos: number
  }
}

export interface ProfissionalFilialItem {
  profissionalId: string
  filialId: string
  principal: boolean
  profissional: {
    id: string
    nome: string
    especialidade: string
    email?: string | null
  }
}

export interface CreateFilialInput {
  nome: string
  cidade?: string
  endereco?: string
  telefone?: string
  email?: string
  cor?: string
}

export interface UpdateFilialInput extends Partial<CreateFilialInput> {
  ativo?: boolean
}
