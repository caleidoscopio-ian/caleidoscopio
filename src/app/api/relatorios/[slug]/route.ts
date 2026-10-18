// Rota genérica da Central de Relatórios (Módulo 25).
//
// Um endpoint serve todos os relatórios da central: o `slug` resolve a
// definição no catálogo, a definição diz quais filtros existem, o que dá para
// agrupar e o que dá para somar. Relatório novo = entrada no catálogo, não
// rota nova.
//
// Esta rota é dinâmica, mas os relatórios que já existem fora da central têm
// rota estática própria (`/api/relatorios/historico-atendimentos`, etc.) e o
// Next resolve o segmento estático primeiro — não há conflito.

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, hasPermission, isAdminUser } from "@/lib/auth/server";
import { parseInicioPeriodo, parseFimPeriodo } from "@/lib/datas-fuso";
import { registrarErroApi } from "@/lib/erro-prisma";
import { escopoFilialDoUsuario, intersecaoFilial } from "@/lib/filial-pessoa";
import { definicaoNaCentral } from "@/lib/relatorios/definicoes";
import { agregar, MAX_NIVEIS } from "@/lib/relatorios/agregacao";
import { preencherLacunas } from "@/lib/relatorios/serie";
import {
  carregarAtendimentos,
  CONVENIO_PARTICULAR,
  LIMITE_LINHAS,
} from "@/lib/relatorios/fonte-atendimentos";
import { carregarRepasse } from "@/lib/relatorios/fonte-repasse";
import { carregarFaltas } from "@/lib/relatorios/fonte-faltas";
import { ehGranularidade } from "@/types/relatorio";
import type { Granularidade, ResultadoRelatorio } from "@/types/relatorio";
import { DIM_DIA, DIM_MES, DIM_SEMANA } from "@/lib/relatorios/definicoes";

/**
 * Passo da série quando o usuário não escolheu ("auto"):
 *
 *   até 30 dias corridos → uma barra por dia  (um mês cabe na tela)
 *   acima                → uma barra por mês
 *
 * Só dois degraus de propósito: o padrão existe para a primeira abertura ficar
 * legível, não para adivinhar a intenção. Quem quer semana — ou quer dia num
 * trimestre — escolhe nas preferências, e a escolha manda.
 *
 * `span` chega fracionário (o fim do período é 23:59:59.999), então 30 dias
 * corridos valem 29,99 — daí o `ceil` antes de comparar.
 */
function granularidadeDoPeriodo(span: number): Granularidade {
  return Math.ceil(span) <= 30 ? "dia" : "mes";
}

const DIM_TEMPO: Record<Granularidade, typeof DIM_DIA> = {
  dia: DIM_DIA,
  semana: DIM_SEMANA,
  mes: DIM_MES,
};

