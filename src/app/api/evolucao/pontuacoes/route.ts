import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { FaseAtividade } from "@prisma/client";
import { randomUUID } from "crypto";
import { ordenarPontuacoes } from "@/lib/pontuacao";
import { registrarErroApi } from "@/lib/erro-prisma";

const FASES_VALIDAS: FaseAtividade[] = ["LINHA_BASE", "INTERVENCAO", "MANUTENCAO", "GENERALIZACAO"];

// GET - Buscar pontuações de uma instrução por fase
// ?instrucaoId=X&fase=Y
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const url = new URL(request.url);
    const instrucaoId = url.searchParams.get("instrucaoId");
    const fase = url.searchParams.get("fase");

    if (!instrucaoId || !fase) {
      return NextResponse.json({ error: "instrucaoId e fase são obrigatórios" }, { status: 400 });
    }

    if (!FASES_VALIDAS.includes(fase as FaseAtividade)) {
      return NextResponse.json({ error: "Fase inválida" }, { status: 400 });
    }

    const pontuacoes = await prisma.instrucaoPontuacao.findMany({
      where: { instrucaoId, fase: fase as FaseAtividade },
      orderBy: { ordem: "asc" },
    });

    return NextResponse.json({ success: true, data: pontuacoes });
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/evolucao/pontuacoes", acao: "GET" }, error);
    return NextResponse.json(
      { error: classificacao.mensagem ?? "Erro interno", details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}

// PUT - Salvar pontuações de uma instrução para uma fase (replace all)
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    if (!await hasPermission(user, "edit_activities")) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const { instrucaoId, fase, pontuacoes } = body;

    if (!instrucaoId || !fase) {
      return NextResponse.json({ error: "instrucaoId e fase são obrigatórios" }, { status: 400 });
    }

    if (!FASES_VALIDAS.includes(fase as FaseAtividade)) {
      return NextResponse.json({ error: "Fase inválida" }, { status: 400 });
    }

    if (!Array.isArray(pontuacoes)) {
      return NextResponse.json({ error: "pontuacoes deve ser um array" }, { status: 400 });
    }

    // Verificar instrução existe
    const instrucao = await prisma.atividadeCloneInstrucao.findUnique({
      where: { id: instrucaoId },
    });

    if (!instrucao) {
      return NextResponse.json({ error: "Instrução não encontrada" }, { status: 404 });
    }

    // "-" primeiro e "+" último — regra única em src/lib/pontuacao.ts
    const pontuacoesOrdenadas = ordenarPontuacoes(
      pontuacoes as Array<{ sigla: string; grau: string }>
    );

    // Delete + recreate para esta instrução/fase
    await prisma.$transaction([
      prisma.instrucaoPontuacao.deleteMany({
        where: { instrucaoId, fase: fase as FaseAtividade },
      }),
      prisma.instrucaoPontuacao.createMany({
        data: pontuacoesOrdenadas.map((p: { sigla: string; grau: string }, index: number) => ({
          id: randomUUID(),
          instrucaoId,
          fase: fase as FaseAtividade,
          ordem: index + 1,
          sigla: p.sigla,
          grau: p.grau,
        })),
      }),
    ]);

    const resultado = await prisma.instrucaoPontuacao.findMany({
      where: { instrucaoId, fase: fase as FaseAtividade },
      orderBy: { ordem: "asc" },
    });

    return NextResponse.json({ success: true, data: resultado });
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/evolucao/pontuacoes", acao: "PUT" }, error);
    return NextResponse.json(
      { error: classificacao.mensagem ?? "Erro interno", details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
