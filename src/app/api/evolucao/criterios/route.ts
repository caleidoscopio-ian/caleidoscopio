import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { FaseAtividade } from "@prisma/client";

const FASES_VALIDAS: FaseAtividade[] = ["LINHA_BASE", "INTERVENCAO", "MANUTENCAO", "GENERALIZACAO"];

function validarFase(fase: string): fase is FaseAtividade {
  return FASES_VALIDAS.includes(fase as FaseAtividade);
}

// GET - Critérios por instrução (?instrucaoId=) ou por atividade (?atividadeCloneId=, legado)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Usuário não autenticado" }, { status: 401 });
    }

    const url = new URL(request.url);
    const instrucaoId = url.searchParams.get("instrucaoId");
    const atividadeCloneId = url.searchParams.get("atividadeCloneId");

    // Modo instrução (novo)
    if (instrucaoId) {
      const fases = await prisma.instrucaoFase.findMany({
        where: { instrucaoId },
        orderBy: { fase: "asc" },
      });
      return NextResponse.json({ success: true, data: fases });
    }

    // Modo atividade (legado)
    if (atividadeCloneId) {
      const fases = await prisma.atividadeFase.findMany({
        where: { atividadeCloneId },
        orderBy: { fase: "asc" },
      });
      return NextResponse.json({ success: true, data: fases });
    }

    return NextResponse.json({ error: "instrucaoId ou atividadeCloneId é obrigatório" }, { status: 400 });
  } catch (error) {
    console.error("Erro ao buscar critérios:", error);
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 });
  }
}

// PUT - Atualizar critérios por instrução ou atividade (legado)
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Usuário não autenticado" }, { status: 401 });
    }

    if (!await hasPermission(user, "edit_activities")) {
      return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const { instrucaoId, atividadeCloneId, fase, porcentagem_acerto, qtd_sessoes_consecutivas, fase_se_atingir, fase_se_nao_atingir } = body;

    if (!fase || !validarFase(fase)) {
      return NextResponse.json({ error: "Fase inválida ou não informada" }, { status: 400 });
    }

    if (porcentagem_acerto !== undefined && (typeof porcentagem_acerto !== "number" || porcentagem_acerto <= 0 || porcentagem_acerto > 100)) {
      return NextResponse.json({ error: "porcentagem_acerto deve ser entre 1 e 100" }, { status: 400 });
    }

    if (fase_se_atingir && !validarFase(fase_se_atingir)) {
      return NextResponse.json({ error: "fase_se_atingir inválida" }, { status: 400 });
    }

    if (fase_se_nao_atingir && !validarFase(fase_se_nao_atingir)) {
      return NextResponse.json({ error: "fase_se_nao_atingir inválida" }, { status: 400 });
    }

    const dataUpdate = {
      porcentagem_acerto: porcentagem_acerto !== undefined ? porcentagem_acerto : undefined,
      qtd_sessoes_consecutivas: qtd_sessoes_consecutivas !== undefined ? qtd_sessoes_consecutivas : undefined,
      fase_se_atingir: fase_se_atingir !== undefined ? (fase_se_atingir as FaseAtividade) || null : undefined,
      fase_se_nao_atingir: fase_se_nao_atingir !== undefined ? (fase_se_nao_atingir as FaseAtividade) || null : undefined,
    };

    // Modo instrução (novo)
    if (instrucaoId) {
      const faseAtualizada = await prisma.instrucaoFase.upsert({
        where: { instrucaoId_fase: { instrucaoId, fase: fase as FaseAtividade } },
        update: dataUpdate,
        create: {
          instrucaoId,
          fase: fase as FaseAtividade,
          porcentagem_acerto: porcentagem_acerto ?? 80,
          qtd_sessoes_consecutivas: qtd_sessoes_consecutivas ?? 1,
          fase_se_atingir: (fase_se_atingir as FaseAtividade) || null,
          fase_se_nao_atingir: (fase_se_nao_atingir as FaseAtividade) || null,
        },
      });
      return NextResponse.json({ success: true, data: faseAtualizada });
    }

    // Modo atividade (legado)
    if (atividadeCloneId) {
      const faseAtualizada = await prisma.atividadeFase.upsert({
        where: { atividadeCloneId_fase: { atividadeCloneId, fase: fase as FaseAtividade } },
        update: dataUpdate,
        create: {
          atividadeCloneId,
          fase: fase as FaseAtividade,
          porcentagem_acerto: porcentagem_acerto ?? 80,
          qtd_sessoes_consecutivas: qtd_sessoes_consecutivas ?? 1,
          fase_se_atingir: (fase_se_atingir as FaseAtividade) || null,
          fase_se_nao_atingir: (fase_se_nao_atingir as FaseAtividade) || null,
        },
      });
      return NextResponse.json({ success: true, data: faseAtualizada });
    }

    return NextResponse.json({ error: "instrucaoId ou atividadeCloneId é obrigatório" }, { status: 400 });
  } catch (error) {
    console.error("Erro ao atualizar critérios:", error);
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 });
  }
}
