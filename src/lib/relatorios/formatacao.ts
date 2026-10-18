// Formatação das células do relatório. Usada pela tela e pela exportação, para
// que o CSV e a tabela nunca mostrem números diferentes.

import type { TipoMetrica } from "@/types/relatorio";

/** Exibido quando a métrica é null — "sem informação", diferente de zero */
export const SEM_VALOR = "—";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Minutos → "2h 30min" / "45min" / "—" */
export function formatarDuracao(minutos: number | null): string {
  if (minutos === null || !Number.isFinite(minutos)) return SEM_VALOR;
  const total = Math.round(minutos);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function formatarMetrica(valor: number | null, tipo: TipoMetrica): string {
  if (valor === null || !Number.isFinite(valor)) return SEM_VALOR;
  switch (tipo) {
    case "moeda":
      return moeda.format(valor);
    case "contagem":
      return inteiro.format(valor);
    case "percentual":
      return `${decimal.format(valor)}%`;
    case "duracao":
      return formatarDuracao(valor);
    case "numero":
      return decimal.format(valor);
  }
}

/**
 * Valor para a célula do CSV: sem símbolo de moeda e com **vírgula** decimal,
 * que é o que o Excel em pt-BR entende como número. Null vira célula vazia —
 * nunca zero, para a planilha não somar o que não existe.
 */
export function valorParaExportacao(valor: number | null, tipo: TipoMetrica): string {
  if (valor === null || !Number.isFinite(valor)) return "";
  if (tipo === "contagem") return String(Math.round(valor));
  return valor.toFixed(2).replace(".", ",");
}

/** "2026-10-14" → "14/10" */
export function formatarChaveDia(chave: string): string {
  const [, mes, dia] = chave.split("-");
  return mes && dia ? `${dia}/${mes}` : chave;
}

/** "2026-10-12" (segunda) → "sem. 12/10" */
export function formatarChaveSemana(chave: string): string {
  const [, mes, dia] = chave.split("-");
  return mes && dia ? `sem. ${dia}/${mes}` : chave;
}

/** "2026-10" → "out/2026" */
export function formatarChaveMes(chave: string): string {
  const [ano, mes] = chave.split("-");
  const i = Number(mes) - 1;
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return nomes[i] ? `${nomes[i]}/${ano}` : chave;
}
