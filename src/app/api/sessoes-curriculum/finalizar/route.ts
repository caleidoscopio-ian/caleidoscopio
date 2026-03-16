import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { calcularEvolucaoAposFinalizacao } from "@/lib/evolucao-fase";

// POST - Finalizar sessão de curriculum
export async function POST(request: NextRequest) {
  try {
    console.log("📝 API Sessoes-Curriculum/Finalizar - Finalizando sessão...");

    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessaoId, observacoes_gerais } = body;

    if (!sessaoId) {
      return NextResponse.json(
        { error: "ID da sessão é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a sessão existe
    const sessao = await prisma.sessaoCurriculum.findUnique({
      where: { id: sessaoId },
      include: {
        paciente: true,
        curriculum: true,
        avaliacoes: true,
      },
    });

    if (!sessao) {
      return NextResponse.json(
        { error: "Sessão não encontrada" },
        { status: 404 }
      );
    }

    if (!user.tenant?.id || sessao.paciente.tenantId !== user.tenant.id) {
      return NextResponse.json(
        { error: "Sessão não pertence a esta clínica" },
        { status: 403 }
      );
    }

    if (sessao.status !== "EM_ANDAMENTO") {
      return NextResponse.json(
        { error: "Sessão já foi finalizada" },
        { status: 400 }
      );
    }

    // Buscar atividades clonadas para validar avaliações
    const pacienteCurriculum = await prisma.pacienteCurriculum.findFirst({
      where: {
        pacienteId: sessao.pacienteId,
        curriculumId: sessao.curriculumId,
      },
      include: {
        atividadesClone: {
          where: { ativo: true },
          include: {
            instrucoes: true,
          },
        },
      },
    });

    if (pacienteCurriculum && pacienteCurriculum.atividadesClone.length > 0) {
      // Verificar se todas as instruções de todas as atividades clonadas foram avaliadas
      const totalAvaliacoesNecessarias = pacienteCurriculum.atividadesClone.reduce(
        (total, clone) => {
          const tentativasPorAlvo = clone.qtd_tentativas_alvo || 1;
          return total + clone.instrucoes.length * tentativasPorAlvo;
        },
        0
      );

      if (sessao.avaliacoes.length < totalAvaliacoesNecessarias) {
        return NextResponse.json(
          {
            error: `Avalie todas as instruções antes de finalizar. ${sessao.avaliacoes.length}/${totalAvaliacoesNecessarias} avaliadas.`,
          },
          { status: 400 }
        );
      }
    }

    console.log(`📝 Finalizando sessão de curriculum ${sessao.curriculum.nome}`);

    // Finalizar sessão
    const sessaoFinalizada = await prisma.sessaoCurriculum.update({
      where: { id: sessaoId },
      data: {
        status: "FINALIZADA",
        finalizada_em: new Date(),
        observacoes_gerais: observacoes_gerais || null,
      },
      include: {
        paciente: true,
        curriculum: true,
        profissional: true,
        avaliacoes: true,
      },
    });

    // Calcular evolução de fase após finalizar
    let evolucaoResultados: Awaited<ReturnType<typeof calcularEvolucaoAposFinalizacao>> = [];
    if (pacienteCurriculum && pacienteCurriculum.atividadesClone.length > 0) {
      evolucaoResultados = await calcularEvolucaoAposFinalizacao(
        sessaoId,
        pacienteCurriculum.id,
        sessaoFinalizada.avaliacoes
      );
    }

    console.log(`✅ Sessão finalizada com sucesso`);

    return NextResponse.json({
      success: true,
      data: sessaoFinalizada,
      evolucao: evolucaoResultados,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao finalizar sessão:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
