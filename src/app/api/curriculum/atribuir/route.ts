import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { randomUUID } from "crypto";

// API para atribuir curriculum a um paciente
export async function POST(request: NextRequest) {
  try {
    console.log("📝 API Curriculum/Atribuir - Atribuindo curriculum ao paciente...");

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

    // Verificar permissão
    if (!hasPermission(user, 'create_activities')) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para atribuir curriculums" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { pacienteId, curriculumId } = body;

    // Validações básicas
    if (!pacienteId || !curriculumId) {
      return NextResponse.json(
        { error: "ID do paciente e ID do curriculum são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se o paciente existe e pertence à clínica
    const paciente = await prisma.paciente.findFirst({
      where: {
        id: pacienteId,
        tenantId: user.tenant.id,
        ativo: true,
      },
    });

    if (!paciente) {
      return NextResponse.json(
        { error: "Paciente não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Verificar se o curriculum existe e pertence à clínica
    const curriculum = await prisma.curriculum.findFirst({
      where: {
        id: curriculumId,
        tenantId: user.tenant.id,
        ativo: true,
      },
    });

    if (!curriculum) {
      return NextResponse.json(
        { error: "Curriculum não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Verificar se já existe atribuição ativa
    const atribuicaoExistente = await prisma.pacienteCurriculum.findFirst({
      where: {
        pacienteId,
        curriculumId,
        ativa: true,
      },
    });

    if (atribuicaoExistente) {
      return NextResponse.json(
        { error: "Este curriculum já está atribuído a este paciente" },
        { status: 409 }
      );
    }

    console.log(`📝 Atribuindo curriculum "${curriculum.nome}" ao paciente "${paciente.nome}"`);

    // Criar atribuição
    const atribuicao = await prisma.pacienteCurriculum.create({
      data: {
        id: randomUUID(),
        pacienteId,
        curriculumId,
        atribuida_por: user.id,
        ativa: true,
      },
      include: {
        curriculum: {
          include: {
            atividades: {
              orderBy: { ordem: 'asc' },
              include: {
                atividade: true,
              }
            }
          }
        },
        paciente: true,
      }
    });

    console.log(`✅ Curriculum atribuído com sucesso`);

    return NextResponse.json({
      success: true,
      data: atribuicao,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao atribuir curriculum:", error);
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

// API para listar curriculums atribuídos a um paciente
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API Curriculum/Atribuir - Listando curriculums do paciente...");

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

    // Verificar permissão
    if (!hasPermission(user, 'view_activities')) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para visualizar curriculums" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const pacienteId = url.searchParams.get('pacienteId');

    if (!pacienteId) {
      return NextResponse.json(
        { error: "ID do paciente é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se o paciente existe e pertence à clínica
    const paciente = await prisma.paciente.findFirst({
      where: {
        id: pacienteId,
        tenantId: user.tenant.id,
        ativo: true,
      },
    });

    if (!paciente) {
      return NextResponse.json(
        { error: "Paciente não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    console.log(`🔍 Buscando curriculums atribuídos ao paciente "${paciente.nome}"`);

    // Buscar curriculums atribuídos
    const atribuicoes = await prisma.pacienteCurriculum.findMany({
      where: {
        pacienteId,
        ativa: true,
      },
      include: {
        curriculum: {
          include: {
            atividades: {
              orderBy: { ordem: 'asc' },
              include: {
                atividade: true,
              }
            }
          }
        }
      },
      orderBy: {
        atribuida_em: 'desc'
      }
    });

    console.log(`✅ Encontrados ${atribuicoes.length} curriculums atribuídos`);

    return NextResponse.json({
      success: true,
      data: atribuicoes,
      total: atribuicoes.length,
      paciente: {
        id: paciente.id,
        nome: paciente.nome
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao listar curriculums atribuídos:", error);
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

// API para remover atribuição de curriculum (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ API Curriculum/Atribuir - Removendo atribuição...");

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

    // Verificar permissão
    if (!hasPermission(user, 'edit_activities')) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para remover atribuições" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "ID da atribuição é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a atribuição existe
    const atribuicao = await prisma.pacienteCurriculum.findUnique({
      where: { id },
      include: {
        paciente: true,
        curriculum: true,
      }
    });

    if (!atribuicao) {
      return NextResponse.json(
        { error: "Atribuição não encontrada" },
        { status: 404 }
      );
    }

    // Verificar se o paciente pertence à clínica do usuário
    if (atribuicao.paciente.tenantId !== user.tenant.id) {
      return NextResponse.json(
        { error: "Atribuição não pertence a esta clínica" },
        { status: 403 }
      );
    }

    console.log(`🗑️ Removendo atribuição do curriculum "${atribuicao.curriculum.nome}" do paciente "${atribuicao.paciente.nome}"`);

    // Soft delete - apenas marcar como inativa
    await prisma.pacienteCurriculum.update({
      where: { id },
      data: { ativa: false },
    });

    console.log(`✅ Atribuição removida com sucesso`);

    return NextResponse.json({
      success: true,
      message: "Atribuição removida com sucesso",
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao remover atribuição:", error);
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
