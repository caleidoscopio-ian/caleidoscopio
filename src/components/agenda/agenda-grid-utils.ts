// Utilitários compartilhados da grade de agenda (visões diária e semanal).
// Abordagem estilo Teams/Google Calendar: slots fixos de 30 min como fundo e
// agendamentos posicionados de forma absoluta pela hora/duração reais.

import { Agendamento, StatusAgendamento } from "@/types/agendamento";

export const SLOT_MIN = 30;          // slots fixos de 30 minutos
export const SLOT_PX = 48;           // altura de cada slot de 30 min (px)
export const PX_PER_MIN = SLOT_PX / SLOT_MIN;
export const DEFAULT_START_MIN = 7 * 60;  // 07:00
export const DEFAULT_END_MIN = 20 * 60;   // 20:00

/** Minuto-do-dia (00:00 = 0) de uma data, em horário local */
export const minutesOfDay = (value: Date | string): number => {
  const d = new Date(value);
  return d.getHours() * 60 + d.getMinutes();
};

/** Formata minuto-do-dia em "HH:MM" */
export const fmtMin = (m: number): string => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
};

/** Faixa de horários (07:00–20:00 por padrão), expandida p/ caber todos os agendamentos */
export function computeRange(agendamentos: Agendamento[]): {
  startMin: number;
  endMin: number;
  slots: number[];
} {
  let start = DEFAULT_START_MIN;
  let end = DEFAULT_END_MIN;
  agendamentos.forEach((a) => {
    start = Math.min(start, minutesOfDay(a.data_hora));
    end = Math.max(end, minutesOfDay(a.horario_fim));
  });
  start = Math.floor(start / SLOT_MIN) * SLOT_MIN;
  end = Math.ceil(end / SLOT_MIN) * SLOT_MIN;
  if (end <= start) end = start + SLOT_MIN;
  const slots: number[] = [];
  for (let m = start; m < end; m += SLOT_MIN) slots.push(m);
  return { startMin: start, endMin: end, slots };
}

/** Atribui colunas a agendamentos que se sobrepõem no tempo (lado a lado) */
export function layoutColunas(ags: Agendamento[]): Map<string, { col: number; cols: number }> {
  const layout = new Map<string, { col: number; cols: number }>();
  const sorted = [...ags].sort(
    (a, b) => minutesOfDay(a.data_hora) - minutesOfDay(b.data_hora) ||
              minutesOfDay(a.horario_fim) - minutesOfDay(b.horario_fim)
  );

  let cluster: Agendamento[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const colFim: number[] = []; // fim (min) ocupado por coluna
    cluster.forEach((a) => {
      const ini = minutesOfDay(a.data_hora);
      const fim = minutesOfDay(a.horario_fim);
      let col = colFim.findIndex((endCol) => ini >= endCol);
      if (col === -1) { colFim.push(fim); col = colFim.length - 1; }
      else colFim[col] = fim;
      layout.set(a.id, { col, cols: 0 });
    });
    const total = colFim.length;
    cluster.forEach((a) => { layout.get(a.id)!.cols = total; });
    cluster = [];
    clusterEnd = -1;
  };

  sorted.forEach((a) => {
    const ini = minutesOfDay(a.data_hora);
    if (cluster.length && ini >= clusterEnd) flush();
    cluster.push(a);
    clusterEnd = Math.max(clusterEnd, minutesOfDay(a.horario_fim));
  });
  flush();
  return layout;
}

export const STATUS_CARD_BG: Record<StatusAgendamento, string> = {
  [StatusAgendamento.AGENDADO]:       "bg-blue-50 border-blue-300 hover:bg-blue-100",
  [StatusAgendamento.CONFIRMADO]:     "bg-green-50 border-green-300 hover:bg-green-100",
  [StatusAgendamento.EM_ATENDIMENTO]: "bg-amber-50 border-amber-300 hover:bg-amber-100",
  [StatusAgendamento.ATENDIDO]:       "bg-purple-50 border-purple-300 hover:bg-purple-100",
  [StatusAgendamento.FALTOU]:         "bg-gray-50 border-gray-300 hover:bg-gray-100",
  [StatusAgendamento.CANCELADO]:      "bg-red-50 border-red-300 hover:bg-red-100",
};

export const getStatusCardBg = (status: StatusAgendamento) =>
  STATUS_CARD_BG[status] ?? "bg-gray-50 border-gray-300 hover:bg-gray-100";
