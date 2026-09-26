// Helper para calcular o preço efetivo de um procedimento em um atendimento.
//   1. Valor particular informado no agendamento → vence (foi combinado caso a caso)
//   2. Paciente com convênio E entrada em ConvenioTabela p/ o procedimento → valor_convenio
//   3. Senão → null (sem valor)
//
// Particular não tem tabela de preços: cada atendimento pode ter um valor
// diferente, então ele é digitado no momento do agendamento e gravado em
// agendamento.valor_particular.

export type OrigemPreco = "convenio" | "particular" | null;

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
  /** Valor combinado no agendamento particular, quando houver */
  valorParticular?: number | string | null;
}): PrecoCalculado {
  const { procedimentoId, procedimento, temConvenio, tabelaConvenio } = params;

  // Valor particular é uma decisão explícita de quem agendou: vale mesmo sem
  // procedimento vinculado
  const particular = toNumber(params.valorParticular);
  if (particular !== null) {
    return { valor: particular, origem: "particular", rotulo: "Valor particular" };
  }

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
