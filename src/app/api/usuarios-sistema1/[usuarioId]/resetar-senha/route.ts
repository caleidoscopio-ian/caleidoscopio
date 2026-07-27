import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { managerClient } from "@/lib/manager-client";

// POST - Resetar a senha de um usuário (delega ao Sistema 1, que é quem manda nas credenciais)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ usuarioId: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    if (!user.tenant?.id) {
      return NextResponse.json(
        { success: false, error: "Usuário não está associado a uma clínica" },
        { status: 403 }
      );
    }

    if (!(await hasPermission(user, "edit_usuarios"))) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para resetar senha de usuários" },
        { status: 403 }
      );
    }

    const { usuarioId } = await params;

    if (!usuarioId) {
      return NextResponse.json(
        { success: false, error: "usuarioId é obrigatório" },
        { status: 400 }
      );
    }

    const result = await managerClient.resetPassword(usuarioId, user.token);

    return NextResponse.json({
      success: true,
      temporaryPassword: result.temporaryPassword,
    });
  } catch (error) {
    console.error("Erro ao resetar senha do usuário:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 }
    );
  }
}
