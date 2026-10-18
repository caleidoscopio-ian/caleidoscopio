// Catálogo da Central de Relatórios (Módulo 25).
//
// Cada relatório é uma DECLARAÇÃO, não uma página. Adicionar o 7º relatório é
// acrescentar uma entrada aqui — o índice, a barra de filtros, o seletor de
// agrupamento, a tabela e (Fase 4) a exportação se montam a partir disto.
//
// Este arquivo é importado pelo servidor E pelo cliente: só dado serializável.
// O ícone vai como string e é resolvido em `@/components/relatorios/icones`.

import type { ColunaDetalhe, Dimensao, Metrica } from "@/types/relatorio";

/** De onde o relatório tira as linhas-fonte */
export type FonteRelatorio =
  | "atendimentos" // agendamentos ATENDIDO — relatórios 1 e 6
  | "repasse" // Fase 2
  | "faltas" // Fase 6
  | "externo"; // mora fora da central; o catálogo apenas indexa

export type ChaveFiltro =
  | "periodo"
  | "filialId"
  | "profissionalId"
  | "convenioId"
  | "especialidade"
  | "procedimentoId"
  | "status";

export interface DefinicaoRelatorio {
  slug: string;
  titulo: string;
  descricao: string;
  /** RBAC: slug do recurso em prisma/seed-rbac.ts */
  recurso: string;
  /** RBAC: action-key de src/lib/auth/action-map.ts */
  acaoVisualizar: string;
  fonte: FonteRelatorio;
  icone: string;
  cor: string;
  dimensoes: Dimensao[];
  metricas: Metrica[];
  filtros: ChaveFiltro[];
  agrupamentoPadrao: string[];
  /** colunas do detalhamento linha a linha, no nível mais profundo */
  colunasDetalhe: ColunaDetalhe[];
  /** status de agendamento travado pelo relatório (o usuário não escolhe) */
  statusFixo?: string[];
  disponivel: boolean;
  /** quando o relatório já existe fora da central */
  hrefExterno?: string;
  /** texto do card quando `disponivel` é false */
  motivoIndisponivel?: string;
  ordem: number;
}

// Dimensões reaproveitadas pela fonte `atendimentos`

const DIM_FILIAL: Dimensao = { chave: "filial", rotulo: "Filial", rotuloVazio: "Sem filial" };
const DIM_ESPECIALIDADE: Dimensao = {
  chave: "especialidade",
  rotulo: "Especialidade",
  rotuloVazio: "Sem especialidade",
};
const DIM_PROFISSIONAL: Dimensao = { chave: "profissional", rotulo: "Profissional" };
const DIM_PARCEIRO: Dimensao = {
  chave: "parceiro",
  rotulo: "Parceiro de negócio",
  rotuloVazio: "Particular",
};
const DIM_PROCEDIMENTO: Dimensao = {
  chave: "procedimento",
  rotulo: "Procedimento",
  rotuloVazio: "Sem procedimento",
};
const DIM_PACIENTE: Dimensao = { chave: "paciente", rotulo: "Paciente" };
const DIM_SALA: Dimensao = { chave: "sala", rotulo: "Sala" };
// `cronologica` faz a agregação ordenar por "2026-09" em vez de "set/2026" —
// sem isso outubro vinha antes de setembro, por ordem alfabética.
export const DIM_MES: Dimensao = { chave: "mes", rotulo: "Mês", cronologica: true };

/** Dimensões de tempo usadas só pela série do gráfico, não pelo agrupamento */
export const DIM_DIA: Dimensao = { chave: "dia", rotulo: "Dia", cronologica: true };
export const DIM_SEMANA: Dimensao = { chave: "semana", rotulo: "Semana", cronologica: true };
const DIM_REGRA: Dimensao = {
  chave: "regra",
  rotulo: "Regra de repasse",
  rotuloVazio: "Sem regra cadastrada",
};

const DIMENSOES_ATENDIMENTO: Dimensao[] = [
  DIM_FILIAL,
  DIM_ESPECIALIDADE,
  DIM_PROFISSIONAL,
  DIM_PARCEIRO,
  DIM_PROCEDIMENTO,
  DIM_PACIENTE,
  DIM_SALA,
  DIM_MES,
];

// Métricas da fonte `atendimentos`

