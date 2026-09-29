import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { registrarErroApi } from "@/lib/erro-prisma";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !user.tenant?.id) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { avaliacaoId, pergunta, nivelId, habilidadeId, descricao, criterios_pontuacao, ordem, numero } = body;

    if (!avaliacaoId || !pergunta) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios: avaliacaoId, pergunta" },
        { status: 400 }
      );
    }

    const avaliacao = await prisma.avaliacao.findFirst({
      where: { id: avaliacaoId, tenantId: user.tenant.id },
    });

    if (!avaliacao) {
      return NextResponse.json({ success: false, error: "Avaliação não encontrada" }, { status: 404 });
    }

    const tarefa = await prisma.avaliacaoTarefa.create({
      data: {
        avaliacaoId,
        pergunta,
        nivelId: nivelId || null,
        habilidadeId: habilidadeId || null,
        descricao,
        criterios_pontuacao,
        ordem,
        numero: numero === undefined || numero === null || numero === "" ? null : Number(numero),
      },
      include: {
        nivel: true,
        habilidade: true,
      },
    });

    return NextResponse.json({ success: true, data: tarefa });
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/avaliacoes/tarefas", acao: "POST" }, error);
    return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? "Erro interno", details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !user.tenant?.id) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const { id, pergunta, nivelId, habilidadeId, descricao, criterios_pontuacao, ordem, numero } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID é obrigatório" }, { status: 400 });
    }

    const tarefaExistente = await prisma.avaliacaoTarefa.findFirst({
      where: { id },
      include: { avaliacao: true },
    });

    if (!tarefaExistente || tarefaExistente.avaliacao.tenantId !== user.tenant.id) {
      return NextResponse.json({ success: false, error: "Tarefa não encontrada" }, { status: 404 });
    }

    const tarefa = await prisma.avaliacaoTarefa.update({
      where: { id },
      data: {
        pergunta,
        nivelId: nivelId || null,
        habilidadeId: habilidadeId || null,
        descricao,
        criterios_pontuacao,
        ordem,
        numero: numero === undefined || numero === null || numero === "" ? null : Number(numero),
      },
      include: { nivel: true, habilidade: true },
    });

    return NextResponse.json({ success: true, data: tarefa });
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/avaliacoes/tarefas", acao: "PUT" }, error);
    return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? "Erro interno", details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !user.tenant?.id) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID é obrigatório" }, { status: 400 });
    }

    const tarefa = await prisma.avaliacaoTarefa.findFirst({
      where: { id },
      include: { avaliacao: true },
    });

    if (!tarefa || tarefa.avaliacao.tenantId !== user.tenant.id) {
      return NextResponse.json({ success: false, error: "Tarefa não encontrada" }, { status: 404 });
    }

    await prisma.avaliacaoTarefa.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Tarefa excluída" });
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/avaliacoes/tarefas", acao: "DELETE" }, error);
    return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? "Erro interno", details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
