import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { managerClient } from "@/lib/manager-client";
import { prisma } from "@/lib/prisma";

// DELETE - Excluir um usuário (delega ao Sistema 1, que é quem manda nas credenciais).
// Localmente, apenas desvincula o profissional (o cadastro/histórico clínico continua
// intacto — diferente da ação "Remover Terapeuta", que só desativa o profissional).
export async function DELETE(
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

    if (!(await hasPermission(user, "delete_usuarios"))) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para excluir usuários" },
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

    if (usuarioId === user.id) {
      return NextResponse.json(
        { success: false, error: "Você não pode excluir sua própria conta" },
        { status: 400 }
      );
    }

    // 1. Excluir o login/credenciais no Sistema 1 (fonte de verdade)
    await managerClient.deleteUser(usuarioId, user.token);

    // 2. Localmente, desvincular o profissional e desativar a role — sem apagar
    // o cadastro/histórico clínico do profissional
    await prisma.profissional.updateMany({
      where: { usuarioId, tenantId: user.tenant.id },
      data: { usuarioId: null },
    });

    await prisma.usuarioRole.updateMany({
      where: { usuarioId, tenantId: user.tenant.id },
      data: { ativo: false },
    });

    return NextResponse.json({
      success: true,
      message: "Usuário excluído com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 }
    );
  }
}
