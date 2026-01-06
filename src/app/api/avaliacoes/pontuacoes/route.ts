import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth/server";

const prisma = new PrismaClient();

// POST - Criar pontuação
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user || !user.tenant?.id) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { avaliacaoId, ordem, tipo, valor } = body;

    if (!avaliacaoId || ordem === undefined || !tipo || valor === undefined) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios: avaliacaoId, ordem, tipo, valor" },
        { status: 400 }
      );
    }

    // Verificar se avaliação pertence ao tenant
    const avaliacao = await prisma.avaliacao.findFirst({
      where: { id: avaliacaoId, tenantId: user.tenant.id },
    });

    if (!avaliacao) {
      return NextResponse.json(
        { success: false, error: "Avaliação não encontrada" },
        { status: 404 }
      );
    }

    const pontuacao = await prisma.avaliacaoPontuacao.create({
      data: {
        avaliacaoId,
        ordem,
        tipo,
        valor,
      },
    });

    return NextResponse.json({ success: true, data: pontuacao });
  } catch (error) {
    console.error("❌ Erro ao criar pontuação:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar pontuação
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user || !user.tenant?.id) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ordem, tipo, valor } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar permissão
    const pontuacaoExistente = await prisma.avaliacaoPontuacao.findFirst({
      where: { id },
      include: { avaliacao: true },
    });

    if (!pontuacaoExistente || pontuacaoExistente.avaliacao.tenantId !== user.tenant.id) {
      return NextResponse.json(
        { success: false, error: "Pontuação não encontrada" },
        { status: 404 }
      );
    }

    const pontuacao = await prisma.avaliacaoPontuacao.update({
      where: { id },
      data: { ordem, tipo, valor },
    });

    return NextResponse.json({ success: true, data: pontuacao });
  } catch (error) {
    console.error("❌ Erro ao atualizar pontuação:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}

// DELETE - Excluir pontuação
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user || !user.tenant?.id) {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar permissão
    const pontuacao = await prisma.avaliacaoPontuacao.findFirst({
      where: { id },
      include: { avaliacao: true },
    });

    if (!pontuacao || pontuacao.avaliacao.tenantId !== user.tenant.id) {
      return NextResponse.json(
        { success: false, error: "Pontuação não encontrada" },
        { status: 404 }
      );
    }

    await prisma.avaliacaoPontuacao.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Pontuação excluída" });
  } catch (error) {
    console.error("❌ Erro ao excluir pontuação:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}
