// Motor de agregação da Central de Relatórios (Módulo 25).
//
// Puro de propósito: recebe linhas-fonte e uma lista de dimensões, devolve a
// árvore com subtotais por nível e o total geral. Sem Prisma, sem React — dá
// para testar sem banco e serve tanto a tela quanto a exportação.
//
// Duas regras que não são óbvias:
//
//  1. Métrica `razao` (ticket médio) é calculada DEPOIS de somar, em cada
//     nível. Somar os ticket-médios dos filhos daria média de médias, que está
//     errada sempre que os grupos têm tamanhos diferentes.
//
//  2. "Sem valor" não é zero. Um grupo em que nenhuma linha tem preço devolve
//     `null`, não `0`, e `semValor` conta quantas linhas ficaram de fora. Isso
//     vem da decisão de gravar `valor_cobrado = null` quando não há preço
//     cadastrado em vez de travar o atendimento.

import type {
  Dimensao,
  GrupoRelatorio,
  LinhaRelatorio,
  Metrica,
  MetricasAgregadas,
  TotalRelatorio,
} from "@/types/relatorio";

export const MAX_NIVEIS = 3;
export const LIMITE_DETALHE_POR_GRUPO = 500;

/** Rótulo padrão de grupo sem valor na dimensão */
export const ROTULO_SEM_VALOR = "Não informado";

/**
 * Consolida um conjunto de linhas num conjunto de métricas.
 * Duas passadas: primeiro as agregações diretas, depois as razões — que
 * dependem do resultado das diretas.
 */
export function calcularMetricas(
  linhas: LinhaRelatorio[],
  metricas: Metrica[]
): { metricas: MetricasAgregadas; semValor: Record<string, number> } {
  const saida: MetricasAgregadas = {};
  const semValor: Record<string, number> = {};

  for (const m of metricas) {
    switch (m.agregacao) {
      case "contagem": {
        saida[m.chave] = linhas.length;
        break;
      }
      case "soma": {
        let soma = 0;
        let comValor = 0;
        let faltando = 0;
        for (const l of linhas) {
          const v = l.valores[m.chave];
          if (typeof v === "number" && Number.isFinite(v)) {
            soma += v;
            comValor++;
          } else {
            faltando++;
          }
        }
        // nenhuma linha com valor → null (não há informação), não 0
        saida[m.chave] = comValor > 0 ? arredondar(soma) : null;
        if (faltando > 0) semValor[m.chave] = faltando;
        break;
      }
      case "contagemDistinta": {
        const campo = m.campoDistinto ?? m.chave;
        const vistos = new Set<string>();
        for (const l of linhas) {
          const v = l.distintos?.[campo];
          if (v) vistos.add(v);
        }
        saida[m.chave] = vistos.size;
        break;
      }
      case "razao": {
        saida[m.chave] = null; // resolvido na segunda passada
        break;
      }
    }
  }

  for (const m of metricas) {
    if (m.agregacao !== "razao") continue;
    const num = m.numerador ? saida[m.numerador] : null;
    const den = m.denominador ? saida[m.denominador] : null;
    saida[m.chave] =
      typeof num === "number" && typeof den === "number" && den !== 0
        ? arredondar((num / den) * (m.fator ?? 1))
        : null;
  }

  return { metricas: saida, semValor };
}

const arredondar = (n: number): number => Math.round(n * 100) / 100;

/**
 * Ordena rótulos em pt-BR deixando os grupos sem valor no fim da lista.
 *
 * `cronologica` ordena pelo `id` (ex.: "2026-09") em vez do rótulo ("set/2026").
 * Sem isso, "out/2026" viria antes de "set/2026" — alfabético, não cronológico.
 */
function compararGrupos(cronologica: boolean) {
  return (a: GrupoRelatorio, b: GrupoRelatorio): number => {
    if ((a.id === null) !== (b.id === null)) return a.id === null ? 1 : -1;
    if (cronologica && a.id && b.id) return a.id.localeCompare(b.id);
    return a.rotulo.localeCompare(b.rotulo, "pt-BR", { numeric: true });
  };
}

