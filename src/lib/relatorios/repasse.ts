// Resolução da regra de repasse e cálculo do valor devido ao profissional.
//
// Puro de propósito (sem Prisma, sem React): é a regra de negócio com mais
// consequência financeira do sistema, e precisa ser testável com todas as
// combinações de vigência, especificidade e tipo sem depender do banco.
//
// Um atendimento pode casar com várias regras do mesmo profissional ao mesmo
// tempo — uma geral, uma do convênio, uma do procedimento. A ordem de desempate
// está em `compararRegras`, e é a parte que erra fácil se for escrita no meio de
// uma query.

export type TipoRepasse = "PERCENTUAL" | "VALOR_FIXO" | "VALOR_HORA";

/** Uma regra de `RegraRepasse` já convertida para números simples */
export interface RegraRepasseResolvivel {
  id: string;
  profissionalId: string;
  /** null = vale para todos os convênios (e para particular) */
  convenioId: string | null;
  /** null = vale para todos os procedimentos */
  procedimentoId: string | null;
  tipo: TipoRepasse;
  valor: number;
  descricao: string | null;
  vigencia_inicio: Date;
  /** null = sem data de fim */
  vigencia_fim: Date | null;
  prioridade: number;
}

export interface ContextoAtendimento {
  data: Date;
  /** null = paciente particular */
  convenioId: string | null;
  procedimentoId: string | null;
  /** valor cobrado; null quando não há preço cadastrado */
  valorBruto: number | null;
  duracaoMinutos: number;
}

export type MotivoRepasse =
  | "ok"
  | "sem-regra" // nenhuma regra vigente e compatível
  | "sem-valor-bruto"; // regra percentual sem valor cobrado para incidir

export interface ResultadoRepasse {
  valorRepasse: number | null;
  /** bruto − repasse; null se algum dos dois é desconhecido */
  valorLiquido: number | null;
  regraId: string | null;
  /** texto curto da regra aplicada, para a coluna e para a dimensão */
  rotuloRegra: string;
  motivo: MotivoRepasse;
  /** true quando o repasse supera o valor cobrado — erro de cadastro a expor */
  repasseAcimaDoBruto: boolean;
}

const arredondar = (n: number): number => Math.round(n * 100) / 100;

/**
 * Quão específica é a regra. Usada no desempate:
 *   convênio + procedimento (3) > convênio (2) > procedimento (1) > geral (0)
 */
export function especificidade(r: RegraRepasseResolvivel): number {
  const temConvenio = r.convenioId !== null;
  const temProcedimento = r.procedimentoId !== null;
  if (temConvenio && temProcedimento) return 3;
  if (temConvenio) return 2;
  if (temProcedimento) return 1;
  return 0;
}

/** A vigência da regra cobre a data do atendimento? */
export function vigenteEm(r: RegraRepasseResolvivel, data: Date): boolean {
  const t = data.getTime();
  if (r.vigencia_inicio.getTime() > t) return false;
  if (r.vigencia_fim !== null && r.vigencia_fim.getTime() < t) return false;
  return true;
}

/**
 * A regra se aplica a este atendimento?
 *
 * Regra com `convenioId` preenchido só vale para aquele convênio — e, como
 * particular é `convenioId = null` no atendimento, uma regra de convênio nunca
 * pega atendimento particular. Regra com `convenioId = null` vale para todos,
 * particular incluído.
 */
export function compativel(r: RegraRepasseResolvivel, ctx: ContextoAtendimento): boolean {
  if (r.convenioId !== null && r.convenioId !== ctx.convenioId) return false;
  if (r.procedimentoId !== null && r.procedimentoId !== ctx.procedimentoId) return false;
  return true;
}

/**
 * Ordem de precedência. Primeiro critério é a `prioridade` do cadastro — o
 * schema a define como "maior prevalece em conflito", então ela vence até a
 * especificidade. Os critérios seguintes existem para o resultado nunca
 * depender da ordem em que o banco devolveu as linhas.
 */
