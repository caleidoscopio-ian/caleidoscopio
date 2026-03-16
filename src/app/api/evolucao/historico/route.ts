import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/server";

// GET - Histórico de mudanças de fase de uma atividade clone
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

    const historico = await prisma.atividadeFaseHistorico.findMany({
      where: { atividadeCloneId },
      orderBy: { alterado_em: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: historico,
    });
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
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
