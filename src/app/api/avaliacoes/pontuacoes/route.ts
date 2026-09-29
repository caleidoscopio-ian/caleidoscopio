import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { registrarErroApi } from "@/lib/erro-prisma";

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
    const { ref, classificacao } = registrarErroApi({ rota: "/api/avaliacoes/pontuacoes", acao: "POST" }, error);
    return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? "Erro interno", details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
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
    const { ref, classificacao } = registrarErroApi({ rota: "/api/avaliacoes/pontuacoes", acao: "PUT" }, error);
    return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? "Erro interno", details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
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
    const { ref, classificacao } = registrarErroApi({ rota: "/api/avaliacoes/pontuacoes", acao: "DELETE" }, error);
    return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? "Erro interno", details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
