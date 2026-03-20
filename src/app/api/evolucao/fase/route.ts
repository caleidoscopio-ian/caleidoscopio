import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { FaseAtividade } from "@prisma/client";
import { randomUUID } from "crypto";

// PUT - Alterar fase manualmente
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    if (!await hasPermission(user, "edit_activities")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { atividadeCloneId, instrucaoId, novaFase } = body;

    if ((!atividadeCloneId && !instrucaoId) || !novaFase) {
      return NextResponse.json(
        { error: "ID da atividade/instrução e nova fase são obrigatórios" },
        { status: 400 }
      );
    }

    const fasesValidas: FaseAtividade[] = [
      "LINHA_BASE",
      "INTERVENCAO",
      "MANUTENCAO",
      "GENERALIZACAO",
    ];
    if (!fasesValidas.includes(novaFase)) {
      return NextResponse.json(
        { error: "Fase inválida" },
        { status: 400 }
      );
    }

    // Modo instrução (novo)
    if (instrucaoId) {
      const instrucao = await prisma.atividadeCloneInstrucao.findUnique({
        where: { id: instrucaoId },
      });

      if (!instrucao) {
        return NextResponse.json(
          { error: "Instrução não encontrada" },
          { status: 404 }
        );
      }

      if (instrucao.faseAtual === novaFase) {
        return NextResponse.json(
          { error: "A instrução já está nesta fase" },
          { status: 400 }
        );
      }

      const [instrucaoAtualizada] = await prisma.$transaction([
        prisma.atividadeCloneInstrucao.update({
          where: { id: instrucaoId },
          data: { faseAtual: novaFase as FaseAtividade },
        }),
        prisma.instrucaoFaseHistorico.create({
          data: {
            id: randomUUID(),
            instrucaoId,
            faseAnterior: instrucao.faseAtual,
            faseNova: novaFase as FaseAtividade,
            motivo: "ALTERACAO_MANUAL",
            alterado_por: user.id,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        data: instrucaoAtualizada,
      });
    }

    // Modo atividade (legado)
    const clone = await prisma.pacienteAtividadeClone.findUnique({
      where: { id: atividadeCloneId },
    });

    if (!clone) {
      return NextResponse.json(
        { error: "Atividade clone não encontrada" },
        { status: 404 }
      );
    }

    if (clone.faseAtual === novaFase) {
      return NextResponse.json(
        { error: "A atividade já está nesta fase" },
        { status: 400 }
      );
    }

    // Atualizar fase e registrar histórico
    const [cloneAtualizado] = await prisma.$transaction([
      prisma.pacienteAtividadeClone.update({
        where: { id: atividadeCloneId },
        data: { faseAtual: novaFase as FaseAtividade },
      }),
      prisma.atividadeFaseHistorico.create({
        data: {
          id: randomUUID(),
          atividadeCloneId,
          faseAnterior: clone.faseAtual,
          faseNova: novaFase as FaseAtividade,
          motivo: "ALTERACAO_MANUAL",
          alterado_por: user.id,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: cloneAtualizado,
    });
  } catch (error) {
    console.error("Erro ao alterar fase:", error);
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
