// Série temporal do gráfico: completa os intervalos sem movimento.
//
// A agregação só conhece os intervalos que têm linha. Num passo diário isso
// deixa buraco em todo fim de semana, e "últimos 3 meses" com um mês parado
// renderia duas barras — o eixo passaria a mentir sobre a distância entre os
// pontos. Então o período é percorrido inteiro e o que falta entra zerado.
//
// **Intervalo vazio é zero, não "—".** Parece contradizer a regra de que null
// não é zero, mas são coisas diferentes:
//
//   - atendimento SEM PREÇO cadastrado → `null` ("não sabemos quanto foi")
//   - intervalo SEM ATENDIMENTO        → `0`    ("não houve nada para cobrar")
//
// No primeiro caso falta dado; no segundo o dado existe e vale zero. Por isso
// o preenchimento usa zero explícito em vez de reaproveitar `calcularMetricas`
// com lista vazia, que devolveria `null` para as somas.
//
// Razão (ticket médio) continua `null`: sem denominador não há média.

import { chaveDia, chaveMes, chaveSemana } from "@/lib/datas-fuso";
import {
  formatarChaveDia,
  formatarChaveMes,
  formatarChaveSemana,
} from "@/lib/relatorios/formatacao";
import type {
  Granularidade,
  GrupoRelatorio,
  MetricasAgregadas,
  Metrica,
} from "@/types/relatorio";

const CHAVE: Record<Granularidade, (d: Date) => string> = {
  dia: chaveDia,
  semana: chaveSemana,
  mes: chaveMes,
};

const ROTULO: Record<Granularidade, (chave: string) => string> = {
  dia: formatarChaveDia,
  semana: formatarChaveSemana,
  mes: formatarChaveMes,
};

/**
 * Todos os intervalos do período, em ordem cronológica.
 *
 * Caminha de 12 em 12 horas em vez de montar as datas na mão: a chave é
 * calculada no fuso da clínica (`chaveDia` e companhia), então semana e mês
 * saem certos sem aritmética de calendário. O passo é de meio dia porque um
 * passo de 24h poderia pular um dia num fuso com horário de verão — o `Map`
 * descarta a repetição.
 */
export function intervalosDoPeriodo(
  inicio: Date,
  fim: Date,
  granularidade: Granularidade
): { id: string; rotulo: string }[] {
  const chaveDe = CHAVE[granularidade];
  const rotuloDe = ROTULO[granularidade];
  const vistos = new Map<string, string>();

  for (let t = inicio.getTime(); t <= fim.getTime(); t += 43_200_000) {
    const chave = chaveDe(new Date(t));
    if (!vistos.has(chave)) vistos.set(chave, rotuloDe(chave));
  }
  // O fim do período é 23:59:59.999 e pode cair depois do último passo
  const ultima = chaveDe(fim);
  if (!vistos.has(ultima)) vistos.set(ultima, rotuloDe(ultima));

  return [...vistos].map(([id, rotulo]) => ({ id, rotulo }));
}

function metricasZeradas(metricas: Metrica[]): MetricasAgregadas {
  const saida: MetricasAgregadas = {};
  for (const m of metricas) saida[m.chave] = m.agregacao === "razao" ? null : 0;
  return saida;
}

/**
 * Devolve a série com um grupo por intervalo do período, na ordem do calendário.
 *
 * Grupo que veio da agregação é preservado como está (inclusive os subgrupos);
 * intervalo sem movimento entra zerado e sem subgrupos.
 */
export function preencherLacunas(
  serie: GrupoRelatorio[],
  inicio: Date,
  fim: Date,
  granularidade: Granularidade,
  metricas: Metrica[]
): GrupoRelatorio[] {
  const porId = new Map(serie.filter((g) => g.id !== null).map((g) => [g.id as string, g]));
  const dimensao = serie[0]?.dimensao ?? granularidade;

  const completa = intervalosDoPeriodo(inicio, fim, granularidade).map(
    ({ id, rotulo }): GrupoRelatorio =>
      porId.get(id) ?? {
        dimensao,
        id,
        rotulo,
        nivel: 0,
        linhas: 0,
        metricas: metricasZeradas(metricas),
        semValor: {},
        subgrupos: [],
        detalhe: [],
        detalheTruncado: false,
      }
  );

  // Grupo sem id (data ausente) não pertence a intervalo nenhum: vai para o
  // fim, como a ordenação da agregação já faz. Não deveria existir aqui — a
  // data do atendimento é obrigatória — mas descartar calado faria a soma da
  // série deixar de fechar com o total.
  return [...completa, ...serie.filter((g) => g.id === null)];
}
