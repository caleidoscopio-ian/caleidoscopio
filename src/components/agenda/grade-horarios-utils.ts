// Utilitários da aba "Grade de Horários" — cruza a grade de atendimento
// configurada para cada profissional (GradeAtendimento) com os agendamentos
// existentes, produzindo o status de cada slot de 30 min.

import { Agendamento, StatusAgendamento } from "@/types/agendamento";
import { SLOT_MIN, minutesOfDay } from "./agenda-grid-utils";

export interface GradeBloco {
  id: string;
  profissionalId: string;
  diaSemana: number; // 0=Dom ... 6=Sáb
  hora_inicio: string; // "08:00"
  hora_fim: string; // "12:00"
  filialId: string | null;
}

export interface ProfissionalGrade {
  id: string;
  nome: string;
  especialidade: string;
}

/** Status de um slot de 30 min na grade de um profissional */
export type SlotStatus =
  | "livre" // dentro da grade e sem agendamento
  | "ocupado" // dentro da grade e com agendamento
  | "extra" // agendamento fora da grade configurada
  | "fora"; // fora da grade e sem agendamento

export interface SlotInfo {
  min: number;
  status: SlotStatus;
  agendamentos: Agendamento[];
}

export const DIAS_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** "08:30" → 510 */
export const horaParaMin = (hora: string): number => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

/** Cancelado libera o horário; os demais status ocupam a agenda */
export const ocupaAgenda = (a: Agendamento): boolean =>
  a.status !== StatusAgendamento.CANCELADO;

export const mesmoDia = (value: Date | string, dia: Date): boolean => {
  const d = new Date(value);
  return (
    d.getFullYear() === dia.getFullYear() &&
    d.getMonth() === dia.getMonth() &&
    d.getDate() === dia.getDate()
  );
};

/** Blocos configurados para o profissional naquele dia da semana */
export const blocosDoDia = (
  grades: GradeBloco[],
  profissionalId: string,
  diaSemana: number
): GradeBloco[] =>
  grades.filter((g) => g.profissionalId === profissionalId && g.diaSemana === diaSemana);

/** true se o slot de 30 min está coberto por algum bloco da grade */
export const dentroDaGrade = (blocos: GradeBloco[], m: number): boolean =>
  blocos.some((b) => m >= horaParaMin(b.hora_inicio) && m < horaParaMin(b.hora_fim));

/** Agendamentos do profissional que cobrem o slot naquele dia */
export const agendamentosDoSlot = (
  ags: Agendamento[],
  dia: Date,
  m: number
): Agendamento[] =>
  ags.filter(
    (a) =>
      ocupaAgenda(a) &&
      mesmoDia(a.data_hora, dia) &&
      minutesOfDay(a.data_hora) < m + SLOT_MIN &&
      minutesOfDay(a.horario_fim) > m
  );

/**
 * Faixa de slots a exibir: união da grade configurada com os agendamentos
 * existentes (um agendamento fora da grade continua visível).
 */
export function faixaDeSlots(blocos: GradeBloco[], ags: Agendamento[]): number[] {
  let ini = Number.POSITIVE_INFINITY;
  let fim = Number.NEGATIVE_INFINITY;

  blocos.forEach((b) => {
    ini = Math.min(ini, horaParaMin(b.hora_inicio));
    fim = Math.max(fim, horaParaMin(b.hora_fim));
  });

  ags.filter(ocupaAgenda).forEach((a) => {
    ini = Math.min(ini, minutesOfDay(a.data_hora));
    fim = Math.max(fim, minutesOfDay(a.horario_fim));
  });

  if (!Number.isFinite(ini) || fim <= ini) return [];

  ini = Math.floor(ini / SLOT_MIN) * SLOT_MIN;
  fim = Math.ceil(fim / SLOT_MIN) * SLOT_MIN;

  const slots: number[] = [];
  for (let m = ini; m < fim; m += SLOT_MIN) slots.push(m);
  return slots;
}

/** Monta o status de cada slot informado para um profissional em um dia */
export function montarSlotsDoDia(
  blocos: GradeBloco[],
  ags: Agendamento[],
  dia: Date,
  slots: number[]
): SlotInfo[] {
  return slots.map((min) => {
    const doSlot = agendamentosDoSlot(ags, dia, min);
    const dentro = dentroDaGrade(blocos, min);
    let status: SlotStatus;
    if (doSlot.length > 0) status = dentro ? "ocupado" : "extra";
    else status = dentro ? "livre" : "fora";
    return { min, status, agendamentos: doSlot };
  });
}

/** Total de slots livres de um profissional ao longo dos dias informados */
export function contarVagas(
  grades: GradeBloco[],
  ags: Agendamento[],
  profissionalId: string,
  dias: Date[]
): number {
  const doProfissional = ags.filter((a) => a.profissionalId === profissionalId);
  return dias.reduce((total, dia) => {
    const blocos = blocosDoDia(grades, profissionalId, dia.getDay());
    if (blocos.length === 0) return total;
    const slots = faixaDeSlots(blocos, []);
    const livres = montarSlotsDoDia(blocos, doProfissional, dia, slots).filter(
      (s) => s.status === "livre"
    ).length;
    return total + livres;
  }, 0);
}

/** Resumo textual da grade configurada para um dia ("08:00–12:00 · 14:00–18:00") */
export const resumoBlocos = (blocos: GradeBloco[]): string =>
  blocos
    .slice()
    .sort((a, b) => horaParaMin(a.hora_inicio) - horaParaMin(b.hora_inicio))
    .map((b) => `${b.hora_inicio}–${b.hora_fim}`)
    .join(" · ");

/** Classes de estilo por status de slot */
export const SLOT_STATUS_CLASS: Record<SlotStatus, string> = {
  livre: "bg-green-50 border-green-300 text-green-800 hover:bg-green-100",
  ocupado: "bg-blue-50 border-blue-300 text-blue-900 hover:bg-blue-100",
  extra: "bg-amber-50 border-amber-400 border-dashed text-amber-900 hover:bg-amber-100",
  fora: "bg-muted/40 border-transparent text-muted-foreground",
};
