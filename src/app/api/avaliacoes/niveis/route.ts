import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { registrarErroApi } from "@/lib/erro-prisma";

const prisma = new PrismaClient();

// POST - Criar nível
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
    const { avaliacaoId, ordem, descricao, faixa_etaria } = body;

    // Validar
    if (!avaliacaoId || ordem === undefined || !descricao) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios: avaliacaoId, ordem, descricao" },
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

    const nivel = await prisma.avaliacaoNivel.create({
      data: {
        avaliacaoId,
        ordem,
        descricao,
        faixa_etaria,
      },
    });

    return NextResponse.json({ success: true, data: nivel });
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/avaliacoes/niveis", acao: "POST" }, error);
    return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? "Erro interno", details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}

// PUT - Atualizar nível
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
    const { id, ordem, descricao, faixa_etaria } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar permissão
    const nivelExistente = await prisma.avaliacaoNivel.findFirst({
      where: { id },
      include: { avaliacao: true },
    });

    if (!nivelExistente || nivelExistente.avaliacao.tenantId !== user.tenant.id) {
      return NextResponse.json(
        { success: false, error: "Nível não encontrado" },
        { status: 404 }
      );
    }

    const nivel = await prisma.avaliacaoNivel.update({
      where: { id },
      data: { ordem, descricao, faixa_etaria },
    });

    return NextResponse.json({ success: true, data: nivel });
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/avaliacoes/niveis", acao: "PUT" }, error);
    return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? "Erro interno", details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}

// DELETE - Excluir nível
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
    const nivel = await prisma.avaliacaoNivel.findFirst({
      where: { id },
      include: { avaliacao: true },
    });

    if (!nivel || nivel.avaliacao.tenantId !== user.tenant.id) {
      return NextResponse.json(
        { success: false, error: "Nível não encontrado" },
        { status: 404 }
      );
    }

    await prisma.avaliacaoNivel.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Nível excluído" });
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/avaliacoes/niveis", acao: "DELETE" }, error);
    return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? "Erro interno", details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
