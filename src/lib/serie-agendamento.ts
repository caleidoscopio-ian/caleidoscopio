// Escopo de uma operação sobre uma série de agendamentos recorrentes.
//
// Usado por excluir, cancelar e editar. Só faz sentido quando o agendamento
// tem serieId; sem ele, qualquer escopo cai em "single".

import { StatusAgendamento } from "@/types/agendamento";

export type EscopoSerie = "single" | "past" | "future" | "all";

export const ESCOPOS_SERIE: EscopoSerie[] = ["single", "past", "future", "all"];

export const isEscopoSerie = (valor: string): valor is EscopoSerie =>
  (ESCOPOS_SERIE as string[]).includes(valor);

/** Rótulos por ação, para os painéis de confirmação */
export function opcoesEscopo(
  acao: "excluir" | "cancelar" | "editar"
): { value: EscopoSerie; label: string; description: string }[] {
  const verbo = { excluir: "Excluir", cancelar: "Cancelar", editar: "Aplicar a" }[acao];
  const efeito = {
    excluir: "Remove",
    cancelar: "Marca como cancelado",
    editar: "Aplica as alterações a",
  }[acao];

  return [
    {
      value: "single",
      label: `${verbo} apenas este agendamento`,
      description: `${efeito} só este registro, mantendo o restante da série.`,
    },
    {
      value: "future",
      label: `${verbo} este e todos os agendamentos futuros da série`,
      description: `${efeito} este registro e todos os que vêm depois dele na mesma recorrência.`,
    },
    {
      value: "past",
      label: `${verbo} este e todos os agendamentos anteriores da série`,
      description: `${efeito} este registro e todos os que vêm antes dele na mesma recorrência.`,
    },
    {
      value: "all",
      label: `${verbo} toda a série`,
      description: `${efeito} todos os agendamentos desta recorrência, passados e futuros.`,
    },
  ];
}

/**
 * Recorte de datas do escopo, relativo ao agendamento de referência.
 * "single" não gera recorte — é tratado fora, pelo id.
 */
export function filtroDataDoEscopo(
  escopo: EscopoSerie,
  dataReferencia: Date
): { data_hora?: { gte?: Date; lte?: Date } } {
  if (escopo === "future") return { data_hora: { gte: dataReferencia } };
  if (escopo === "past") return { data_hora: { lte: dataReferencia } };
  return {}; // "all"
}

/**
 * Agendamentos que não devem ser apagados nem reescritos em massa: o
 * atendimento já aconteceu, ou já existe registro operacional/financeiro
 * pendurado nele. Glosa tem onDelete Cascade, então excluir em lote levaria
 * junto o histórico de faturamento.
 */
export const STATUS_PROTEGIDOS: StatusAgendamento[] = [
  StatusAgendamento.EM_ATENDIMENTO,
  StatusAgendamento.ATENDIDO,
];

export interface AgendamentoProtegivel {
  status: string;
  hora_chegada?: Date | string | null;
  senha_autorizacao?: string | null;
  numero_guia?: string | null;
  _count?: { glosas?: number };
}

/** true se o agendamento carrega histórico que uma operação em massa não deve destruir */
export function temHistoricoProtegido(ag: AgendamentoProtegivel): boolean {
  if (STATUS_PROTEGIDOS.includes(ag.status as StatusAgendamento)) return true;
  if (ag.hora_chegada) return true;
  if (ag.senha_autorizacao || ag.numero_guia) return true;
  if ((ag._count?.glosas ?? 0) > 0) return true;
  return false;
}

/** Texto do toast após uma operação em série */
export function descreverResultadoSerie(
  afetados: number,
  preservados: number,
  particípio: "excluído" | "cancelado" | "atualizado"
): string {
  const plural = afetados !== 1;
  const base = `${afetados} agendamento${plural ? "s" : ""} ${particípio}${plural ? "s" : ""}`;
  if (preservados === 0) return base;
  return `${base}. ${preservados} preservado${preservados > 1 ? "s" : ""} por já ter${
    preservados > 1 ? "em" : ""
  } atendimento, check-in ou faturamento.`;
}
