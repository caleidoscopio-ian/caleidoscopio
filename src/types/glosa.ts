export type CategoriaGlosa =
  | "ADMINISTRATIVA"
  | "TECNICA"
  | "LINEAR"
  | "DUPLICIDADE"
  | "TABELA"
  | "PRAZO"
  | "DOCUMENTACAO"
  | "OUTROS";

export type StatusGlosa =
  | "PENDENTE"
  | "EM_RECURSO"
  | "RECUPERADA"
  | "PARCIAL"
  | "NEGADA"
  | "ACATADA";

export const CATEGORIA_GLOSA_LABEL: Record<CategoriaGlosa, string> = {
  ADMINISTRATIVA: "Administrativa",
  TECNICA:        "Técnica",
  LINEAR:         "Linear",
  DUPLICIDADE:    "Duplicidade",
  TABELA:         "Tabela/Valor",
  PRAZO:          "Prazo",
  DOCUMENTACAO:   "Documentação",
  OUTROS:         "Outros",
};

export const STATUS_GLOSA_LABEL: Record<StatusGlosa, string> = {
  PENDENTE:    "Pendente",
  EM_RECURSO:  "Em Recurso",
  RECUPERADA:  "Recuperada",
  PARCIAL:     "Parcialmente Recuperada",
  NEGADA:      "Negada",
  ACATADA:     "Acatada",
};

export const STATUS_GLOSA_BADGE: Record<StatusGlosa, string> = {
  PENDENTE:   "bg-yellow-50 border-yellow-300 text-yellow-800",
  EM_RECURSO: "bg-blue-50 border-blue-300 text-blue-800",
  RECUPERADA: "bg-green-50 border-green-300 text-green-800",
  PARCIAL:    "bg-teal-50 border-teal-300 text-teal-800",
  NEGADA:     "bg-red-50 border-red-300 text-red-800",
  ACATADA:    "bg-gray-50 border-gray-300 text-gray-700",
};

export const CATEGORIA_GLOSA_COLOR: Record<CategoriaGlosa, string> = {
  ADMINISTRATIVA: "#f59e0b",
  TECNICA:        "#ef4444",
  LINEAR:         "#8b5cf6",
  DUPLICIDADE:    "#ec4899",
  TABELA:         "#3b82f6",
  PRAZO:          "#f97316",
  DOCUMENTACAO:   "#6366f1",
  OUTROS:         "#9ca3af",
};

export interface GlosaHistoricoItem {
  id: string;
  status_anterior: StatusGlosa | null;
  status_novo: StatusGlosa;
  titulo: string;
  descricao: string;
  usuario_nome: string;
  createdAt: string;
}

export interface Glosa {
  id: string;
  tenantId: string;
  agendamentoId: string;
  data_atendimento: string;
  paciente: { id: string; nome: string };
  profissional: { id: string; nome: string } | null;
  procedimento: { id: string; nome: string; codigo: string | null } | null;
  convenio: { id: string; nome: string } | null;
  valor_cobrado: number;
  valor_glosado: number;
  valor_recuperado: number | null;
  categoria: CategoriaGlosa;
  codigo_glosa: string | null;
  motivo: string;
  status: StatusGlosa;
  data_glosa: string;
  data_recurso: string | null;
  data_resolucao: string | null;
  observacoes: string | null;
  historico?: GlosaHistoricoItem[];
}

export interface GlosaResumo {
  total_glosas: number;
  valor_glosado_total: number;
  valor_recuperado_total: number;
  valor_em_recurso: number;
  pendentes: number;
  taxa_recuperacao: number;   // recuperado ÷ glosado resolvido (RECUPERADA+PARCIAL+NEGADA)
  taxa_glosa: number;         // glosado ÷ faturado ATENDIDO no período
}

export interface GlosaListResponse {
  success: boolean;
  data: Glosa[];
  total: number;
  page: number;
  pageSize: number;
  resumo: GlosaResumo;
  periodo: { inicio: string; fim: string };
}

export interface GlosaDashboard {
  resumo: GlosaResumo;
  por_categoria: Array<{ categoria: CategoriaGlosa; total: number; valor: number }>;
  por_convenio: Array<{ convenioId: string; nome: string; total: number; valor: number }>;
  por_status: Array<{ status: StatusGlosa; total: number; valor: number }>;
  evolucao_mensal: Array<{ mes: string; glosado: number; recuperado: number }>;
}

export interface GlosaFiltros {
  dataInicio: Date;
  dataFim: Date;
  status: StatusGlosa[];
  categoria: CategoriaGlosa | null;
  convenioId: string | null;
  pacienteBusca: string;
}
