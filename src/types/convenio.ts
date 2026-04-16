import { z } from 'zod'

// ========================================
// Enums e Labels
// ========================================

export type StatusConvenio = 'ATIVO' | 'INATIVO' | 'SUSPENSO' | 'EM_NEGOCIACAO'
export type TipoConvenio = 'PLANO_SAUDE' | 'CONVENIO_EMPRESA' | 'CONVENIO_ESCOLAR' | 'CONVENIO_PUBLICO' | 'PARTICULAR_DESCONTO' | 'OUTROS'
export type TipoGuiaTISS = 'SP_SADT' | 'CONSULTA' | 'INTERNACAO' | 'HONORARIOS' | 'ODONTOLOGICA' | 'RESUMO_INTERNACAO'
export type RegimeAtendimento = 'AMBULATORIAL' | 'HOSPITALAR' | 'HOSPITAL_DIA' | 'DOMICILIAR'
export type CaraterAtendimento = 'ELETIVO' | 'URGENCIA_EMERGENCIA'
export type TipoConvenioAnexo = 'CONTRATO' | 'TABELA_VALORES' | 'ADITIVO' | 'CORRESPONDENCIA' | 'OUTROS'
export type TipoHistoricoConvenio = 'CRIACAO' | 'ALTERACAO_DADOS' | 'ALTERACAO_TABELA' | 'NEGOCIACAO' | 'REAJUSTE' | 'SUSPENSAO' | 'REATIVACAO' | 'OBSERVACAO'

export const STATUS_CONVENIO_LABELS: Record<StatusConvenio, string> = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  SUSPENSO: 'Suspenso',
  EM_NEGOCIACAO: 'Em Negociação',
}

export const TIPO_CONVENIO_LABELS: Record<TipoConvenio, string> = {
  PLANO_SAUDE: 'Plano de Saúde',
  CONVENIO_EMPRESA: 'Convênio Empresa',
  CONVENIO_ESCOLAR: 'Convênio Escolar',
  CONVENIO_PUBLICO: 'Convênio Público',
  PARTICULAR_DESCONTO: 'Particular com Desconto',
  OUTROS: 'Outros',
}

export const TIPO_GUIA_TISS_LABELS: Record<TipoGuiaTISS, string> = {
  SP_SADT: 'SP/SADT',
  CONSULTA: 'Consulta',
  INTERNACAO: 'Internação',
  HONORARIOS: 'Honorários',
  ODONTOLOGICA: 'Odontológica',
  RESUMO_INTERNACAO: 'Resumo de Internação',
}

export const REGIME_ATENDIMENTO_LABELS: Record<RegimeAtendimento, string> = {
  AMBULATORIAL: 'Ambulatorial',
  HOSPITALAR: 'Hospitalar',
  HOSPITAL_DIA: 'Hospital Dia',
  DOMICILIAR: 'Domiciliar',
}

export const CARATER_ATENDIMENTO_LABELS: Record<CaraterAtendimento, string> = {
  ELETIVO: 'Eletivo',
  URGENCIA_EMERGENCIA: 'Urgência/Emergência',
}

export const TIPO_CONVENIO_ANEXO_LABELS: Record<TipoConvenioAnexo, string> = {
  CONTRATO: 'Contrato',
  TABELA_VALORES: 'Tabela de Valores',
  ADITIVO: 'Aditivo',
  CORRESPONDENCIA: 'Correspondência',
  OUTROS: 'Outros',
}

export const TIPO_HISTORICO_LABELS: Record<TipoHistoricoConvenio, string> = {
  CRIACAO: 'Criação',
  ALTERACAO_DADOS: 'Alteração de Dados',
  ALTERACAO_TABELA: 'Alteração de Tabela',
  NEGOCIACAO: 'Negociação',
  REAJUSTE: 'Reajuste',
  SUSPENSAO: 'Suspensão',
  REATIVACAO: 'Reativação',
  OBSERVACAO: 'Observação',
}

// ========================================
// Interfaces
// ========================================

export interface Convenio {
  id: string
  tenantId: string
  razao_social: string
  nome_fantasia: string | null
  cnpj: string
  registro_ans: string | null
  tipo: TipoConvenio
  status: StatusConvenio
  telefone: string | null
  email: string | null
  site: string | null
  endereco: string | null
  contato_nome: string | null
  contato_telefone: string | null
  contato_email: string | null
  prazo_pagamento_dias: number | null
  dia_fechamento: number | null
  dia_entrega_guias: number | null
  percentual_repasse: number | null
  versao_tiss: string | null
  tipo_guia_padrao: TipoGuiaTISS | null
  regime_atendimento: RegimeAtendimento | null
  carater_atendimento: CaraterAtendimento | null
  codigo_operadora: string | null
  codigo_prestador: string | null
  numero_lote_padrao: string | null
  data_inicio_contrato: string | null
  data_fim_contrato: string | null
  data_ultimo_reajuste: string | null
  observacoes: string | null
  ativo: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    tabelas: number
    anexos: number
    historicos: number
  }
}

export interface ConvenioTabela {
  id: string
  convenioId: string
  tenantId: string
  procedimentoId: string | null
  codigo_procedimento: string
  nome_procedimento: string
  codigo_tiss: string | null
  valor_convenio: number
  valor_particular: number | null
  valor_co_participacao: number | null
  tipo_guia: TipoGuiaTISS | null
  tipo_tabela: string | null
  grau_participacao: string | null
  vigencia_inicio: string | null
  vigencia_fim: string | null
  ativo: boolean
  createdAt: string
  updatedAt: string
}

