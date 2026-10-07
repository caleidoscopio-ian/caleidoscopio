import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { registrarErroApi } from "@/lib/erro-prisma";
import { cloneEhDoTenant } from "@/lib/escopo-tenant";

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

    // 🔒 O id vem da URL: sem conferir a posse, daria para ler o histórico de
    // evolução de um paciente de outra clínica
    if (!user.tenant?.id || !(await cloneEhDoTenant(atividadeCloneId, user.tenant.id))) {
      return NextResponse.json(
        { success: false, error: "Atividade não encontrada" },
        { status: 404 }
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
    const { ref, classificacao } = registrarErroApi({ rota: "/api/evolucao/historico", acao: "GET" }, error);
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido", ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
