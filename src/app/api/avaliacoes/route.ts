import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth/server";

const prisma = new PrismaClient();

// GET - Listar todas as avaliações ou buscar uma específica
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // Buscar avaliação específica
    if (id) {
      const avaliacao = await prisma.avaliacao.findFirst({
        where: {
          id,
          tenantId: user.tenant.id,
        },
        include: {
          niveis: {
            orderBy: { ordem: "asc" },
          },
          habilidades: {
            orderBy: { ordem: "asc" },
          },
          pontuacoes: {
            orderBy: { ordem: "asc" },
          },
          tarefas: {
            include: {
              nivel: true,
              habilidade: true,
            },
            orderBy: { ordem: "asc" },
          },
        },
      });

      if (!avaliacao) {
        return NextResponse.json(
          { success: false, error: "Avaliação não encontrada" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: avaliacao,
      });
    }

    // Listar todas as avaliações
    const avaliacoes = await prisma.avaliacao.findMany({
      where: {
        tenantId: user.tenant.id,
        ativo: true,
      },
      include: {
        _count: {
          select: {
            niveis: true,
            habilidades: true,
            tarefas: true,
            atribuicoes: {
              where: {
                ativa: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: avaliacoes,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar avaliações:", error);
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

// POST - Criar nova avaliação
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { tipo, nome, observacao } = body;

    // Validações
    if (!tipo || !nome) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios: tipo, nome" },
        { status: 400 }
      );
    }

    const avaliacao = await prisma.avaliacao.create({
      data: {
        tenantId: user.tenant.id,
        tipo,
        nome,
        observacao,
      },
      include: {
        niveis: true,
        habilidades: true,
        pontuacoes: true,
        tarefas: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: avaliacao,
    });
  } catch (error) {
    console.error("❌ Erro ao criar avaliação:", error);
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

// PUT - Atualizar avaliação
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { id, tipo, nome, observacao } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID da avaliação é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se avaliação existe e pertence ao tenant
    const avaliacaoExistente = await prisma.avaliacao.findFirst({
      where: {
        id,
        tenantId: user.tenant.id,
      },
    });

    if (!avaliacaoExistente) {
      return NextResponse.json(
        { success: false, error: "Avaliação não encontrada" },
        { status: 404 }
      );
    }

    const avaliacao = await prisma.avaliacao.update({
      where: { id },
      data: {
        tipo,
        nome,
        observacao,
      },
      include: {
        niveis: true,
        habilidades: true,
        pontuacoes: true,
        tarefas: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: avaliacao,
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar avaliação:", error);
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

// DELETE - Excluir avaliação (soft delete)
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID da avaliação é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se avaliação existe e pertence ao tenant
    const avaliacao = await prisma.avaliacao.findFirst({
      where: {
        id,
        tenantId: user.tenant.id,
      },
    });

    if (!avaliacao) {
      return NextResponse.json(
        { success: false, error: "Avaliação não encontrada" },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.avaliacao.update({
      where: { id },
      data: { ativo: false },
    });

    return NextResponse.json({
      success: true,
      message: "Avaliação excluída com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao excluir avaliação:", error);
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
