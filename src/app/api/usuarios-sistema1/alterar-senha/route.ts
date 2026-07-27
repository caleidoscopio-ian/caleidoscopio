import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { managerClient } from "@/lib/manager-client";

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
    console.error("Erro ao alterar senha:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 }
    );
  }
}
