import { z } from 'zod'

// ─── Enums e Labels ───────────────────────────────────────────────────────────

export const TIPO_REPASSE_LABELS: Record<string, string> = {
  PERCENTUAL: 'Percentual (%)',
  VALOR_FIXO: 'Valor Fixo (R$)',
  VALOR_HORA: 'Valor por Hora (R$/h)',
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface RegraRepasse {
  id: string
  tenantId: string
  profissionalId: string
  convenioId: string | null
  procedimentoId: string | null

  tipo: 'PERCENTUAL' | 'VALOR_FIXO' | 'VALOR_HORA'
  valor: number
  descricao: string | null

  vigencia_inicio: string
  vigencia_fim: string | null
  prioridade: number
  ativo: boolean

  createdAt: string
  updatedAt: string

  // Include opcionais
  convenio?: { id: string; razao_social: string; nome_fantasia: string | null } | null
  procedimento?: { id: string; nome: string; codigo: string | null } | null
}

export interface RegraRepasseHistorico {
  id: string
  regraRepasseId: string
  tenantId: string
  tipo_alteracao: string
  descricao: string
  dados_anteriores: Record<string, unknown> | null
  dados_novos: Record<string, unknown> | null
  usuario_nome: string
  usuario_id: string
  createdAt: string
}

export interface ProfissionalDetalhe {
  id: string
  tenantId: string
  nome: string
  cpf: string | null
  telefone: string | null
  email: string | null
  especialidade: string
  registro_profissional: string | null
  salas_acesso: string[]
  ativo: boolean
  usuarioId: string | null
  createdAt: string
  updatedAt: string

  _count: {
    agendamentos: number
    pacientes: number
    prontuarios: number
    regrasRepasse: number
  }
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

export const regraRepasseSchema = z.object({
  tipo: z.enum(['PERCENTUAL', 'VALOR_FIXO', 'VALOR_HORA'] as const),
  valor: z.number().positive('Valor deve ser positivo').optional(),
  descricao: z.string().optional().nullable(),
  convenioId: z.string().optional().nullable(),
  procedimentoId: z.string().optional().nullable(),
  vigencia_inicio: z.string().min(1, 'Data de início é obrigatória'),
  vigencia_fim: z.string().optional().nullable(),
  prioridade: z.number().int().min(0).max(100).optional(),
})
  .refine(
    (data) => {
      if (!data.valor) return false
      if (data.tipo === 'PERCENTUAL' && data.valor > 100) return false
      return true
    },
    { message: 'Valor inválido para o tipo selecionado', path: ['valor'] }
  )

export type RegraRepasseFormData = z.infer<typeof regraRepasseSchema>
