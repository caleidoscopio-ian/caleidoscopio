import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { randomUUID } from "crypto";

// POST - Avaliar instrução de atividade do curriculum
export async function POST(request: NextRequest) {
  try {
    console.log("📝 API Sessoes-Curriculum/Avaliar - Avaliando instrução...");

    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessaoId, atividadeId, instrucaoId, tentativa, nota, tipos_ajuda, observacao } = body;

    if (!sessaoId || !atividadeId || !instrucaoId || tentativa === undefined || nota === undefined || nota === null) {
      return NextResponse.json(
        { error: "Dados incompletos para avaliação" },
        { status: 400 }
      );
    }

    if (nota < 0 || nota > 4) {
      return NextResponse.json(
        { error: "Nota deve estar entre 0 e 4" },
        { status: 400 }
      );
    }

    // Verificar se a sessão existe
    const sessao = await prisma.sessaoCurriculum.findUnique({
      where: { id: sessaoId },
      include: {
        paciente: true,
        curriculum: {
          include: {
            atividades: {
              include: {
                atividade: {
                  include: {
                    instrucoes: true
                  }
                }
              }
            }
          }
        }
      }
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

    // Verificar se a sessão está em andamento
    if (sessao.status !== "EM_ANDAMENTO") {
      return NextResponse.json(
        { error: "Sessão não está em andamento" },
        { status: 400 }
      );
    }

    // Verificar se já existe avaliação para esta instrução, tentativa, sessão e atividade
    const avaliacaoExistente = await prisma.avaliacaoInstrucaoCurriculum.findFirst({
      where: {
        sessaoId,
        atividadeId,
        instrucaoId,
        tentativa,
      },
    });

    if (avaliacaoExistente) {
      // Atualizar avaliação existente
      const avaliacao = await prisma.avaliacaoInstrucaoCurriculum.update({
        where: { id: avaliacaoExistente.id },
        data: {
          nota,
          tipos_ajuda: tipos_ajuda || [],
          observacao: observacao || null,
        },
      });

      console.log(`✅ Avaliação atualizada para instrução ${instrucaoId} (tentativa ${tentativa}) da atividade ${atividadeId}`);

      return NextResponse.json({
        success: true,
        data: avaliacao,
      });
    } else {
      // Criar nova avaliação
      const avaliacao = await prisma.avaliacaoInstrucaoCurriculum.create({
        data: {
          id: randomUUID(),
          sessaoId,
          atividadeId,
          instrucaoId,
          tentativa,
          nota,
          tipos_ajuda: tipos_ajuda || [],
          observacao: observacao || null,
        },
      });

      console.log(`✅ Avaliação criada para instrução ${instrucaoId} (tentativa ${tentativa}) da atividade ${atividadeId}`);

      return NextResponse.json({
        success: true,
        data: avaliacao,
      });
    }
  } catch (error) {
    console.error("❌ Erro ao avaliar instrução:", error);
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
