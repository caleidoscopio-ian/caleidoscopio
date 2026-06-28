// Helper para calcular o preço efetivo de um procedimento em um atendimento.
// Regra ATUAL: o valor vem EXCLUSIVAMENTE da tabela do convênio (ConvenioTabela.valor_convenio).
// O procedimento não tem mais valor próprio — o preço só existe quando o paciente tem convênio
// E o procedimento está vinculado àquele convênio com um valor.
//   1. Paciente tem convênio E há entrada em ConvenioTabela p/ o procedimento → valor_convenio
//   2. Senão → null (sem valor)

export type OrigemPreco = "convenio" | null;

export interface PrecoCalculado {
  valor: number | null;
  origem: OrigemPreco;
  rotulo: string; // texto curto para exibir ao usuário
}

export interface ProcedimentoBase {
  valor?: number | string | null;
  valor_particular?: number | string | null;
}

export interface ConvenioTabelaBase {
  procedimentoId?: string | null;
  valor_convenio?: number | string | null;
}

const toNumber = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export function calcularPrecoProcedimento(params: {
  procedimentoId?: string | null;
  procedimento?: ProcedimentoBase | null;
  temConvenio: boolean;
  tabelaConvenio?: ConvenioTabelaBase[] | null;
}): PrecoCalculado {
  const { procedimentoId, procedimento, temConvenio, tabelaConvenio } = params;

  if (!procedimentoId || !procedimento) {
    return { valor: null, origem: null, rotulo: "Sem procedimento" };
  }

  if (temConvenio && tabelaConvenio && tabelaConvenio.length > 0) {
    const entrada = tabelaConvenio.find((t) => t.procedimentoId === procedimentoId);
    const valor = toNumber(entrada?.valor_convenio);
    if (valor !== null) {
      return { valor, origem: "convenio", rotulo: "Valor convênio" };
    }
  }

  return {
    valor: null,
    origem: null,
    rotulo: temConvenio
      ? "Procedimento sem valor na tabela do convênio"
      : "Sem convênio — valor cadastrado apenas por convênio",
  };
}

export const formatBRL = (v: number | null): string =>
  v === null
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