const MAX_DIAS = 366;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const user = await getAuthenticatedUser(request);
    if (!user)
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    if (!user.tenant?.id)
      return NextResponse.json({ success: false, error: "Sem tenant" }, { status: 403 });

    const definicao = definicaoNaCentral(slug);
    if (!definicao)
      return NextResponse.json(
        { success: false, error: "Relatório não encontrado" },
        { status: 404 }
      );

    if (!(await hasPermission(user, definicao.acaoVisualizar)))
      return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });

    const sp = request.nextUrl.searchParams;

    // ── Período (obrigatório em todo relatório)
    const dataInicio = sp.get("dataInicio");
    const dataFim = sp.get("dataFim");
    if (!dataInicio || !dataFim)
      return NextResponse.json(
        { success: false, error: "dataInicio e dataFim são obrigatórios" },
        { status: 400 }
      );

    const inicio = parseInicioPeriodo(dataInicio);
    const fim = parseFimPeriodo(dataFim);
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime()))
      return NextResponse.json({ success: false, error: "Datas inválidas" }, { status: 400 });
    if (fim.getTime() < inicio.getTime())
      return NextResponse.json(
        { success: false, error: "A data final é anterior à inicial" },
        { status: 400 }
      );

    const dias = (fim.getTime() - inicio.getTime()) / 86400000;
    if (dias > MAX_DIAS)
      return NextResponse.json(
        { success: false, error: "Período máximo de 12 meses" },
        { status: 400 }
      );

    // ── Passo da série do gráfico: escolha do usuário, "auto" se ele não
    // escolheu. Valor desconhecido cai no automático em vez de responder 400:
    // diferente do agrupamento, aqui não há chave indo para query nenhuma, e a
    // série que volta é correta e vem rotulada com o passo real — a tela não
    // tem como mentir. Recusar quebraria o relatório por causa de uma
    // preferência velha no localStorage.
    const granPedida = sp.get("granularidade");
    const granularidadePedida: Granularidade | null = ehGranularidade(granPedida)
      ? granPedida
      : null;

    // ── Agrupamento: só dimensões declaradas no catálogo, no máximo 3 níveis
    const chavesValidas = new Set(definicao.dimensoes.map((d) => d.chave));
    const pedido = (sp.get("agrupar") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const invalidas = pedido.filter((c) => !chavesValidas.has(c));
    if (invalidas.length > 0)
      return NextResponse.json(
        { success: false, error: `Dimensão inválida: ${invalidas.join(", ")}` },
        { status: 400 }
      );
    const agrupamento = (pedido.length > 0 ? pedido : definicao.agrupamentoPadrao).slice(
      0,
      MAX_NIVEIS
    );

    // ── Filial: quem não é admin fica preso às PRÓPRIAS filiais, qualquer que
    // seja o parâmetro recebido. Desde o Módulo 26 isso é uma lista: a pessoa
    // pode operar em mais de uma unidade.
    const isAdmin = isAdminUser(user);
    const filialParam = sp.get("filialId");
    const escopoFilial = await escopoFilialDoUsuario(user.tenant.id, user.id, isAdmin);
    const filiais = intersecaoFilial(escopoFilial, filialParam ? [filialParam] : null);

    const incluirDetalhe = sp.get("detalhe") !== "0";

    // ── Status: travado pelo relatório quando a definição manda
    const statusParam = sp.get("status");
    const status =
      definicao.statusFixo ??
      (statusParam
        ? statusParam
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : []);

    // As três fontes leem a mesma base de agendamentos; cada uma acrescenta o
    // que seu relatório precisa — repasse resolve a regra, faltas monta os
    // contadores de desfecho.
    if (
      definicao.fonte === "atendimentos" ||
      definicao.fonte === "repasse" ||
      definicao.fonte === "faltas"
    ) {
      const carregar =
        definicao.fonte === "repasse"
          ? carregarRepasse
          : definicao.fonte === "faltas"
            ? carregarFaltas
            : carregarAtendimentos;
      const convenioParam = sp.get("convenioId");
      const fonte = await carregar({
        tenantId: user.tenant.id,
        inicio,
        fim,
        status,
        filiais,
        profissionalId: sp.get("profissionalId") || null,
        convenioId:
          convenioParam === CONVENIO_PARTICULAR ? CONVENIO_PARTICULAR : convenioParam || null,
        especialidade: sp.get("especialidade") || null,
        procedimentoId: sp.get("procedimentoId") || null,
      });

      if (fonte.excedeuLimite)
        return NextResponse.json(
          {
            success: false,
            error:
              `O filtro seleciona ${fonte.totalNoBanco.toLocaleString("pt-BR")} atendimentos, ` +
              `acima do limite de ${LIMITE_LINHAS.toLocaleString("pt-BR")}. Reduza o período ` +
              `ou acrescente um filtro.`,
          },
          { status: 400 }
        );

      // Especialidade é texto (vem do carimbo ou do cadastro do profissional),
      // não um id — então filtra pela dimensão já resolvida, para que o filtro
      // e o agrupamento concordem sempre.
      const especialidade = sp.get("especialidade");
      const linhas = especialidade
        ? fonte.linhas.filter((l) => l.dimensoes.especialidade?.id === especialidade)
        : fonte.linhas;

      const { grupos, total, agrupamento: usado } = agregar(
        linhas,
        agrupamento,
        definicao.metricas,
        { incluirDetalhe, dimensoes: definicao.dimensoes }
      );

      // Série temporal: mesma agregação, com o tempo no primeiro nível e o
      // primeiro nível do agrupamento no segundo, para o gráfico poder empilhar.
      // Reusar `agregar` em vez de somar à parte garante que o gráfico e a
      // tabela nunca divirjam.
      const granularidade = granularidadePedida ?? granularidadeDoPeriodo(dias);
      const dimTempo = DIM_TEMPO[granularidade];
      const { grupos: serieCrua } = agregar(
        linhas,
        [dimTempo.chave, ...usado.slice(0, 1)],
        definicao.metricas,
        { dimensoes: [...definicao.dimensoes, dimTempo] }
      );
      // O eixo do tempo precisa do período inteiro, não só dos intervalos com
      // movimento: sem isso um fim de semana vira buraco e a distância entre
      // as barras deixa de significar tempo.
      const serie = preencherLacunas(serieCrua, inicio, fim, granularidade, definicao.metricas);

      const resultado: ResultadoRelatorio = {
        slug,
        agrupamento: usado,
        grupos,
        total,
        periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
        avisos: fonte.avisos,
        serie,
        granularidade,
      };

      return NextResponse.json({ success: true, data: resultado });
    }

    // Nenhuma fonte restante: só chega aqui se o catálogo ganhar um `fonte`
    // novo sem a rota aprender a servi-lo.
    return NextResponse.json(
      { success: false, error: "Relatório ainda não implementado" },
      { status: 501 }
    );
  } catch (error) {
    const { ref, classificacao } = registrarErroApi(
      { rota: `/api/relatorios/${slug}`, acao: "GET" },
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? "Erro interno",
        details: classificacao.detalhe,
        ref,
      },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
