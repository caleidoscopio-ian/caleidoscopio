// Tipos da Central de Relatórios (Módulo 25).
//
// A central não tem uma tela por relatório: cada relatório é uma DECLARAÇÃO no
// catálogo (`@/lib/relatorios/definicoes`) e a mesma casca renderiza todos.
// Por isso tudo aqui é serializável — nada de função atravessando o wire.

/** Como o valor é apresentado */
export type TipoMetrica = "contagem" | "moeda" | "numero" | "percentual" | "duracao";

/** Como o valor é consolidado ao subir de nível */
export type ModoAgregacao =
  | "contagem"          // quantas linhas-fonte caíram no grupo
  | "soma"              // soma dos valores das linhas
  | "razao"             // numerador / denominador, recalculado em cada nível
  | "contagemDistinta"; // quantos valores diferentes de um campo

export interface Dimensao {
  chave: string;
  rotulo: string;
  /** rótulo usado quando a linha não tem valor para esta dimensão */
  rotuloVazio?: string;
  /**
   * Ordenar pelo `id` em vez do rótulo.
   *
   * Dimensão de tempo guarda um id ordenável ("2026-09") e um rótulo legível
   * ("set/2026"). Ordenar pelo rótulo colocaria "out/2026" antes de "set/2026",
   * que é alfabético e errado.
   */
  cronologica?: boolean;
}

export interface Metrica {
  chave: string;
  rotulo: string;
  tipo: TipoMetrica;
  agregacao: ModoAgregacao;
  /** `razao`: chaves de outras métricas. Dividir depois de somar evita média de médias. */
  numerador?: string;
  denominador?: string;
  /** `razao`: multiplicador aplicado depois da divisão — 100 para percentual */
  fator?: number;
  /** `contagemDistinta`: campo em `LinhaRelatorio.distintos` */
  campoDistinto?: string;
  /** coluna visível antes de o usuário mexer nas preferências */
  padrao?: boolean;
}

export interface ValorDimensao {
  /** null = a linha não tem esse atributo (ex.: profissional sem filial carimbada) */
  id: string | null;
  rotulo: string;
}

/** Uma linha-fonte: um atendimento, um item de repasse. Ainda não agregada. */
export interface LinhaRelatorio {
  id: string;
  dimensoes: Record<string, ValorDimensao>;
  /** valores das métricas de `soma`. null = sem valor, que é estado normal. */
  valores: Record<string, number | null>;
  /** chaves para `contagemDistinta` (ex.: { paciente: "<uuid>" }) */
  distintos?: Record<string, string>;
  /** colunas do detalhamento linha a linha */
  detalhe?: Record<string, string | number | null>;
  /**
   * Instante do evento (ISO), para a série temporal do gráfico.
   *
   * Campo próprio em vez de ler `detalhe.data`: o detalhe existe para exibição
   * e pode mudar de forma por relatório; a série temporal não pode depender
   * disso.
   */
  quando?: string;
}

export type MetricasAgregadas = Record<string, number | null>;

export interface GrupoRelatorio {
  /** chave da dimensão que formou este nível */
  dimensao: string;
  id: string | null;
  rotulo: string;
  nivel: number;
  /** quantas linhas-fonte este grupo abrange (inclusive subgrupos) */
  linhas: number;
  metricas: MetricasAgregadas;
  /** por métrica de soma: quantas linhas vieram sem valor — "—" não é zero */
  semValor: Record<string, number>;
  subgrupos: GrupoRelatorio[];
  /** preenchido só no nível mais profundo, e só se o detalhe foi pedido */
  detalhe: LinhaRelatorio[];
  detalheTruncado: boolean;
}

export interface TotalRelatorio {
  linhas: number;
  metricas: MetricasAgregadas;
  semValor: Record<string, number>;
}

export type Granularidade = "dia" | "semana" | "mes";

/**
 * O que o usuário escolhe: um passo fixo ou "automático".
 *
 * "auto" não é uma granularidade — é a ausência de escolha, resolvida pelo
 * servidor conforme o período (até 30 dias corridos → dia, acima → mês). Fica
 * separada de `Granularidade` justamente para o resto do código nunca precisar
 * tratar "auto" como se fosse um passo real.
 */
export type GranularidadePreferida = Granularidade | "auto";

export const GRANULARIDADES: Granularidade[] = ["dia", "semana", "mes"];

export const ehGranularidade = (v: unknown): v is Granularidade =>
  typeof v === "string" && (GRANULARIDADES as string[]).includes(v);

export interface ResultadoRelatorio {
  slug: string;
  agrupamento: string[];
  grupos: GrupoRelatorio[];
  total: TotalRelatorio;
  periodo: { inicio: string; fim: string };
  /** avisos para o usuário: carimbo ausente, limite de linhas, etc. */
  avisos: string[];
  /**
   * Evolução no tempo, independente do agrupamento escolhido.
   *
   * Mesma forma de `grupos` — cada entrada é um intervalo (dia, semana ou mês)
   * e os `subgrupos` quebram pelo primeiro nível do agrupamento, para o gráfico
   * poder empilhar.
   */
  serie: GrupoRelatorio[];
  /** passo efetivo da série: o que o usuário pediu, ou o automático */
  granularidade: Granularidade;
}

/** Opções que alimentam os dropdowns da barra de filtros */
export interface OpcoesRelatorio {
  filiais: { id: string; nome: string }[];
  profissionais: { id: string; nome: string }[];
  convenios: { id: string; nome: string }[];
  procedimentos: { id: string; nome: string }[];
  especialidades: string[];
  /** false = o usuário está preso à própria filial e o seletor fica travado */
  podeTrocarFilial: boolean;
  filialFixa: string | null;
}

/** Estado da barra de filtros. Datas como Date; a serialização para a query
 *  string acontece em um lugar só, na casca da página. */
export interface FiltrosRelatorio {
  dataInicio: Date;
  dataFim: Date;
  filialId: string | null;
  profissionalId: string | null;
  /** "particular" = pacientes sem convênio */
  convenioId: string | null;
  especialidade: string | null;
  procedimentoId: string | null;
}

/** Uma coluna do detalhamento linha a linha, lida de `LinhaRelatorio.detalhe` */
export interface ColunaDetalhe {
  chave: string;
  rotulo: string;
  tipo: "texto" | "data" | "moeda" | "duracao" | "numero";
  /** campo irmão em `detalhe`; valendo 0, a célula ganha um ícone de aviso */
  avisoQuandoZero?: string;
  avisoTexto?: string;
}