const METRICAS_ATENDIMENTO: Metrica[] = [
  {
    chave: "quantidade",
    rotulo: "Atendimentos",
    tipo: "contagem",
    agregacao: "contagem",
    padrao: true,
  },
  {
    chave: "valor_total",
    rotulo: "Valor total",
    tipo: "moeda",
    agregacao: "soma",
    padrao: true,
  },
  {
    chave: "ticket_medio",
    rotulo: "Ticket médio",
    tipo: "moeda",
    agregacao: "razao",
    numerador: "valor_total",
    denominador: "quantidade",
    padrao: true,
  },
  {
    chave: "pacientes",
    rotulo: "Pacientes",
    tipo: "contagem",
    agregacao: "contagemDistinta",
    campoDistinto: "paciente",
    padrao: true,
  },
  {
    chave: "duracao_total",
    rotulo: "Tempo atendido",
    tipo: "duracao",
    agregacao: "soma",
    padrao: false,
  },
];

// Colunas do detalhamento. `avisoQuandoZero` aponta para um campo irmão de
// `detalhe`: valendo 0, a célula ganha um ícone explicando por que aquele número
// não está congelado.

const DETALHE_ATENDIMENTO: ColunaDetalhe[] = [
  { chave: "data", rotulo: "Data", tipo: "data" },
  { chave: "paciente", rotulo: "Paciente", tipo: "texto" },
  { chave: "profissional", rotulo: "Profissional", tipo: "texto" },
  { chave: "procedimento", rotulo: "Procedimento", tipo: "texto" },
  { chave: "parceiro", rotulo: "Parceiro", tipo: "texto" },
  {
    chave: "valor",
    rotulo: "Valor",
    tipo: "moeda",
    avisoQuandoZero: "valor_carimbado",
    avisoTexto:
      "Valor recalculado da tabela atual — este atendimento é anterior ao carimbo de valor, então não está congelado.",
  },
];

const DETALHE_REPASSE: ColunaDetalhe[] = [
  { chave: "data", rotulo: "Data", tipo: "data" },
  { chave: "paciente", rotulo: "Paciente", tipo: "texto" },
  { chave: "profissional", rotulo: "Profissional", tipo: "texto" },
  { chave: "procedimento", rotulo: "Procedimento", tipo: "texto" },
  { chave: "parceiro", rotulo: "Parceiro", tipo: "texto" },
  { chave: "regra", rotulo: "Regra aplicada", tipo: "texto" },
  {
    chave: "valor",
    rotulo: "Bruto",
    tipo: "moeda",
    avisoQuandoZero: "valor_carimbado",
    avisoTexto:
      "Valor recalculado da tabela atual — este atendimento é anterior ao carimbo de valor, então não está congelado.",
  },
  { chave: "valor_repasse", rotulo: "Repasse", tipo: "moeda" },
  { chave: "valor_liquido", rotulo: "Líquido", tipo: "moeda" },
];

const FILTROS_ATENDIMENTO: ChaveFiltro[] = [
  "periodo",
  "filialId",
  "profissionalId",
  "convenioId",
  "especialidade",
  "procedimentoId",
];

// Métricas do repasse. `valor_total` é reusado como "Valor bruto" para não
// duplicar o dado que a fonte de atendimentos já calcula.

const METRICAS_REPASSE: Metrica[] = [
  {
    chave: "quantidade",
    rotulo: "Atendimentos",
    tipo: "contagem",
    agregacao: "contagem",
    padrao: true,
  },
  { chave: "valor_total", rotulo: "Valor bruto", tipo: "moeda", agregacao: "soma", padrao: true },
  {
    chave: "valor_repasse",
    rotulo: "A pagar ao profissional",
    tipo: "moeda",
    agregacao: "soma",
    padrao: true,
  },
  {
    chave: "valor_liquido",
    rotulo: "Líquido da clínica",
    tipo: "moeda",
    agregacao: "soma",
    padrao: true,
  },
  {
    chave: "percentual_repasse",
    rotulo: "% de repasse",
    tipo: "percentual",
    agregacao: "razao",
    numerador: "valor_repasse",
    denominador: "valor_total",
    fator: 100,
    padrao: false,
  },
];

// Métricas de faltas: contadores somáveis mais duas taxas. As taxas são
// `razao` com fator 100 e, por isso, recalculadas em cada nível — somar
// percentuais dos filhos daria média de médias.

