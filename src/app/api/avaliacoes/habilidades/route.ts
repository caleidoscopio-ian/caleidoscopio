import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth/server";

const prisma = new PrismaClient();

// POST - Criar habilidade
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
    const { avaliacaoId, ordem, habilidade } = body;

    if (!avaliacaoId || ordem === undefined || !habilidade) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios: avaliacaoId, ordem, habilidade" },
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

    const novaHabilidade = await prisma.avaliacaoHabilidade.create({
      data: {
        avaliacaoId,
        ordem,
        habilidade,
      },
    });

    return NextResponse.json({ success: true, data: novaHabilidade });
  } catch (error) {
    console.error("❌ Erro ao criar habilidade:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar habilidade
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
    const { id, ordem, habilidade } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar permissão
    const habilidadeExistente = await prisma.avaliacaoHabilidade.findFirst({
      where: { id },
      include: { avaliacao: true },
    });

    if (!habilidadeExistente || habilidadeExistente.avaliacao.tenantId !== user.tenant.id) {
      return NextResponse.json(
        { success: false, error: "Habilidade não encontrada" },
        { status: 404 }
      );
    }

    const habilidadeAtualizada = await prisma.avaliacaoHabilidade.update({
      where: { id },
      data: { ordem, habilidade },
    });

    return NextResponse.json({ success: true, data: habilidadeAtualizada });
  } catch (error) {
    console.error("❌ Erro ao atualizar habilidade:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}

// DELETE - Excluir habilidade
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
    const habilidade = await prisma.avaliacaoHabilidade.findFirst({
      where: { id },
      include: { avaliacao: true },
    });

    if (!habilidade || habilidade.avaliacao.tenantId !== user.tenant.id) {
      return NextResponse.json(
        { success: false, error: "Habilidade não encontrada" },
        { status: 404 }
      );
    }

    await prisma.avaliacaoHabilidade.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Habilidade excluída" });
  } catch (error) {
    console.error("❌ Erro ao excluir habilidade:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}