interface OpcoesAgregacao {
  /** inclui as linhas-fonte no nível mais profundo (drill-down da tela) */
  incluirDetalhe?: boolean;
  /** catálogo das dimensões, para saber quais ordenam cronologicamente */
  dimensoes?: Dimensao[];
}

/**
 * Monta a árvore de grupos. `agrupamento` é a ordem dos níveis, no máximo
 * `MAX_NIVEIS`; dimensões repetidas são ignoradas.
 *
 * Devolve o `agrupamento` efetivamente usado — já sem repetição e cortado no
 * limite. A tela monta as colunas a partir dele, então o pedido e a árvore
 * precisam contar a mesma história.
 */
export function agregar(
  linhas: LinhaRelatorio[],
  agrupamento: string[],
  metricas: Metrica[],
  opcoes: OpcoesAgregacao = {}
): { grupos: GrupoRelatorio[]; total: TotalRelatorio; agrupamento: string[] } {
  const cronologicas = new Set(
    (opcoes.dimensoes ?? []).filter((d) => d.cronologica).map((d) => d.chave)
  );
  const niveis: string[] = [];
  for (const chave of agrupamento) {
    if (niveis.length >= MAX_NIVEIS) break;
    if (!niveis.includes(chave)) niveis.push(chave);
  }

  const geral = calcularMetricas(linhas, metricas);
  const total: TotalRelatorio = {
    linhas: linhas.length,
    metricas: geral.metricas,
    semValor: geral.semValor,
  };

  return {
    grupos: construir(linhas, niveis, 0, metricas, opcoes, cronologicas),
    total,
    agrupamento: niveis,
  };
}

function construir(
  linhas: LinhaRelatorio[],
  niveis: string[],
  profundidade: number,
  metricas: Metrica[],
  opcoes: OpcoesAgregacao,
  cronologicas: Set<string>
): GrupoRelatorio[] {
  if (profundidade >= niveis.length) return [];

  const dimensao = niveis[profundidade];
  const baldes = new Map<string, { id: string | null; rotulo: string; linhas: LinhaRelatorio[] }>();

  for (const linha of linhas) {
    const valor = linha.dimensoes[dimensao];
    const id = valor?.id ?? null;
    const rotulo = valor?.rotulo ?? ROTULO_SEM_VALOR;
    // Agrupa por id quando existe; sem id, pelo rótulo (prefixo evita colisão
    // com um id que por acaso seja igual a um rótulo)
    const chave = id !== null ? `id:${id}` : `rotulo:${rotulo}`;

    const balde = baldes.get(chave);
    if (balde) balde.linhas.push(linha);
    else baldes.set(chave, { id, rotulo, linhas: [linha] });
  }

  const ehFolha = profundidade === niveis.length - 1;

  const grupos: GrupoRelatorio[] = [];
  for (const balde of baldes.values()) {
    const { metricas: agregadas, semValor } = calcularMetricas(balde.linhas, metricas);
    const detalhe =
      ehFolha && opcoes.incluirDetalhe ? balde.linhas.slice(0, LIMITE_DETALHE_POR_GRUPO) : [];

    grupos.push({
      dimensao,
      id: balde.id,
      rotulo: balde.rotulo,
      nivel: profundidade,
      linhas: balde.linhas.length,
      metricas: agregadas,
      semValor,
      subgrupos: ehFolha
        ? []
        : construir(balde.linhas, niveis, profundidade + 1, metricas, opcoes, cronologicas),
      detalhe,
      detalheTruncado: ehFolha && balde.linhas.length > LIMITE_DETALHE_POR_GRUPO,
    });
  }

  return grupos.sort(compararGrupos(cronologicas.has(dimensao)));
}

/** Achata a árvore em linhas planas — usado pela exportação (Fase 4) */
export function achatar(grupos: GrupoRelatorio[]): GrupoRelatorio[] {
  const saida: GrupoRelatorio[] = [];
  const andar = (lista: GrupoRelatorio[]) => {
    for (const g of lista) {
      saida.push(g);
      andar(g.subgrupos);
    }
  };
  andar(grupos);
  return saida;
}
