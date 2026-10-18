// Capacidade de sala: cruzamento entre o horário da SALA, a grade dos
// PROFISSIONAIS e o que está AGENDADO (Módulo 27).
//
// A pergunta de gestão é "cabe mais um profissional aqui?". Responder exige
// três camadas no mesmo eixo de tempo:
//
//   sala aberta            → capacidade física
//   ∩ profissional escalado → capacidade atendível (o teto real)
//   − agendado              → o que sobra
//
// E a sobra se divide em duas, que pedem ações opostas:
//
//   livre COM profissional → tem sala e tem gente: falta agendar (comercial)
//   livre SEM profissional → tem sala e não tem gente: cabe contratar
//
// ── Por que intervalos e não "slots" de 30 min
//
// A grade é de meia em meia hora, mas atendimento não: sessão de 50 minutos é
// comum. Marcar slots arredondaria cada uma para 60 min e inflaria a ocupação
// em 20%. Toda conta aqui é álgebra de intervalos em minutos do dia, exata.

import { chaveDia, relogioNoFuso } from "@/lib/datas-fuso";

/** Intervalo em minutos desde a meia-noite, no fuso da clínica. `fim` exclusivo. */
export interface Intervalo {
  ini: number;
  fim: number;
}

const MINUTOS_DO_DIA = 24 * 60;

export const duracao = (xs: Intervalo[]): number =>
  xs.reduce((s, i) => s + Math.max(0, i.fim - i.ini), 0);

/** Une intervalos sobrepostos ou colados. Resultado ordenado e disjunto. */
export function unir(xs: Intervalo[]): Intervalo[] {
  const validos = xs.filter((i) => i.fim > i.ini).sort((a, b) => a.ini - b.ini);
  const saida: Intervalo[] = [];
  for (const i of validos) {
    const ultimo = saida[saida.length - 1];
    if (ultimo && i.ini <= ultimo.fim) ultimo.fim = Math.max(ultimo.fim, i.fim);
    else saida.push({ ...i });
  }
  return saida;
}

/** Interseção de dois conjuntos de intervalos. */
export function intersectar(a: Intervalo[], b: Intervalo[]): Intervalo[] {
  const x = unir(a);
  const y = unir(b);
  const saida: Intervalo[] = [];
  let i = 0;
  let j = 0;
  while (i < x.length && j < y.length) {
    const ini = Math.max(x[i].ini, y[j].ini);
    const fim = Math.min(x[i].fim, y[j].fim);
    if (fim > ini) saida.push({ ini, fim });
    if (x[i].fim < y[j].fim) i++;
    else j++;
  }
  return saida;
}

/** `a` menos `b`. */
export function subtrair(a: Intervalo[], b: Intervalo[]): Intervalo[] {
  const buracos = unir(b);
  const saida: Intervalo[] = [];
  for (const base of unir(a)) {
    let ini = base.ini;
    for (const h of buracos) {
      if (h.fim <= ini) continue;
      if (h.ini >= base.fim) break;
      if (h.ini > ini) saida.push({ ini, fim: Math.min(h.ini, base.fim) });
      ini = Math.max(ini, h.fim);
      if (ini >= base.fim) break;
    }
    if (ini < base.fim) saida.push({ ini, fim: base.fim });
  }
  return saida;
}

export const horaParaMinutos = (hora: string): number => {
  const [h, m] = hora.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};

export interface BlocoSemanal {
  diaSemana: number;
  hora_inicio: string;
  hora_fim: string;
  ativo?: boolean | null;
}

/** Blocos de um dia da semana vira intervalos unidos. */
export function intervalosDoDia(
  blocos: BlocoSemanal[],
  diaSemana: number,
): Intervalo[] {
  return unir(
    blocos
      .filter((b) => b.ativo !== false && b.diaSemana === diaSemana)
      .map((b) => ({
        ini: horaParaMinutos(b.hora_inicio),
        fim: horaParaMinutos(b.hora_fim),
      })),
  );
}

export interface AgendamentoSimples {
  data_hora: Date;
  horario_fim: Date;
}

/**
 * Agendamentos agrupados por dia da clínica, já em minutos do dia.
 *
 * O instante vem do banco em UTC; o dia e a hora têm de sair no fuso da
 * clínica (`relogioNoFuso`), senão um atendimento das 22h cairia no dia
 * seguinte em produção.
 *
 * Atendimento que atravessa a meia-noite é cortado em 24:00 — a sobra iria
 * para o dia seguinte, e nenhuma sessão clínica funciona assim; cortar é mais
 * honesto do que espalhar.
 */