export interface ConvenioAnexo {
  id: string
  convenioId: string
  tenantId: string
  tipo: TipoConvenioAnexo
  titulo: string
  descricao: string | null
  arquivo_url: string
  arquivo_nome: string
  arquivo_tipo: string
  arquivo_size: number
  data_documento: string | null
  createdAt: string
  updatedAt: string
}

export interface ConvenioHistorico {
  id: string
  convenioId: string
  tenantId: string
  tipo: TipoHistoricoConvenio
  titulo: string
  descricao: string
  usuario_nome: string
  usuario_id: string
  dados_anteriores: Record<string, unknown> | null
  dados_novos: Record<string, unknown> | null
  createdAt: string
}

// ========================================
// Zod Schemas
// ========================================

export const convenioSchema = z.object({
  razao_social: z.string().min(2, 'Razão social é obrigatória').max(200),
  nome_fantasia: z.string().max(200).optional().or(z.literal('')),
  cnpj: z.string().min(14, 'CNPJ inválido').max(18),
  registro_ans: z.string().max(20).optional().or(z.literal('')),
  tipo: z.enum(['PLANO_SAUDE', 'CONVENIO_EMPRESA', 'CONVENIO_ESCOLAR', 'CONVENIO_PUBLICO', 'PARTICULAR_DESCONTO', 'OUTROS']),
  status: z.enum(['ATIVO', 'INATIVO', 'SUSPENSO', 'EM_NEGOCIACAO']),

  // Contato
  telefone: z.string().max(20).optional().or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  site: z.string().max(200).optional().or(z.literal('')),
  endereco: z.string().max(500).optional().or(z.literal('')),
  contato_nome: z.string().max(100).optional().or(z.literal('')),
  contato_telefone: z.string().max(20).optional().or(z.literal('')),
  contato_email: z.string().email('Email de contato inválido').optional().or(z.literal('')),

  // Financeiro
  prazo_pagamento_dias: z.coerce.number().int().min(0).max(365).optional().nullable(),
  dia_fechamento: z.coerce.number().int().min(1).max(31).optional().nullable(),
  dia_entrega_guias: z.coerce.number().int().min(1).max(31).optional().nullable(),
  percentual_repasse: z.coerce.number().min(0).max(100).optional().nullable(),

  // Datas
  data_inicio_contrato: z.string().optional().nullable(),
  data_fim_contrato: z.string().optional().nullable(),
  data_ultimo_reajuste: z.string().optional().nullable(),

  // Observações
  observacoes: z.string().max(2000).optional().or(z.literal('')),
})

export const convenioTissSchema = z.object({
  versao_tiss: z.string().max(20).optional().or(z.literal('')),
  tipo_guia_padrao: z.enum(['SP_SADT', 'CONSULTA', 'INTERNACAO', 'HONORARIOS', 'ODONTOLOGICA', 'RESUMO_INTERNACAO']).optional().nullable(),
  regime_atendimento: z.enum(['AMBULATORIAL', 'HOSPITALAR', 'HOSPITAL_DIA', 'DOMICILIAR']).optional().nullable(),
  carater_atendimento: z.enum(['ELETIVO', 'URGENCIA_EMERGENCIA']).optional().nullable(),
  codigo_operadora: z.string().max(20).optional().or(z.literal('')),
  codigo_prestador: z.string().max(20).optional().or(z.literal('')),
  numero_lote_padrao: z.string().max(20).optional().or(z.literal('')),
})

export const convenioTabelaSchema = z.object({
  codigo_procedimento: z.string().min(1, 'Código é obrigatório').max(20),
  nome_procedimento: z.string().min(2, 'Nome do procedimento é obrigatório').max(200),
  codigo_tiss: z.string().max(20).optional().or(z.literal('')),
  valor_convenio: z.number().min(0, 'Valor deve ser positivo'),
  valor_particular: z.number().min(0).optional().nullable(),
  valor_co_participacao: z.number().min(0).optional().nullable(),
  tipo_guia: z.enum(['SP_SADT', 'CONSULTA', 'INTERNACAO', 'HONORARIOS', 'ODONTOLOGICA', 'RESUMO_INTERNACAO']).optional().nullable(),
  tipo_tabela: z.string().max(10).optional().or(z.literal('')),
  grau_participacao: z.string().max(10).optional().or(z.literal('')),
  vigencia_inicio: z.string().optional().nullable(),
  vigencia_fim: z.string().optional().nullable(),
  procedimentoId: z.string().uuid().optional().nullable(),
})

export const convenioHistoricoNotaSchema = z.object({
  titulo: z.string().min(2, 'Título é obrigatório').max(200),
  descricao: z.string().min(2, 'Descrição é obrigatória').max(2000),
})

export type ConvenioFormData = z.infer<typeof convenioSchema>
export type ConvenioTissFormData = z.infer<typeof convenioTissSchema>
export type ConvenioTabelaFormData = z.infer<typeof convenioTabelaSchema>
export type ConvenioHistoricoNotaFormData = z.infer<typeof convenioHistoricoNotaSchema>
