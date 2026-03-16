import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { FaseAtividade } from "@prisma/client";

// GET - Buscar critérios de fase de uma atividade clone
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const atividadeCloneId = url.searchParams.get("atividadeCloneId");

    if (!atividadeCloneId) {
      return NextResponse.json(
        { error: "ID da atividade clone é obrigatório" },
        { status: 400 }
      );
    }

    const fases = await prisma.atividadeFase.findMany({
      where: { atividadeCloneId },
      orderBy: { fase: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: fases,
    });
  } catch (error) {
    console.error("Erro ao buscar critérios:", error);
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

// PUT - Atualizar critérios de fase
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
    const {
      atividadeCloneId,
      fase,
      porcentagem_acerto,
      qtd_sessoes_consecutivas,
      fase_se_atingir,
      fase_se_nao_atingir,
    } = body;

    if (!atividadeCloneId || !fase) {
      return NextResponse.json(
        { error: "ID da atividade clone e fase são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar porcentagem_acerto
    if (
      porcentagem_acerto !== undefined &&
      (typeof porcentagem_acerto !== "number" ||
        porcentagem_acerto <= 0 ||
        porcentagem_acerto > 100)
    ) {
      return NextResponse.json(
        { error: "porcentagem_acerto deve ser um número entre 1 e 100" },
        { status: 400 }
      );
    }

    // Validar que a fase é válida
    const fasesValidas: FaseAtividade[] = [
      "LINHA_BASE",
      "INTERVENCAO",
      "MANUTENCAO",
      "GENERALIZACAO",
    ];
    if (!fasesValidas.includes(fase)) {
      return NextResponse.json(
        { error: "Fase inválida" },
        { status: 400 }
      );
    }

    // Validar fase_se_atingir e fase_se_nao_atingir
    if (fase_se_atingir && !fasesValidas.includes(fase_se_atingir)) {
      return NextResponse.json(
        { error: "fase_se_atingir inválida" },
        { status: 400 }
      );
    }
    if (fase_se_nao_atingir && !fasesValidas.includes(fase_se_nao_atingir)) {
      return NextResponse.json(
        { error: "fase_se_nao_atingir inválida" },
        { status: 400 }
      );
    }

    const faseAtualizada = await prisma.atividadeFase.update({
      where: {
        atividadeCloneId_fase: {
          atividadeCloneId,
          fase: fase as FaseAtividade,
        },
      },
      data: {
        porcentagem_acerto:
          porcentagem_acerto !== undefined ? porcentagem_acerto : undefined,
        qtd_sessoes_consecutivas:
          qtd_sessoes_consecutivas !== undefined
            ? qtd_sessoes_consecutivas
            : undefined,
        fase_se_atingir:
          fase_se_atingir !== undefined
            ? (fase_se_atingir as FaseAtividade) || null
            : undefined,
        fase_se_nao_atingir:
          fase_se_nao_atingir !== undefined
            ? (fase_se_nao_atingir as FaseAtividade) || null
            : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: faseAtualizada,
    });
  } catch (error) {
    console.error("Erro ao atualizar critérios:", error);
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
