// Motor de conciliação (puro) — casa as guias do demonstrativo com os atendimentos
// pela senha (chave primária) ou número da guia (fallback).

import type { GuiaNormalizada } from "./types";

export type StatusConciliacao = "CONCILIADO" | "CONCILIADO_GLOSA" | "NAO_ENCONTRADO";

/** Atendimento candidato (vindo do banco) usado na conciliação */
export interface AtendimentoIndexavel {
  agendamentoId: string;
  senha: string | null;
  numero_guia: string | null;
}

export interface GuiaConciliada extends GuiaNormalizada {
  agendamentoId: string | null;
  status_conciliacao: StatusConciliacao;
}

export interface ResultadoConciliacao {
  guias: GuiaConciliada[];
  total_guias: number;
  guias_conciliadas: number;      // CONCILIADO + CONCILIADO_GLOSA
  guias_com_glosa: number;        // CONCILIADO_GLOSA
  guias_nao_encontradas: number;  // NAO_ENCONTRADO
}

const norm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const s = v.trim().toUpperCase();
  return s === "" ? null : s;
};

/**
 * Concilia as guias do demonstrativo contra a lista de atendimentos.
 * Match por senha (primário) ou número da guia do prestador (fallback).
 */
export function conciliarGuias(
  guias: GuiaNormalizada[],
  atendimentos: AtendimentoIndexavel[],
): ResultadoConciliacao {
  // Índices para lookup O(1)
  const porSenha = new Map<string, string>();
  const porGuia = new Map<string, string>();
  for (const at of atendimentos) {
    const s = norm(at.senha);
    const g = norm(at.numero_guia);
    if (s && !porSenha.has(s)) porSenha.set(s, at.agendamentoId);
    if (g && !porGuia.has(g)) porGuia.set(g, at.agendamentoId);
  }

  let conciliadas = 0, comGlosa = 0, naoEncontradas = 0;

  const resultado: GuiaConciliada[] = guias.map((guia) => {
    const senhaKey = norm(guia.senha);
    const guiaKey = norm(guia.numero_guia_prestador);

    const agendamentoId =
      (senhaKey && porSenha.get(senhaKey)) ||
      (guiaKey && porGuia.get(guiaKey)) ||
      null;

    let status: StatusConciliacao;
    if (!agendamentoId) {
      status = "NAO_ENCONTRADO";
      naoEncontradas++;
    } else if (guia.valor_glosa > 0) {
      status = "CONCILIADO_GLOSA";
      conciliadas++;
      comGlosa++;
    } else {
      status = "CONCILIADO";
      conciliadas++;
    }

    return { ...guia, agendamentoId, status_conciliacao: status };
  });

  return {
    guias: resultado,
    total_guias: guias.length,
    guias_conciliadas: conciliadas,
    guias_com_glosa: comGlosa,
    guias_nao_encontradas: naoEncontradas,
  };
}

/** Mapeia o código de glosa TISS para a categoria do nosso enum CategoriaGlosa */
export function mapearCategoriaGlosa(codigo: string | null, descricao: string | null): string {
  const texto = `${codigo ?? ""} ${descricao ?? ""}`.toLowerCase();
  if (texto.includes("duplic")) return "DUPLICIDADE";
  if (texto.includes("prazo") || texto.includes("vencid")) return "PRAZO";
  if (texto.includes("autoriz") || texto.includes("senha")) return "ADMINISTRATIVA";
  if (texto.includes("document") || texto.includes("guia") || texto.includes("assinatura")) return "DOCUMENTACAO";
  if (texto.includes("tabela") || texto.includes("valor") || texto.includes("preço") || texto.includes("preco")) return "TABELA";
  if (texto.includes("tecnic") || texto.includes("técnic") || texto.includes("pertin")) return "TECNICA";
  return "OUTROS";
}
