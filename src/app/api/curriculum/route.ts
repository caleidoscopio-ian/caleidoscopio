/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { randomUUID } from "crypto";

// GET - Listar curriculums ou buscar por ID
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

    if (!hasPermission(user, "view_activities")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para visualizar curriculums" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // Buscar curriculum específico
    if (id) {
      const curriculum = await prisma.curriculum.findFirst({
        where: {
          id,
          tenantId: user.tenant.id,
        },
        include: {
          atividades: {
            include: {
              atividade: {
                include: {
                  instrucoes: {
                    orderBy: { ordem: "asc" },
                  },
                  pontuacoes: {
                    orderBy: { ordem: "asc" },
                  },
                },
              },
            },
            orderBy: {
              ordem: "asc",
            },
          },
        },
      });

      if (!curriculum) {
        return NextResponse.json(
          { success: false, error: "Curriculum não encontrado" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: curriculum,
      });
    }

    // Listar todos os curriculums
    const curriculums = await prisma.curriculum.findMany({
      where: {
        tenantId: user.tenant.id,
        ativo: true,
      },
      include: {
        atividades: {
          include: {
            atividade: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
          orderBy: {
            ordem: "asc",
          },
        },
        _count: {
          select: {
            atividades: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: curriculums,
      total: curriculums.length,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar curriculums:", error);
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

// POST - Criar novo curriculum
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

    if (!hasPermission(user, "create_activities")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para criar curriculums" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nome, descricao, observacao, atividades } = body;

    if (!nome) {
      return NextResponse.json(
        { error: "Nome é obrigatório" },
        { status: 400 }
      );
    }

    const novoCurriculum = await prisma.$transaction(async (tx) => {
      // Criar curriculum
      const curriculum = await tx.curriculum.create({
        data: {
          id: randomUUID(),
          tenantId: user.tenant!.id,
          nome,
          descricao: descricao || null,
          observacao: observacao || null,
          ativo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Adicionar atividades (se houver)
      if (atividades && Array.isArray(atividades) && atividades.length > 0) {
        await tx.curriculumAtividade.createMany({
          data: atividades.map((atv: any, index: number) => ({
            id: randomUUID(),
            curriculumId: curriculum.id,
            atividadeId: atv.atividadeId,
            ordem: atv.ordem || index + 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        });
      }

      return await tx.curriculum.findUnique({
        where: { id: curriculum.id },
        include: {
          atividades: {
            include: {
              atividade: true,
            },
            orderBy: { ordem: "asc" },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: novoCurriculum,
    });
  } catch (error) {
    console.error("❌ Erro ao criar curriculum:", error);
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

// PUT - Atualizar curriculum
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

    if (!hasPermission(user, "edit_activities")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para editar curriculums" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, nome, descricao, observacao, atividades } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se o curriculum existe e pertence à clínica
    const curriculumExistente = await prisma.curriculum.findFirst({
      where: {
        id,
        tenantId: user.tenant.id,
        ativo: true,
      },
    });

    if (!curriculumExistente) {
      return NextResponse.json(
        { error: "Curriculum não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    const curriculumAtualizado = await prisma.$transaction(async (tx) => {
      // Preparar dados de atualização
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (nome !== undefined) updateData.nome = nome;
      if (descricao !== undefined) updateData.descricao = descricao || null;
      if (observacao !== undefined) updateData.observacao = observacao || null;

      // Atualizar curriculum
      const curriculum = await tx.curriculum.update({
        where: { id },
        data: updateData,
      });

      // Se atividades foram fornecidas, atualizar
      if (atividades && Array.isArray(atividades)) {
        // Deletar atividades antigas
        await tx.curriculumAtividade.deleteMany({
          where: { curriculumId: id },
        });

        // Criar novas atividades
        if (atividades.length > 0) {
          await tx.curriculumAtividade.createMany({
            data: atividades.map((atv: any, index: number) => ({
              id: randomUUID(),
              curriculumId: curriculum.id,
              atividadeId: atv.atividadeId,
              ordem: atv.ordem || index + 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          });
        }
      }

      return await tx.curriculum.findUnique({
        where: { id: curriculum.id },
        include: {
          atividades: {
            include: {
              atividade: true,
            },
            orderBy: { ordem: "asc" },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: curriculumAtualizado,
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar curriculum:", error);
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

// DELETE - Excluir curriculum (soft delete)
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

    if (!hasPermission(user, "delete_activities")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para deletar curriculums" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID do curriculum é obrigatório" },
        { status: 400 }
      );
    }

    const curriculumExistente = await prisma.curriculum.findFirst({
      where: {
        id,
        tenantId: user.tenant.id,
        ativo: true,
      },
    });

    if (!curriculumExistente) {
      return NextResponse.json(
        { error: "Curriculum não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.curriculum.update({
      where: { id },
      data: { ativo: false },
    });

    return NextResponse.json({
      success: true,
      message: "Curriculum removido com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao deletar curriculum:", error);
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