export function agendadoPorDia(
  ags: AgendamentoSimples[],
): Map<string, Intervalo[]> {
  const porDia = new Map<string, Intervalo[]>();
  for (const ag of ags) {
    const dia = chaveDia(ag.data_hora);
    const { hhmm } = relogioNoFuso(ag.data_hora);
    const ini = horaParaMinutos(hhmm);
    const minutos = Math.max(
      0,
      Math.round((ag.horario_fim.getTime() - ag.data_hora.getTime()) / 60000),
    );
    const fim = Math.min(MINUTOS_DO_DIA, ini + minutos);
    const lista = porDia.get(dia) ?? [];
    lista.push({ ini, fim });
    porDia.set(dia, lista);
  }
  for (const [dia, lista] of porDia) porDia.set(dia, unir(lista));
  return porDia;
}

export interface ResultadoCapacidade {
  minutos_capacidade: number;
  minutos_com_profissional: number;
  /** uso dentro do horário da sala */
  minutos_agendados: number;
  /** uso em horário em que a sala está fechada — grade errada ou marcação errada */
  minutos_agendados_fora: number;
  minutos_livres_com_profissional: number;
  minutos_livres_sem_profissional: number;
}

/**
 * Cruza, dia a dia, a grade da sala com a grade dos profissionais e o agendado.
 *
 * `dias` vem de `diasDoPeriodo` (fuso da clínica). `gradeProfissionais` são os
 * blocos de TODOS os profissionais que atendem na filial da sala — inclusive os
 * de bloco coringa (`filialId` nulo), que o chamador já resolveu.
 *
 * As três últimas medidas somam exatamente `minutos_capacidade`:
 * `agendados + livres_com_profissional + livres_sem_profissional`.
 */
export function calcularCapacidade(
  dias: { chave: string; diaSemana: number }[],
  gradeSala: BlocoSemanal[],
  gradeProfissionais: BlocoSemanal[],
  agendadoNoDia: Map<string, Intervalo[]>,
): ResultadoCapacidade {
  let capacidade = 0;
  let comProf = 0;
  let agendado = 0;
  let agendadoFora = 0;
  let livreCom = 0;
  let livreSem = 0;

  // Cache por dia da semana: a grade é semanal, o período tem até 35 dias
  const salaPorDow = new Map<number, Intervalo[]>();
  const profPorDow = new Map<number, Intervalo[]>();

  for (const { chave, diaSemana } of dias) {
    if (!salaPorDow.has(diaSemana))
      salaPorDow.set(diaSemana, intervalosDoDia(gradeSala, diaSemana));
    if (!profPorDow.has(diaSemana))
      profPorDow.set(diaSemana, intervalosDoDia(gradeProfissionais, diaSemana));

    const aberta = salaPorDow.get(diaSemana)!;
    const comGente = intersectar(aberta, profPorDow.get(diaSemana)!);
    const ocupado = agendadoNoDia.get(chave) ?? [];

    capacidade += duracao(aberta);
    comProf += duracao(comGente);

    const dentro = intersectar(ocupado, aberta);
    agendado += duracao(dentro);
    agendadoFora += duracao(subtrair(ocupado, aberta));

    livreCom += duracao(subtrair(comGente, ocupado));
    livreSem += duracao(subtrair(subtrair(aberta, comGente), ocupado));
  }

  return {
    minutos_capacidade: capacidade,
    minutos_com_profissional: comProf,
    minutos_agendados: agendado,
    minutos_agendados_fora: agendadoFora,
    minutos_livres_com_profissional: livreCom,
    minutos_livres_sem_profissional: livreSem,
  };
}

// ── Teto vendável: uma pessoa atende uma sala por vez ────────────────────────
//
// As medidas por sala (acima) tratam cada sala isoladamente, e isso superestima
// o que a clínica pode vender: a grade do profissional não aponta para sala,
// então a mesma hora livre de uma pessoa aparece como "livre com profissional"
// em TODAS as salas abertas naquele horário. Três salas abertas das 08h às 12h
// com um único profissional escalado somam 12h de sobra, quando só 4h são
// vendáveis.
//
// O teto real, a cada minuto, é `min(salas abertas, profissionais disponíveis)`.
// Contar isso exige as duas contagens no mesmo eixo de tempo, por filial —
// profissional de uma unidade não preenche sala de outra.
//
// Implementação: vetor de diferenças por minuto do dia (1440 posições). É exato
// na mesma granularidade do resto (minuto) e custa ~1400 somas por dia/filial,
// contra o custo de varrer fronteiras com lógica de desempate.

const PASSO_DIA = MINUTOS_DO_DIA;

