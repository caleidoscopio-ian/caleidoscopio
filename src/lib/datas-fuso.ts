// Datas no fuso da clínica.
//
// Produção roda em UTC (Vercel) e o dev local roda no fuso da máquina. Qualquer
// cálculo de "hoje", "início do mês" ou limite de dia feito com setHours()/
// startOfDay() em API route sai diferente nos dois ambientes — entre 21:00 e
// meia-noite no Brasil o servidor UTC já virou o dia.
//
// Estas funções fixam o fuso da clínica, então o resultado não depende de onde
// o código roda.

export const TZ_CLINICA = "America/Sao_Paulo";

/** Offset do fuso (em minutos) em relação ao UTC no instante informado */
function offsetMinutos(instante: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const partes: Record<string, string> = {};
  for (const parte of dtf.formatToParts(instante)) {
    if (parte.type !== "literal") partes[parte.type] = parte.value;
  }

  const comoUTC = Date.UTC(
    Number(partes.year),
    Number(partes.month) - 1,
    Number(partes.day),
    Number(partes.hour) % 24,
    Number(partes.minute),
    Number(partes.second)
  );

  const semMs = instante.getTime() - instante.getMilliseconds();
  return (comoUTC - semMs) / 60000;
}

/**
 * Instante UTC correspondente a uma hora de parede no fuso informado.
 *
 * É o inverso de `relogioNoFuso`. Exportado como `instanteNoFuso` logo abaixo:
 * qualquer código que precise montar "dia X às 14:00 na clínica" deve usar isto
 * em vez de `new Date(ano, mes, dia, hora)`, que depende do fuso do processo —
 * UTC em produção.
 */
function instanteDe(
  ano: number,
  mes: number,
  dia: number,
  hora: number,
  minuto: number,
  segundo: number,
  ms: number,
  timeZone: string
): Date {
  const palpite = Date.UTC(ano, mes - 1, dia, hora, minuto, segundo, ms);
  const offset = offsetMinutos(new Date(palpite), timeZone);
  return new Date(palpite - offset * 60000);
}

/** Monta o instante de uma hora de parede no fuso da clínica */
export function instanteNoFuso(
  ano: number,
  mes: number,
  dia: number,
  hora = 0,
  minuto = 0,
  timeZone: string = TZ_CLINICA
): Date {
  return instanteDe(ano, mes, dia, hora, minuto, 0, 0, timeZone);
}

/** Ano/mês/dia de calendário de um instante, no fuso da clínica */
export function partesNoFuso(
  instante: Date = new Date(),
  timeZone: string = TZ_CLINICA
): { ano: number; mes: number; dia: number } {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [ano, mes, dia] = dtf.format(instante).split("-").map(Number);
  return { ano, mes, dia };
}

/**
 * Dia da semana e hora de parede de um instante, no fuso da clínica.
 *
 * Existe porque `instante.getDay()` e `getHours()` usam o fuso do PROCESSO — em
 * produção (Vercel) isso é UTC, e um atendimento de segunda às 08:00 em Brasília
 * seria lido como domingo às 11:00. É o mesmo bug que já deslocou a recorrência
 * em -3h.
 *
 * O dia da semana é derivado da data de calendário já convertida, com
 * `Date.UTC`, para não depender de fuso em nenhum passo.
 */
export function relogioNoFuso(
  instante: Date,
  timeZone: string = TZ_CLINICA
): { diaSemana: number; hhmm: string } {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23", // sem isso, meia-noite pode virar "24" em alguns runtimes
  });
  const partes = dtf.formatToParts(instante);
  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "00";

  const ano = Number(parte("year"));
  const mes = Number(parte("month"));
  const dia = Number(parte("day"));
  const hora = parte("hour").padStart(2, "0");
  const minuto = parte("minute").padStart(2, "0");

  return {
    diaSemana: new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay(),
    hhmm: `${hora}:${minuto}`,
  };
}

/** 00:00:00.000 do dia, no fuso da clínica */
export function inicioDoDia(
  instante: Date = new Date(),
  timeZone: string = TZ_CLINICA
): Date {
  const { ano, mes, dia } = partesNoFuso(instante, timeZone);
  return instanteDe(ano, mes, dia, 0, 0, 0, 0, timeZone);
}

/** 23:59:59.999 do dia, no fuso da clínica */
export function fimDoDia(
  instante: Date = new Date(),
  timeZone: string = TZ_CLINICA
): Date {
  const { ano, mes, dia } = partesNoFuso(instante, timeZone);
  return instanteDe(ano, mes, dia, 23, 59, 59, 999, timeZone);
}

/** 00:00:00.000 do dia 1º do mês informado, no fuso da clínica */
export function inicioDoMesEm(
  ano: number,
  mes: number,
  timeZone: string = TZ_CLINICA
): Date {
  return instanteDe(ano, mes, 1, 0, 0, 0, 0, timeZone);
}

/** Último instante do mês informado, no fuso da clínica */
export function fimDoMesEm(
  ano: number,
  mes: number,
  timeZone: string = TZ_CLINICA
): Date {
  const proximoAno = mes === 12 ? ano + 1 : ano;
  const proximoMes = mes === 12 ? 1 : mes + 1;
  return new Date(inicioDoMesEm(proximoAno, proximoMes, timeZone).getTime() - 1);
}

/** 00:00:00.000 do dia 1º do mês, no fuso da clínica */
export function inicioDoMes(
  instante: Date = new Date(),
  timeZone: string = TZ_CLINICA
): Date {
  const { ano, mes } = partesNoFuso(instante, timeZone);
  return inicioDoMesEm(ano, mes, timeZone);
}

/** Desloca um par ano/mês em N meses para trás */
export function mesesAtras(
  ano: number,
  mes: number,
  quantidade: number
): { ano: number; mes: number } {
  const total = ano * 12 + (mes - 1) - quantidade;
  return { ano: Math.floor(total / 12), mes: (total % 12) + 1 };
}

/** Rótulo "yyyy-MM" do mês de um instante, no fuso da clínica */
export function chaveMes(
  instante: Date = new Date(),
  timeZone: string = TZ_CLINICA
): string {
  const { ano, mes } = partesNoFuso(instante, timeZone);
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

const SO_DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Início do período a partir de um parâmetro de query.
 * - "2026-09-28"  → 00:00 daquele dia no fuso da clínica
 * - ISO completo  → usado como está (o cliente já resolveu o fuso)
 */
export function parseInicioPeriodo(
  param: string,
  timeZone: string = TZ_CLINICA
): Date {
  if (SO_DATA.test(param)) {
    const [ano, mes, dia] = param.split("-").map(Number);
    return instanteDe(ano, mes, dia, 0, 0, 0, 0, timeZone);
  }
  return new Date(param);
}

/**
 * Fim do período a partir de um parâmetro de query.
 * - "2026-09-28"  → 23:59:59.999 daquele dia no fuso da clínica
 * - ISO completo  → usado como está (o cliente já resolveu o fuso)
 */
export function parseFimPeriodo(
  param: string,
  timeZone: string = TZ_CLINICA
): Date {
  if (SO_DATA.test(param)) {
    const [ano, mes, dia] = param.split("-").map(Number);
    return instanteDe(ano, mes, dia, 23, 59, 59, 999, timeZone);
  }
  return new Date(param);
}
