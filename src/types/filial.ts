export interface Filial {
  id: string
  tenantId: string
  nome: string
  razao_social?: string | null
  cnpj?: string | null
  cnes?: string | null
  tipo_estabelecimento?: string | null
  cidade?: string | null
  endereco?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  estado?: string | null
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
  razao_social?: string
  cnpj?: string
  cnes?: string
  tipo_estabelecimento?: string
  cidade?: string
  endereco?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  estado?: string
  telefone?: string
  email?: string
  cor?: string
}

export interface UpdateFilialInput extends Partial<CreateFilialInput> {
  ativo?: boolean
}
