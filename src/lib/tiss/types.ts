// Modelo normalizado — saída de qualquer parser TISS, independente do tipo de demonstrativo.

export type TipoDemonstrativo = "DEMONSTRATIVO_PAGAMENTO" | "DEMONSTRATIVO_ANALISE_CONTA";

export interface GuiaNormalizada {
  numero_guia_prestador: string | null;
  numero_guia_operadora: string | null;
  senha: string | null;
  numero_carteira: string | null;
  data_realizacao: string | null; // ISO date
  valor_informado: number;
  valor_processado: number;
  valor_liberado: number;
  valor_glosa: number;
  situacao: string | null;
  codigo_glosa: string | null;
  descricao_glosa: string | null;
}

export interface DemonstrativoNormalizado {
  tipo_demonstrativo: TipoDemonstrativo;
  numero_demonstrativo: string | null;
  operadora_nome: string | null;
  registro_ans: string | null;
  data_emissao: string | null; // ISO date
  valor_informado_total: number;
  valor_processado_total: number;
  valor_liberado_total: number;
  valor_glosa_total: number;
  guias: GuiaNormalizada[];
}

export class TissParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TissParseError";
  }
}
