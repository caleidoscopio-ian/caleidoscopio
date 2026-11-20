/**
 * Filtro e navegação das tarefas na aplicação de uma avaliação (AVA-01).
 *
 * A avaliação se organiza em nível › habilidade (a "atividade" da tela, ex.:
 * OUVINTE) › tarefa. O VB-MAPP tem 150 tarefas em 3 níveis e 16 habilidades;
 * o Socially Savvy tem 110 tarefas e nenhum nível. Por isso cada dimensão só
 * vira filtro quando a avaliação de fato a usa.
 *
 * Funções puras: a tela guarda só o filtro escolhido e a tarefa atual.
 */

export const TODOS = "__todos__";
/** Chave das tarefas sem nível ou sem habilidade cadastrada. */
export const SEM = "__sem__";

export interface TarefaFiltravel {
  id: string;
  nivel: { id: string; ordem: number; descricao: string } | null;
  habilidade: { id: string; ordem: number; habilidade: string } | null;
}

export interface Filtro {
  nivel: string;
  habilidade: string;
}

export interface OpcaoFiltro {
  valor: string;
  rotulo: string;
}

export const chaveNivel = (t: TarefaFiltravel) => t.nivel?.id ?? SEM;
export const chaveHabilidade = (t: TarefaFiltravel) => t.habilidade?.id ?? SEM;

// Sem nível/habilidade vai para o fim, depois de tudo que tem ordem
const ordemNivel = (t: TarefaFiltravel) => t.nivel?.ordem ?? Number.POSITIVE_INFINITY;
const ordemHabilidade = (t: TarefaFiltravel) => t.habilidade?.ordem ?? Number.POSITIVE_INFINITY;

function opcoesUnicas(
  tarefas: TarefaFiltravel[],
  chave: (t: TarefaFiltravel) => string,
  ordem: (t: TarefaFiltravel) => number,
  rotulo: (t: TarefaFiltravel) => string
): OpcaoFiltro[] {
  const vistas = new Map<string, { ordem: number; rotulo: string }>();
  for (const t of tarefas) {
    const k = chave(t);
    if (!vistas.has(k)) vistas.set(k, { ordem: ordem(t), rotulo: rotulo(t) });
  }
  return [...vistas.entries()]
    .sort((a, b) => a[1].ordem - b[1].ordem || a[1].rotulo.localeCompare(b[1].rotulo, "pt-BR"))
    .map(([valor, v]) => ({ valor, rotulo: v.rotulo }));
}

export const opcoesNivel = (tarefas: TarefaFiltravel[]) =>
  opcoesUnicas(tarefas, chaveNivel, ordemNivel, (t) => t.nivel?.descricao ?? "Sem nível");

export const opcoesHabilidade = (tarefas: TarefaFiltravel[]) =>
  opcoesUnicas(tarefas, chaveHabilidade, ordemHabilidade, (t) => t.habilidade?.habilidade ?? "Sem atividade");

/** A dimensão só vira filtro se ao menos uma tarefa a tiver preenchida. */
export const usaDimensao = (opcoes: OpcaoFiltro[]) => opcoes.some((o) => o.valor !== SEM);

export function filtrarPorNivel<T extends TarefaFiltravel>(tarefas: T[], nivel: string): T[] {
  return nivel === TODOS ? tarefas : tarefas.filter((t) => chaveNivel(t) === nivel);
}

export function filtrarTarefas<T extends TarefaFiltravel>(tarefas: T[], filtro: Filtro): T[] {
  const doNivel = filtrarPorNivel(tarefas, filtro.nivel);
  return filtro.habilidade === TODOS
    ? doNivel
    : doNivel.filter((t) => chaveHabilidade(t) === filtro.habilidade);
}

/**
 * Troca de nível mantém a habilidade só se ela existir no nível novo — a
 * Atividade depende do Nível, como no filtro do plano terapêutico.
 */
export function trocarNivel(tarefas: TarefaFiltravel[], filtro: Filtro, nivel: string): Filtro {
  const habilidadeExiste =
    filtro.habilidade === TODOS ||
    filtrarPorNivel(tarefas, nivel).some((t) => chaveHabilidade(t) === filtro.habilidade);
  return { nivel, habilidade: habilidadeExiste ? filtro.habilidade : TODOS };
}

/**
 * Os grupos na granularidade do filtro atual, em ordem de aplicação:
 * nível e atividade escolhidos → pares (nível, atividade); só um deles → os
 * valores daquela dimensão; nenhum → não há grupos (a lista é a avaliação).
 */
export function gruposNaGranularidade(tarefas: TarefaFiltravel[], filtro: Filtro): Filtro[] {
  const porNivel = filtro.nivel !== TODOS;
  const porHabilidade = filtro.habilidade !== TODOS;
  if (!porNivel && !porHabilidade) return [];

  const ordenadas = [...tarefas].sort((a, b) =>
    porNivel && porHabilidade
      ? ordemNivel(a) - ordemNivel(b) || ordemHabilidade(a) - ordemHabilidade(b)
      : porNivel
        ? ordemNivel(a) - ordemNivel(b)
        : ordemHabilidade(a) - ordemHabilidade(b)
  );

  const grupos: Filtro[] = [];
  const vistos = new Set<string>();
  for (const t of ordenadas) {
    const g: Filtro = {
      nivel: porNivel ? chaveNivel(t) : TODOS,
      habilidade: porHabilidade ? chaveHabilidade(t) : TODOS,
    };
    const k = `${g.nivel}|${g.habilidade}`;
    if (!vistos.has(k)) {
      vistos.add(k);
      grupos.push(g);
    }
  }
  return grupos;
}

/** O grupo que vem depois do filtro atual, ou `null` no último. */
export function proximoGrupo(tarefas: TarefaFiltravel[], filtro: Filtro): Filtro | null {
  const grupos = gruposNaGranularidade(tarefas, filtro);
  const i = grupos.findIndex((g) => g.nivel === filtro.nivel && g.habilidade === filtro.habilidade);
  return i >= 0 && i < grupos.length - 1 ? grupos[i + 1] : null;
}

/**
 * Onde a tela abre: o primeiro grupo (nível + atividade, só das dimensões em
 * uso) que ainda tem tarefa sem resposta, já posicionado nessa tarefa. Quem
 * retoma uma avaliação pela metade cai onde parou.
 */
export function posicaoInicial(
  tarefas: TarefaFiltravel[],
  respondida: (tarefaId: string) => boolean
): { filtro: Filtro; tarefaId: string | null } {
  const comNivel = usaDimensao(opcoesNivel(tarefas));
  const comHabilidade = usaDimensao(opcoesHabilidade(tarefas));
  const granularidade: Filtro = {
    nivel: comNivel ? SEM : TODOS, // qualquer valor ≠ TODOS liga a dimensão
    habilidade: comHabilidade ? SEM : TODOS,
  };
  const grupos = gruposNaGranularidade(tarefas, granularidade);

  if (grupos.length === 0) {
    const pendente = tarefas.find((t) => !respondida(t.id));
    return { filtro: { nivel: TODOS, habilidade: TODOS }, tarefaId: (pendente ?? tarefas[0])?.id ?? null };
  }

  for (const g of grupos) {
    const pendente = filtrarTarefas(tarefas, g).find((t) => !respondida(t.id));
    if (pendente) return { filtro: g, tarefaId: pendente.id };
  }
  // Tudo respondido: abre no começo
  return { filtro: grupos[0], tarefaId: filtrarTarefas(tarefas, grupos[0])[0]?.id ?? null };
}
