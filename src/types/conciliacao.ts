export type StatusConciliacao = "CONCILIADO" | "CONCILIADO_GLOSA" | "NAO_ENCONTRADO";

export const STATUS_CONCILIACAO_LABEL: Record<StatusConciliacao, string> = {
  CONCILIADO:       "Conciliado",
  CONCILIADO_GLOSA: "Conciliado c/ glosa",
  NAO_ENCONTRADO:   "Não encontrado",
};

export const STATUS_CONCILIACAO_BADGE: Record<StatusConciliacao, string> = {
  CONCILIADO:       "bg-green-50 border-green-300 text-green-800",
  CONCILIADO_GLOSA: "bg-amber-50 border-amber-300 text-amber-800",
  NAO_ENCONTRADO:   "bg-red-50 border-red-300 text-red-800",
};

export interface DemonstrativoResumo {
  id: string;
  nome_arquivo: string;
  tipo_demonstrativo: string;
  numero_demonstrativo: string | null;
  operadora_nome: string | null;
  data_emissao: string | null;
  valor_informado_total: number;
  valor_liberado_total: number;
  valor_glosa_total: number;
  total_guias: number;
  guias_conciliadas: number;
  guias_nao_encontradas: number;
  importado_por_nome: string;
  createdAt: string;
}

export interface GuiaConciliacao {
  id: string;
  numero_guia_prestador: string | null;
  senha: string | null;
  numero_carteira: string | null;
  data_realizacao: string | null;
  valor_informado: number;
  valor_processado: number;
  valor_liberado: number;
  valor_glosa: number;
  codigo_glosa: string | null;
  descricao_glosa: string | null;
  status_conciliacao: StatusConciliacao;
  agendamento: {
    id: string;
    data_hora: string;
    paciente: string;
    procedimento: string | null;
  } | null;
}

export interface DemonstrativoDetalhe extends DemonstrativoResumo {
  guias: GuiaConciliacao[];
}

export interface ComparativoConciliacao {
  total_demonstrativos: number;
  valor_informado_total: number;
  valor_liberado_total: number;
  valor_glosa_total: number;
  taxa_glosa: number;
  total_guias: number;
  guias_conciliadas: number;
  guias_nao_encontradas: number;
  glosas_geradas: number;
}