const METRICAS_FALTAS: Metrica[] = [
  {
    chave: "esperados",
    rotulo: "Esperados",
    tipo: "contagem",
    agregacao: "soma",
    padrao: true,
  },
  { chave: "atendidos", rotulo: "Compareceu", tipo: "contagem", agregacao: "soma", padrao: true },
  { chave: "faltas", rotulo: "Faltas", tipo: "contagem", agregacao: "soma", padrao: true },
  {
    chave: "taxa_falta",
    rotulo: "% de falta",
    tipo: "percentual",
    agregacao: "razao",
    numerador: "faltas",
    denominador: "esperados",
    fator: 100,
    padrao: true,
  },
  {
    chave: "cancelados",
    rotulo: "Cancelados",
    tipo: "contagem",
    agregacao: "soma",
    padrao: false,
  },
  {
    chave: "quantidade",
    rotulo: "Total agendado",
    tipo: "contagem",
    agregacao: "contagem",
    padrao: false,
  },
  {
    chave: "taxa_cancelamento",
    rotulo: "% de cancelamento",
    tipo: "percentual",
    agregacao: "razao",
    numerador: "cancelados",
    denominador: "quantidade",
    fator: 100,
    padrao: false,
  },
];

const DETALHE_FALTAS: ColunaDetalhe[] = [
  { chave: "data", rotulo: "Data", tipo: "data" },
  { chave: "paciente", rotulo: "Paciente", tipo: "texto" },
  { chave: "profissional", rotulo: "Profissional", tipo: "texto" },
  { chave: "procedimento", rotulo: "Procedimento", tipo: "texto" },
  { chave: "parceiro", rotulo: "Parceiro", tipo: "texto" },
  { chave: "status", rotulo: "Desfecho", tipo: "texto" },
  { chave: "motivo_falta", rotulo: "Motivo da falta", tipo: "texto" },
];

// O catálogo

