import { z } from 'zod'

// ─── Constantes ───────────────────────────────────────────────────────────────

export const ESPECIALIDADES = [
  'Fonoaudiologia',
  'Terapia Ocupacional',
  'Psicologia',
  'Fisioterapia',
  'Neuropsicologia',
  'Psicopedagogia',
  'Musicoterapia',
  'Educação Física Adaptada',
  'Nutrição',
  'Medicina',
  'Outros',
] as const

export type Especialidade = typeof ESPECIALIDADES[number]

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Procedimento {
  id: string
  tenantId: string
  nome: string
  descricao: string | null
  codigo: string | null
  valor: number | null
  valor_particular: number | null
  duracao_padrao: number | null
  tempo_minimo: number | null
  tempo_maximo: number | null
  especialidade: string | null
  requer_autorizacao: boolean
  observacoes: string | null
  cor: string | null
  icone: string | null
  ativo: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    agendamentos: number
    tabelasConvenio: number
    regrasRepasse: number
    pacoteProcedimentos: number
  }
}

// ─── Zod Schema ───────────────────────────────────────────────────────────────

export const procedimentoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  codigo: z.string().optional().nullable(),
  descricao: z.string().optional().nullable(),
  valor: z.number().positive('Deve ser positivo').optional().nullable(),
  valor_particular: z.number().positive('Deve ser positivo').optional().nullable(),
  duracao_padrao: z.number().int().positive('Deve ser positivo').optional().nullable(),
  tempo_minimo: z.number().int().positive('Deve ser positivo').optional().nullable(),
  tempo_maximo: z.number().int().positive('Deve ser positivo').optional().nullable(),
  especialidade: z.string().optional().nullable(),
  requer_autorizacao: z.boolean().optional(),
  observacoes: z.string().optional().nullable(),
  cor: z.string().optional().nullable(),
  icone: z.string().optional().nullable(),
})

export type ProcedimentoFormData = z.infer<typeof procedimentoSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatDuracao(minutos: number | null): string {
  if (!minutos) return '—'
  if (minutos < 60) return `${minutos} min`
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function formatBRL(valor: number | null): string {
  if (valor === null || valor === undefined) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}
