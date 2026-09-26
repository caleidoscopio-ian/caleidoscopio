// Regras de encaixe de um agendamento na grade de atendimento do profissional.
//
// A grade define, por dia da semana, os blocos em que o profissional atende.
// Um agendamento só é válido se couber inteiro dentro de um bloco daquele dia.
//
// Profissional sem grade cadastrada não tem restrição — bloquear nesse caso
// impediria de agendar com quem ainda não teve a grade configurada.

import type { BlocoGrade } from "@/types/ocupacao-profissional";
import { horaParaMinutos } from "@/lib/ocupacao";

const PASSO_MIN = 10; // mesma granularidade dos selects do formulário

const minutosParaHora = (m: number): string =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Blocos configurados para aquele dia da semana (0=Dom ... 6=Sáb) */
export function blocosDoDia(grade: BlocoGrade[], diaSemana: number): BlocoGrade[] {
  return grade
    .filter((b) => b.diaSemana === diaSemana && b.ativo !== false)
    .sort((a, b) => horaParaMinutos(a.hora_inicio) - horaParaMinutos(b.hora_inicio));
}

/** true se o profissional tem grade cadastrada (em qualquer dia) */
export const temGrade = (grade: BlocoGrade[]): boolean => grade.length > 0;

/**
 * true se o intervalo NÃO cabe inteiro em nenhum bloco do dia.
 * Sem grade cadastrada, nunca está fora.
 */
export function foraDaGrade(
  grade: BlocoGrade[],
  diaSemana: number,
  horario: string,
  horario_fim: string
): boolean {
  if (!temGrade(grade)) return false;
  const ini = horaParaMinutos(horario);
  const fim = horaParaMinutos(horario_fim);
  return !blocosDoDia(grade, diaSemana).some(
    (b) => horaParaMinutos(b.hora_inicio) <= ini && horaParaMinutos(b.hora_fim) >= fim
  );
}

/**
 * Horários de início possíveis naquele dia.
 * Sem grade, devolve `todos` (o comportamento antigo, sem restrição).
 */
export function horariosInicioDisponiveis(
  grade: BlocoGrade[],
  diaSemana: number,
  todos: string[]
): string[] {
  if (!temGrade(grade)) return todos;
  const blocos = blocosDoDia(grade, diaSemana);
  if (blocos.length === 0) return [];

  return todos.filter((h) => {
    const m = horaParaMinutos(h);
    // O último minuto do bloco não serve como início: não caberia nada depois
    return blocos.some(
      (b) => m >= horaParaMinutos(b.hora_inicio) && m < horaParaMinutos(b.hora_fim)
    );
  });
}

/**
 * Horários de fim possíveis, dado o início escolhido: precisam estar depois do
 * início e dentro do MESMO bloco, para o atendimento não atravessar um intervalo.
 */
export function horariosFimDisponiveis(
  grade: BlocoGrade[],
  diaSemana: number,
  horarioInicio: string,
  todos: string[]
): string[] {
  if (!horarioInicio) return [];
  const ini = horaParaMinutos(horarioInicio);

  if (!temGrade(grade)) return todos.filter((h) => horaParaMinutos(h) > ini);

  const bloco = blocosDoDia(grade, diaSemana).find(
    (b) => ini >= horaParaMinutos(b.hora_inicio) && ini < horaParaMinutos(b.hora_fim)
  );
  if (!bloco) return [];

  const fimBloco = horaParaMinutos(bloco.hora_fim);
  return todos.filter((h) => {
    const m = horaParaMinutos(h);
    return m > ini && m <= fimBloco;
  });
}

/** Resumo legível dos blocos do dia ("08:00–12:00 · 14:00–18:00") */
export function resumoBlocosDoDia(grade: BlocoGrade[], diaSemana: number): string {
  return blocosDoDia(grade, diaSemana)
    .map((b) => `${b.hora_inicio}–${b.hora_fim}`)
    .join(" · ");
}

/**
 * Das datas informadas, quais ficam fora da grade no horário escolhido.
 * Usado para validar as ocorrências de um agendamento recorrente, que podem
 * cair em dias da semana com grade diferente da data inicial.
 */
export function datasForaDaGrade(
  grade: BlocoGrade[],
  datas: Date[],
  horario: string,
  horario_fim: string
): Date[] {
  if (!temGrade(grade) || !horario || !horario_fim) return [];
  return datas.filter((d) => foraDaGrade(grade, d.getDay(), horario, horario_fim));
}

/** Lista de horários de 10 em 10 minutos entre 05:00 e 22:00 */
export function gerarHorarios(
  inicioHora = 5,
  fimHora = 22,
  passo = PASSO_MIN
): string[] {
  const out: string[] = [];
  for (let m = inicioHora * 60; m <= fimHora * 60; m += passo) {
    out.push(minutosParaHora(m));
  }
  return out;
}