export const RELATORIOS: DefinicaoRelatorio[] = [
  {
    slug: "atendimentos",
    titulo: "Atendimentos por especialidade e filial",
    descricao:
      "Quantidade e valor dos atendimentos realizados, com quebra por filial, especialidade, profissional e parceiro de negócio.",
    recurso: "relatorios",
    acaoVisualizar: "view_reports",
    fonte: "atendimentos",
    icone: "stethoscope",
    cor: "blue",
    dimensoes: DIMENSOES_ATENDIMENTO,
    metricas: METRICAS_ATENDIMENTO,
    filtros: FILTROS_ATENDIMENTO,
    agrupamentoPadrao: ["filial", "especialidade"],
    colunasDetalhe: DETALHE_ATENDIMENTO,
    statusFixo: ["ATENDIDO"],
    disponivel: true,
    ordem: 1,
  },
  {
    slug: "repasse",
    titulo: "A pagar ao terapeuta (repasse)",
    descricao:
      "Valor devido a cada profissional por atendimento realizado, com a regra de repasse aplicada e o líquido da clínica.",
    recurso: "relatorios",
    acaoVisualizar: "view_reports",
    fonte: "repasse",
    icone: "hand-coins",
    cor: "emerald",
    dimensoes: [
      DIM_PROFISSIONAL,
      DIM_REGRA,
      DIM_PROCEDIMENTO,
      DIM_PARCEIRO,
      DIM_PACIENTE,
      DIM_ESPECIALIDADE,
      DIM_FILIAL,
      DIM_MES,
    ],
    metricas: METRICAS_REPASSE,
    filtros: FILTROS_ATENDIMENTO,
    agrupamentoPadrao: ["profissional", "procedimento"],
    colunasDetalhe: DETALHE_REPASSE,
    statusFixo: ["ATENDIDO"],
    disponivel: true,
    ordem: 2,
  },
  {
    slug: "parceiro-negocio",
    titulo: "Produção por parceiro de negócio",
    descricao:
      "Produção consolidada por convênio, com Particular como entrada própria: quantidade, valor bruto, repasse e líquido da clínica.",
    recurso: "relatorios",
    acaoVisualizar: "view_reports",
    // Mesma fonte do repasse, não a de atendimentos: o relatório 6 pede bruto,
    // repasse e líquido por parceiro — a diferença entre ele e o relatório 2 é
    // só a ordem do agrupamento.
    fonte: "repasse",
    icone: "handshake",
    cor: "violet",
    dimensoes: [
      DIM_PARCEIRO,
      DIM_PROCEDIMENTO,
      DIM_PROFISSIONAL,
      DIM_ESPECIALIDADE,
      DIM_FILIAL,
      DIM_PACIENTE,
      DIM_MES,
    ],
    metricas: METRICAS_REPASSE,
    filtros: FILTROS_ATENDIMENTO,
    agrupamentoPadrao: ["parceiro", "procedimento"],
    colunasDetalhe: DETALHE_REPASSE,
    statusFixo: ["ATENDIDO"],
    disponivel: true,
    ordem: 3,
  },
  {
    slug: "faltas",
    titulo: "Faltas de pacientes",
    descricao:
      "Faltas por paciente e consolidado da clínica, com a taxa calculada sobre os horários em que o paciente era esperado.",
    recurso: "relatorios",
    acaoVisualizar: "view_reports",
    fonte: "faltas",
    icone: "user-x",
    cor: "amber",
    dimensoes: [
      DIM_PACIENTE,
      DIM_PROFISSIONAL,
      DIM_FILIAL,
      DIM_PARCEIRO,
      DIM_ESPECIALIDADE,
      DIM_PROCEDIMENTO,
      DIM_MES,
    ],
    metricas: METRICAS_FALTAS,
    filtros: FILTROS_ATENDIMENTO,
    agrupamentoPadrao: ["paciente"],
    colunasDetalhe: DETALHE_FALTAS,
    // Conta os três desfechos: sem o atendido não há denominador para a taxa.
    statusFixo: ["ATENDIDO", "FALTOU", "CANCELADO"],
    disponivel: true,
    ordem: 4,
  },

  // Relatórios que já existem fora da central.
  // Decisão 3 do plano: não reconstruir agora. A central indexa; a Fase 7
  // avalia trazer para dentro da casca.
  {
    slug: "produtividade-profissionais",
    titulo: "Produtividade e ranking de profissionais",
    descricao:
      "Taxa de agendamento por profissional, com comparativo entre a grade configurada e o que foi efetivamente marcado.",
    recurso: "agenda",
    acaoVisualizar: "view_schedule",
    fonte: "externo",
    icone: "trending-up",
    cor: "orange",
    dimensoes: [],
    metricas: [],
    filtros: [],
    agrupamentoPadrao: [],
    colunasDetalhe: [],
    disponivel: true,
    hrefExterno: "/taxa-ocupacao",
    ordem: 5,
  },
  {
    slug: "ocupacao-salas",
    titulo: "Ocupação de salas",
    descricao:
      "Mapa de ocupação diário e semanal por sala e por unidade, com indicadores de aproveitamento.",
    recurso: "salas",
    acaoVisualizar: "view_rooms",
    fonte: "externo",
    icone: "door-open",
    cor: "cyan",
    dimensoes: [],
    metricas: [],
    filtros: [],
    agrupamentoPadrao: [],
    colunasDetalhe: [],
    disponivel: true,
    hrefExterno: "/salas/mapa-ocupacao",
    ordem: 6,
  },
  {
    slug: "historico-atendimentos",
    titulo: "Histórico de atendimentos",
    descricao:
      "Lista detalhada atendimento a atendimento, com tempo de espera, duração real e identificadores de faturamento.",
    recurso: "relatorios",
    acaoVisualizar: "view_reports",
    fonte: "externo",
    icone: "receipt-text",
    cor: "slate",
    dimensoes: [],
    metricas: [],
    filtros: [],
    agrupamentoPadrao: [],
    colunasDetalhe: [],
    disponivel: true,
    hrefExterno: "/historico-atendimentos",
    ordem: 7,
  },
  {
    slug: "profissionais-pdf",
    titulo: "Relatório de profissionais (PDF)",
    descricao:
      "Atendimentos realizados por terapeuta no período, em formato pronto para impressão e envio.",
    recurso: "relatorios",
    acaoVisualizar: "view_reports",
    fonte: "externo",
    icone: "file-text",
    cor: "rose",
    dimensoes: [],
    metricas: [],
    filtros: [],
    agrupamentoPadrao: [],
    colunasDetalhe: [],
    disponivel: true,
    hrefExterno: "/relatorios/profissionais",
    ordem: 8,
  },
];

export const RELATORIOS_ORDENADOS = [...RELATORIOS].sort((a, b) => a.ordem - b.ordem);

export function buscarDefinicao(slug: string): DefinicaoRelatorio | null {
  return RELATORIOS.find((r) => r.slug === slug) ?? null;
}

/** Relatórios que a casca genérica sabe renderizar */
export function definicaoNaCentral(slug: string): DefinicaoRelatorio | null {
  const d = buscarDefinicao(slug);
  if (!d || d.fonte === "externo" || !d.disponivel) return null;
  return d;
}

export function metricasPadrao(d: DefinicaoRelatorio): string[] {
  return d.metricas.filter((m) => m.padrao).map((m) => m.chave);
}