/** Marca [ini, fim) no vetor de diferenças */
function marcar(delta: Int32Array, intervalos: Intervalo[]) {
  for (const i of intervalos) {
    const ini = Math.max(0, Math.min(PASSO_DIA, i.ini));
    const fim = Math.max(0, Math.min(PASSO_DIA, i.fim));
    if (fim <= ini) continue;
    delta[ini] += 1;
    delta[fim] -= 1;
  }
}

export interface Simultaneidade {
  /** sala-minutos de sala aberta (= soma da capacidade das salas) */
  minutos_sala: number;
  /** pessoa-minutos de profissional escalado na unidade */
  minutos_profissional: number;
  /** teto vendável: Σ min(salas abertas, profissionais disponíveis) */
  minutos_efetivos: number;
  /** do teto, quanto já está agendado */
  minutos_agendados: number;
  /** do teto, quanto ainda dá para vender */
  minutos_livres_efetivos: number;
  /** sala aberta que ninguém pode ocupar por falta de gente — cabe contratar */
  minutos_limitados_por_pessoa: number;
  /** profissional escalado sem sala livre, cabe abrir sala */
  minutos_limitados_por_sala: number;
}

/**
 * Cruza, minuto a minuto, QUANTAS salas estão abertas com QUANTOS profissionais
 * estão escalados, dentro de uma mesma unidade.
 *
 * `salas` traz a grade e o agendado de cada sala (o agendado de uma sala já vem
 * unido, então cada sala contribui com no máximo 1 atendimento simultâneo).
 * `profissionais` traz a grade de CADA pessoa separadamente — unir tudo antes
 * perderia a contagem de quantas pessoas existem no mesmo horário.
 */
export function calcularSimultaneidade(
  dias: { chave: string; diaSemana: number }[],
  salas: { grade: BlocoSemanal[]; agendado: Map<string, Intervalo[]> }[],
  profissionais: BlocoSemanal[][],
): Simultaneidade {
  const saida: Simultaneidade = {
    minutos_sala: 0,
    minutos_profissional: 0,
    minutos_efetivos: 0,
    minutos_agendados: 0,
    minutos_livres_efetivos: 0,
    minutos_limitados_por_pessoa: 0,
    minutos_limitados_por_sala: 0,
  };

  const dSala = new Int32Array(PASSO_DIA + 1);
  const dProf = new Int32Array(PASSO_DIA + 1);
  const dAg = new Int32Array(PASSO_DIA + 1);

  // A grade é semanal: os intervalos de cada dia da semana se repetem
  const salaPorDow = new Map<number, Intervalo[][]>();
  const profPorDow = new Map<number, Intervalo[][]>();

  for (const { chave, diaSemana } of dias) {
    if (!salaPorDow.has(diaSemana))
      salaPorDow.set(
        diaSemana,
        salas.map((s) => intervalosDoDia(s.grade, diaSemana)),
      );
    if (!profPorDow.has(diaSemana))
      profPorDow.set(
        diaSemana,
        profissionais.map((g) => intervalosDoDia(g, diaSemana)),
      );

    dSala.fill(0);
    dProf.fill(0);
    dAg.fill(0);

    const abertas = salaPorDow.get(diaSemana)!;
    for (let i = 0; i < salas.length; i++) {
      marcar(dSala, abertas[i]);
      // Atendimento só conta dentro do horário da sala: fora dele a sala não é
      // capacidade, e já aparece em `minutos_agendados_fora` no cálculo por sala
      marcar(dAg, intersectar(salas[i].agendado.get(chave) ?? [], abertas[i]));
    }
    for (const pessoa of profPorDow.get(diaSemana)!) marcar(dProf, pessoa);

    let nSala = 0;
    let nProf = 0;
    let nAg = 0;
    for (let m = 0; m < PASSO_DIA; m++) {
      nSala += dSala[m];
      nProf += dProf[m];
      nAg += dAg[m];
      if (nSala === 0 && nProf === 0) continue;

      const teto = Math.min(nSala, nProf);
      saida.minutos_sala += nSala;
      saida.minutos_profissional += nProf;
      saida.minutos_efetivos += teto;
      // O agendado pode passar do teto (atendimento fora da grade de quem
      // atendeu). Não é erro de conta: é inconsistência de cadastro, e aqui
      // interessa só a parte que cabe no teto.
      const ocupado = Math.min(nAg, teto);
      saida.minutos_agendados += ocupado;
      saida.minutos_livres_efetivos += teto - ocupado;
      saida.minutos_limitados_por_pessoa += Math.max(0, nSala - nProf);
      saida.minutos_limitados_por_sala += Math.max(0, nProf - nSala);
    }
  }

  return saida;
}
