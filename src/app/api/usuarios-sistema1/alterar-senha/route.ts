import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { managerClient } from "@/lib/manager-client";
import { registrarErroApi } from "@/lib/erro-prisma";

// POST - Usuário logado altera a própria senha (delega ao Sistema 1, que é quem manda
// nas credenciais). Ação self-service — não exige permissão RBAC além de estar autenticado.
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Senha atual e nova senha são obrigatórias" },
        { status: 400 }
      );
    }

    await managerClient.changeOwnPassword(currentPassword, newPassword, user.token);

    return NextResponse.json({ success: true });
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/usuarios-sistema1/alterar-senha", acao: "POST" }, error);
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? (error instanceof Error ? error.message : "Erro interno do servidor"), details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