export function compararRegras(a: RegraRepasseResolvivel, b: RegraRepasseResolvivel): number {
  if (a.prioridade !== b.prioridade) return b.prioridade - a.prioridade;
  const ea = especificidade(a);
  const eb = especificidade(b);
  if (ea !== eb) return eb - ea;
  // vigência mais recente vence: é a renegociação mais nova
  const ia = a.vigencia_inicio.getTime();
  const ib = b.vigencia_inicio.getTime();
  if (ia !== ib) return ib - ia;
  return a.id.localeCompare(b.id);
}

/** A regra que vale para este atendimento, ou null se nenhuma se aplica */
export function resolverRegra(
  regras: RegraRepasseResolvivel[],
  ctx: ContextoAtendimento
): RegraRepasseResolvivel | null {
  const candidatas = regras.filter((r) => vigenteEm(r, ctx.data) && compativel(r, ctx));
  if (candidatas.length === 0) return null;
  return [...candidatas].sort(compararRegras)[0];
}

/** Texto curto da regra, usado na coluna de detalhe e na dimensão "Regra" */
export function descreverRegra(r: RegraRepasseResolvivel): string {
  const base =
    r.tipo === "PERCENTUAL"
      ? `${formatarNumero(r.valor)}%`
      : r.tipo === "VALOR_HORA"
        ? `${formatarMoedaCurta(r.valor)}/hora`
        : `${formatarMoedaCurta(r.valor)} fixo`;

  const escopo =
    r.convenioId && r.procedimentoId
      ? "convênio + procedimento"
      : r.convenioId
        ? "por convênio"
        : r.procedimentoId
          ? "por procedimento"
          : "geral";

  return `${base} (${escopo})`;
}

const formatarNumero = (n: number): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",");

const formatarMoedaCurta = (n: number): string =>
  `R$ ${n.toFixed(2).replace(".", ",")}`;

/**
 * Valor devido ao profissional por este atendimento.
 *
 * `VALOR_FIXO` e `VALOR_HORA` não dependem do valor cobrado, então produzem
 * repasse mesmo quando o preço não está cadastrado — nesse caso o líquido fica
 * desconhecido, e é isso que o relatório mostra. `PERCENTUAL` sem valor bruto
 * não tem sobre o que incidir.
 */
export function calcularRepasse(
  regra: RegraRepasseResolvivel | null,
  ctx: ContextoAtendimento
): ResultadoRepasse {
  if (!regra) {
    return {
      valorRepasse: null,
      valorLiquido: null,
      regraId: null,
      rotuloRegra: "Sem regra cadastrada",
      motivo: "sem-regra",
      repasseAcimaDoBruto: false,
    };
  }

  let valorRepasse: number | null;
  let motivo: MotivoRepasse = "ok";

  switch (regra.tipo) {
    case "PERCENTUAL": {
      if (ctx.valorBruto === null) {
        valorRepasse = null;
        motivo = "sem-valor-bruto";
      } else {
        valorRepasse = arredondar(ctx.valorBruto * (regra.valor / 100));
      }
      break;
    }
    case "VALOR_FIXO": {
      valorRepasse = arredondar(regra.valor);
      break;
    }
    case "VALOR_HORA": {
      valorRepasse = arredondar(regra.valor * (ctx.duracaoMinutos / 60));
      break;
    }
  }

  const valorLiquido =
    ctx.valorBruto !== null && valorRepasse !== null
      ? arredondar(ctx.valorBruto - valorRepasse)
      : null;

  return {
    valorRepasse,
    valorLiquido,
    regraId: regra.id,
    rotuloRegra: descreverRegra(regra),
    motivo,
    // Não é clampeado: líquido negativo é erro de cadastro, e esconder isso
    // faria o fechamento fechar errado em silêncio.
    repasseAcimaDoBruto:
      ctx.valorBruto !== null && valorRepasse !== null && valorRepasse > ctx.valorBruto,
  };
}
