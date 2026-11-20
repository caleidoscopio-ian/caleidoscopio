import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { registrarErroApi } from "@/lib/erro-prisma";

/**
 * POST - Encerrar, sem concluir, uma sessão de plano terapêutico em andamento.
 *
 * Não é o mesmo que finalizar: `/finalizar` exige todas as tentativas
 * avaliadas e recalcula a evolução de fase. Aqui a sessão vira CANCELADA —
 * continua no histórico com o que foi registrado, e a evolução (que só lê
 * sessões FINALIZADA) não a considera.
 */
export async function POST(request: NextRequest) {
  let user: Awaited<ReturnType<typeof getAuthenticatedUser>> = null;
  try {
    user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Usuário não autenticado" }, { status: 401 });
    }

    if (!user.tenant?.id) {
      return NextResponse.json(
        { success: false, error: "Usuário não está associado a uma clínica" },
        { status: 403 }
      );
    }

    if (!(await hasPermission(user, "edit_sessions"))) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para encerrar sessões" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const sessaoId: unknown = body?.sessaoId;

    if (typeof sessaoId !== "string" || !sessaoId) {
      return NextResponse.json({ success: false, error: "ID da sessão é obrigatório" }, { status: 400 });
    }

    // sessaoCurriculum não tem tenantId: o escopo vem pelo paciente
    const sessao = await prisma.sessaoCurriculum.findFirst({
      where: { id: sessaoId, paciente: { tenantId: user.tenant.id } },
      select: { id: true },
    });

    if (!sessao) {
      return NextResponse.json({ success: false, error: "Sessão não encontrada" }, { status: 404 });
    }

    // Condicional no próprio update: duas abas encerrando/finalizando ao mesmo
    // tempo não sobrescrevem uma sessão que acabou de ser finalizada
    const { count } = await prisma.sessaoCurriculum.updateMany({
      where: { id: sessaoId, status: "EM_ANDAMENTO", paciente: { tenantId: user.tenant.id } },
      data: { status: "CANCELADA", finalizada_em: new Date() },
    });

    if (count === 0) {
      return NextResponse.json(
        { success: false, error: "Esta sessão já foi finalizada ou encerrada" },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, message: "Sessão encerrada" });
  } catch (error) {
    const { ref, classificacao } = registrarErroApi(
      { rota: "/api/sessoes-curriculum/cancelar", acao: "POST", tenantId: user?.tenant?.id, usuarioId: user?.id },
      error
    );
    return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? "Erro interno do servidor", details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
