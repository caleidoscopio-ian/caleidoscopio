"use client";

// Preferências de visualização de um relatório (Módulo 25, Fase 5).
//
// Guarda colunas visíveis, agrupamento e tipo de gráfico por relatório.
//
// Persistência em localStorage, com a chave incluindo o id do usuário: num
// computador de recepção compartilhado, o layout de uma pessoa não aparece para
// a seguinte. Não é por conta, é por navegador — trocar de máquina recomeça do
// padrão do catálogo.
//
// Guardar no banco exigiria tabela nova, e o CLAUDE.md trata alteração de schema
// como passo manual. Para preferência de layout o custo não se justifica; se a
// clínica quiser o mesmo layout em qualquer máquina, aí vale a tabela.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MAX_NIVEIS } from "@/lib/relatorios/agregacao";
import type { DefinicaoRelatorio } from "@/lib/relatorios/definicoes";
import { ehGranularidade } from "@/types/relatorio";
import type { GranularidadePreferida } from "@/types/relatorio";

export type TipoGrafico = "nenhum" | "barras" | "barras-empilhadas" | "pizza";

/**
 * O que vai no eixo x do gráfico.
 *
 * "tempo": a evolução dentro do período (dia/semana/mês, escolhido pelo
 * servidor conforme a largura do intervalo). "grupo": o consolidado por
 * dimensão — o período inteiro em uma barra por grupo.
 *
 * A tabela sempre mostra o consolidado; o eixo só muda o gráfico.
 */
export type EixoGrafico = "tempo" | "grupo";

export interface PreferenciasRelatorio {
  /** chaves das métricas visíveis, na ordem do catálogo */
  colunas: string[];
  agrupamento: string[];
  grafico: TipoGrafico;
  eixo: EixoGrafico;
  /** passo da série no eixo de tempo; "auto" deixa o servidor decidir */
  granularidade: GranularidadePreferida;
}

const VERSAO = "v1";
const chave = (usuarioId: string, slug: string) =>
  `caleidoscopio_relatorio_${VERSAO}_${usuarioId}_${slug}`;

function padrao(definicao: DefinicaoRelatorio): PreferenciasRelatorio {
  return {
    colunas: definicao.metricas.filter((m) => m.padrao !== false).map((m) => m.chave),
    agrupamento: definicao.agrupamentoPadrao.slice(0, MAX_NIVEIS),
    grafico: "barras",
    eixo: "tempo",
    granularidade: "auto",
  };
}

/**
 * Valida o que veio do storage contra o catálogo ATUAL. Preferência salva é
 * dado antigo: uma métrica pode ter sido renomeada ou removida desde então, e
 * aceitar a chave morta deixaria a tabela sem coluna nenhuma.
 */
function sanear(
  bruto: unknown,
  definicao: DefinicaoRelatorio
): PreferenciasRelatorio {
  const base = padrao(definicao);
  if (!bruto || typeof bruto !== "object") return base;
  const p = bruto as Partial<PreferenciasRelatorio>;

  const metricasValidas = new Set(definicao.metricas.map((m) => m.chave));
  const dimensoesValidas = new Set(definicao.dimensoes.map((d) => d.chave));

  const colunas = Array.isArray(p.colunas)
    ? definicao.metricas
        .map((m) => m.chave)
        .filter((c) => metricasValidas.has(c) && p.colunas!.includes(c))
    : base.colunas;

  const agrupamento = Array.isArray(p.agrupamento)
    ? p.agrupamento
        .filter((c, i, arr) => dimensoesValidas.has(c) && arr.indexOf(c) === i)
        .slice(0, MAX_NIVEIS)
    : base.agrupamento;

  const graficos: TipoGrafico[] = ["nenhum", "barras", "barras-empilhadas", "pizza"];
  const grafico = graficos.includes(p.grafico as TipoGrafico)
    ? (p.grafico as TipoGrafico)
    : base.grafico;

  const eixo: EixoGrafico = p.eixo === "grupo" || p.eixo === "tempo" ? p.eixo : base.eixo;

  const granularidade: GranularidadePreferida =
    p.granularidade === "auto" || ehGranularidade(p.granularidade)
      ? p.granularidade
      : base.granularidade;

  return {
    // Sem nenhuma coluna a tabela não diz nada: volta ao padrão
    colunas: colunas.length > 0 ? colunas : base.colunas,
    // Sem agrupamento não há árvore: volta ao padrão
    agrupamento: agrupamento.length > 0 ? agrupamento : base.agrupamento,
    grafico,
    eixo,
    granularidade,
  };
}

export function usePreferenciasRelatorio(definicao: DefinicaoRelatorio | null) {
  const { user } = useAuth();
  const usuarioId = user?.id ?? "anonimo";

  const inicial = useMemo(
    () =>
      definicao
        ? padrao(definicao)
        : {
            colunas: [],
            agrupamento: [],
            grafico: "nenhum" as TipoGrafico,
            eixo: "tempo" as EixoGrafico,
            granularidade: "auto" as GranularidadePreferida,
          },
    [definicao]
  );

  const [preferencias, setPreferencias] = useState<PreferenciasRelatorio>(inicial);
  /** false até ler o storage — evita a tela piscar o padrão e depois o salvo */
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    if (!definicao) return;
    setCarregado(false);
    try {
      const cru = localStorage.getItem(chave(usuarioId, definicao.slug));
      setPreferencias(cru ? sanear(JSON.parse(cru), definicao) : padrao(definicao));
    } catch {
      // localStorage indisponível (modo privado, storage cheio): o padrão serve
      setPreferencias(padrao(definicao));
    } finally {
      setCarregado(true);
    }
  }, [definicao, usuarioId]);

  const salvar = useCallback(
    (parcial: Partial<PreferenciasRelatorio>) => {
      if (!definicao) return;
      setPreferencias((atual) => {
        const novo = sanear({ ...atual, ...parcial }, definicao);
        try {
          localStorage.setItem(chave(usuarioId, definicao.slug), JSON.stringify(novo));
        } catch {
          // não poder guardar não impede de usar nesta sessão
        }
        return novo;
      });
    },
    [definicao, usuarioId]
  );

  const restaurarPadrao = useCallback(() => {
    if (!definicao) return;
    try {
      localStorage.removeItem(chave(usuarioId, definicao.slug));
    } catch {
      /* idem */
    }
    setPreferencias(padrao(definicao));
  }, [definicao, usuarioId]);

  const ehPadrao = useMemo(() => {
    if (!definicao) return true;
    const p = padrao(definicao);
    return (
      p.grafico === preferencias.grafico &&
      p.eixo === preferencias.eixo &&
      p.granularidade === preferencias.granularidade &&
      p.colunas.join(",") === preferencias.colunas.join(",") &&
      p.agrupamento.join(",") === preferencias.agrupamento.join(",")
    );
  }, [definicao, preferencias]);

  return { preferencias, carregado, salvar, restaurarPadrao, ehPadrao };
}
