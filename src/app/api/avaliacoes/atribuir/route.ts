import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { randomUUID } from "crypto";

// API para atribuir avaliação a um paciente
export async function POST(request: NextRequest) {
  try {
    console.log("📝 API Avaliacoes/Atribuir - Atribuindo avaliação ao paciente...");

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
    if (!await hasPermission(user, 'create_activities')) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para atribuir avaliações" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { pacienteId, avaliacaoId } = body;

    // Validações básicas
    if (!pacienteId || !avaliacaoId) {
      return NextResponse.json(
        { error: "ID do paciente e ID da avaliação são obrigatórios" },
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

    // Verificar se a avaliação existe e pertence à clínica
    const avaliacao = await prisma.avaliacao.findFirst({
      where: {
        id: avaliacaoId,
        tenantId: user.tenant.id,
        ativo: true,
      },
    });

    if (!avaliacao) {
      return NextResponse.json(
        { error: "Avaliação não encontrada ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Verificar se já existe atribuição ativa
    const atribuicaoExistente = await prisma.pacienteAvaliacao.findFirst({
      where: {
        pacienteId,
        avaliacaoId,
        ativa: true,
      },
    });

    if (atribuicaoExistente) {
      return NextResponse.json(
        { error: "Esta avaliação já está atribuída a este paciente" },
        { status: 409 }
      );
    }

    console.log(`📝 Atribuindo avaliação "${avaliacao.nome}" ao paciente "${paciente.nome}"`);

    // Criar atribuição
    const atribuicao = await prisma.pacienteAvaliacao.create({
      data: {
        id: randomUUID(),
        pacienteId,
        avaliacaoId,
        atribuida_por: user.id,
        ativa: true,
      },
      include: {
        avaliacao: {
          include: {
            niveis: {
              orderBy: { ordem: 'asc' }
            },
            habilidades: {
              orderBy: { ordem: 'asc' }
            },
            pontuacoes: {
              orderBy: { ordem: 'asc' }
            },
            tarefas: {
              orderBy: { ordem: 'asc' }
            }
          }
        },
        paciente: true,
      }
    });

    console.log(`✅ Avaliação atribuída com sucesso`);

    return NextResponse.json({
      success: true,
      data: atribuicao,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao atribuir avaliação:", error);
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

// API para listar avaliações atribuídas a um paciente
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API Avaliacoes/Atribuir - Listando avaliações do paciente...");

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
    if (!await hasPermission(user, 'view_activities')) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para visualizar avaliações" },
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

    console.log(`🔍 Buscando avaliações atribuídas ao paciente "${paciente.nome}"`);

    // Buscar avaliações atribuídas
    const atribuicoes = await prisma.pacienteAvaliacao.findMany({
      where: {
        pacienteId,
        ativa: true,
      },
      include: {
        avaliacao: {
          include: {
            niveis: {
              orderBy: { ordem: 'asc' }
            },
            habilidades: {
              orderBy: { ordem: 'asc' }
            },
            pontuacoes: {
              orderBy: { ordem: 'asc' }
            },
            tarefas: {
              orderBy: { ordem: 'asc' }
            }
          }
        }
      },
      orderBy: {
        atribuida_em: 'desc'
      }
    });

    console.log(`✅ Encontradas ${atribuicoes.length} avaliações atribuídas`);

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
    console.error("❌ Erro ao listar avaliações atribuídas:", error);
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

// API para remover atribuição de avaliação (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ API Avaliacoes/Atribuir - Removendo atribuição...");

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
    if (!await hasPermission(user, 'edit_activities')) {
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
    const atribuicao = await prisma.pacienteAvaliacao.findUnique({
      where: { id },
      include: {
        paciente: true,
        avaliacao: true,
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

    console.log(`🗑️ Removendo atribuição da avaliação "${atribuicao.avaliacao.nome}" do paciente "${atribuicao.paciente.nome}"`);

    // Soft delete - apenas marcar como inativa
    await prisma.pacienteAvaliacao.update({
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
