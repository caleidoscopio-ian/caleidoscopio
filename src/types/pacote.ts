import { z } from 'zod'

// ─── Labels ───────────────────────────────────────────────────────────────────

export const TIPO_PACOTE_LABELS: Record<string, string> = {
  SESSOES_ILIMITADAS: 'Sessões de um procedimento',
  COMBO_MISTO: 'Combo misto',
  AVALIACAO_COMPLETA: 'Avaliação completa',
  OUTROS: 'Outros',
}

export const STATUS_PACOTE_LABELS: Record<string, string> = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  ESGOTADO: 'Esgotado',
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface PacoteProcedimentoItem {
  id: string
  pacoteId: string
  procedimentoId: string
  quantidade: number
  observacoes: string | null
  procedimento?: {
    id: string
    nome: string
    valor: number | null
    duracao_padrao: number | null
    cor: string | null
    icone: string | null
  }
}

export interface Pacote {
  id: string
  tenantId: string
  nome: string
  descricao: string | null
  tipo: 'SESSOES_ILIMITADAS' | 'COMBO_MISTO' | 'AVALIACAO_COMPLETA' | 'OUTROS'
  status: 'ATIVO' | 'INATIVO' | 'ESGOTADO'
  valor_total: number
  valor_particular: number | null
  valor_original: number | null
  total_sessoes: number | null
  validade_dias: number | null
  cor: string | null
  icone: string | null
  convenioId: string | null
  ativo: boolean
  observacoes: string | null
  createdAt: string
  updatedAt: string
  convenio?: { id: string; razao_social: string; nome_fantasia: string | null } | null
  procedimentos?: PacoteProcedimentoItem[]
  _count?: { procedimentos: number }
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

export const pacoteItemSchema = z.object({
  procedimentoId: z.string().min(1, 'Procedimento obrigatório'),
  quantidade: z.number().int().positive('Quantidade deve ser positiva'),
  observacoes: z.string().optional().nullable(),
})

export const pacoteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional().nullable(),
  tipo: z.enum(['SESSOES_ILIMITADAS', 'COMBO_MISTO', 'AVALIACAO_COMPLETA', 'OUTROS'] as const),
  valor_total: z.number().positive('Valor total deve ser positivo'),
  valor_particular: z.number().positive().optional().nullable(),
  total_sessoes: z.number().int().positive().optional().nullable(),
  validade_dias: z.number().int().positive().optional().nullable(),
  cor: z.string().optional().nullable(),
  icone: z.string().optional().nullable(),
  convenioId: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  procedimentos: z.array(pacoteItemSchema).min(1, 'Adicione ao menos um procedimento'),
})

export type PacoteFormData = z.infer<typeof pacoteSchema>
