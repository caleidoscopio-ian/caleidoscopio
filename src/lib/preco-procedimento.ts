// Helper para calcular o preço efetivo de um procedimento em um atendimento.
// Regra:
//   1. Se paciente tem convênio E há entrada em ConvenioTabela para o procedimento → valor_convenio
//   2. Senão, se procedimento tem valor_particular → valor_particular
//   3. Senão, se procedimento tem valor padrão → valor
//   4. Senão → null

export type OrigemPreco = "convenio" | "particular" | "padrao" | null;

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

  const particular = toNumber(procedimento.valor_particular);
  if (particular !== null) {
    return { valor: particular, origem: "particular", rotulo: "Valor particular" };
  }

  const padrao = toNumber(procedimento.valor);
  if (padrao !== null) {
    return { valor: padrao, origem: "padrao", rotulo: "Valor padrão" };
  }

  return { valor: null, origem: null, rotulo: "Sem preço cadastrado" };
}

export const formatBRL = (v: number | null): string =>
  v === null
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
