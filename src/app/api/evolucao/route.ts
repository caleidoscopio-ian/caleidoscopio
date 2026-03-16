import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";

// GET - Listar atividades clonadas de um paciente com dados de fase
export async function GET(request: NextRequest) {
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

    if (!await hasPermission(user, "view_activities")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const pacienteId = url.searchParams.get("pacienteId");
    const pacienteCurriculumId = url.searchParams.get("pacienteCurriculumId");

    if (!pacienteId) {
      return NextResponse.json(
        { error: "ID do paciente é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar paciente pertence à clínica
    const paciente = await prisma.paciente.findFirst({
      where: { id: pacienteId, tenantId: user.tenant.id, ativo: true },
    });

    if (!paciente) {
      return NextResponse.json(
        { error: "Paciente não encontrado" },
        { status: 404 }
      );
    }

    // Buscar curriculums atribuídos ao paciente com clones
    const whereClause: { pacienteId: string; ativa: boolean; id?: string } = {
      pacienteId,
      ativa: true,
    };

    if (pacienteCurriculumId) {
      whereClause.id = pacienteCurriculumId;
    }

    const atribuicoes = await prisma.pacienteCurriculum.findMany({
      where: whereClause,
      include: {
        curriculum: {
          select: { id: true, nome: true },
        },
        atividadesClone: {
          where: { ativo: true },
          orderBy: { ordem: "asc" },
          include: {
            instrucoes: { orderBy: { ordem: "asc" } },
            pontuacoes: { orderBy: { ordem: "asc" } },
            fases: true,
            historico: {
              orderBy: { alterado_em: "desc" },
              take: 5,
            },
          },
        },
      },
      orderBy: { atribuida_em: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: atribuicoes,
      paciente: { id: paciente.id, nome: paciente.nome },
    });
  } catch (error) {
    console.error("Erro ao buscar evolução:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
