/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { randomUUID } from "crypto";

// API para listar atividades da clínica
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API Atividades - Buscando atividades...");

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
    if (!hasPermission(user, "view_activities")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para visualizar atividades" },
        { status: 403 }
      );
    }

    console.log(
      `🔍 Buscando atividades para clínica: ${user.tenant.name} (${user.tenant.id})`
    );

    // Buscar atividades da clínica
    const atividades = await prisma.atividade.findMany({
      where: {
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Filtrar por tenant
        ativo: true,
      },
      include: {
        instrucoes: {
          orderBy: {
            ordem: "asc",
          },
        },
        _count: {
          select: {
            atribuicoes: true,
            sessoes: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`✅ Encontradas ${atividades.length} atividades`);

    return NextResponse.json({
      success: true,
      data: atividades,
      total: atividades.length,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar atividades:", error);
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

// API para criar nova atividade
export async function POST(request: NextRequest) {
  try {
    console.log("📝 API Atividades - Criando nova atividade...");

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
    if (!hasPermission(user, "create_activities")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para criar atividades" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nome, descricao, tipo, metodologia, objetivo, instrucoes } = body;

    // Validações básicas
    if (!nome || !tipo) {
      return NextResponse.json(
        { error: "Nome e tipo são obrigatórios" },
        { status: 400 }
      );
    }

    if (!instrucoes || !Array.isArray(instrucoes) || instrucoes.length === 0) {
      return NextResponse.json(
        { error: "A atividade deve ter pelo menos uma instrução" },
        { status: 400 }
      );
    }

    console.log(
      `📝 Criando atividade "${nome}" com ${instrucoes.length} instruções`
    );

    // Criar atividade com instruções em uma transação
    const novaAtividade = await prisma.$transaction(async (tx) => {
      // Criar a atividade
      const atividade = await tx.atividade.create({
        data: {
          id: randomUUID(),
          tenantId: user.tenant!.id, // 🔒 CRÍTICO: Associar ao tenant
          nome,
          descricao,
          tipo,
          metodologia,
          objetivo,
          ativo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Criar as instruções
      const instrucoesData = instrucoes.map(
        (instrucao: any, index: number) => ({
          id: randomUUID(),
          atividadeId: atividade.id,
          ordem: index + 1,
          texto: instrucao.texto,
          observacao: instrucao.observacao || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );

      await tx.atividadeInstrucao.createMany({
        data: instrucoesData,
      });

      // Retornar atividade com instruções
      return await tx.atividade.findUnique({
        where: { id: atividade.id },
        include: {
          instrucoes: {
            orderBy: { ordem: "asc" },
          },
        },
      });
    });

    console.log(`✅ Atividade "${nome}" criada com sucesso`);

    return NextResponse.json({
      success: true,
      data: novaAtividade,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao criar atividade:", error);
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

// API para atualizar atividade
export async function PUT(request: NextRequest) {
  try {
    console.log("✏️ API Atividades - Atualizando atividade...");

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
    if (!hasPermission(user, "edit_activities")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para editar atividades" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, nome, descricao, tipo, metodologia, objetivo, instrucoes } =
      body;

    // Validações básicas
    if (!id || !nome || !tipo) {
      return NextResponse.json(
        { error: "ID, nome e tipo são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se a atividade existe e pertence à clínica
    const atividadeExistente = await prisma.atividade.findFirst({
      where: {
        id: id,
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar tenant
        ativo: true,
      },
    });

    if (!atividadeExistente) {
      return NextResponse.json(
        { error: "Atividade não encontrada ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    console.log(`✏️ Atualizando atividade "${nome}"`);

    // Atualizar atividade e instruções em uma transação
    const atividadeAtualizada = await prisma.$transaction(async (tx) => {
      // Atualizar a atividade
      const atividade = await tx.atividade.update({
        where: { id },
        data: {
          nome,
          descricao,
          tipo,
          metodologia,
          objetivo,
        },
      });

      // Se instruções foram fornecidas, atualizar
      if (instrucoes && Array.isArray(instrucoes)) {
        // Deletar instruções antigas
        await tx.atividadeInstrucao.deleteMany({
          where: { atividadeId: id },
        });

        // Criar novas instruções
        const instrucoesData = instrucoes.map(
          (instrucao: any, index: number) => ({
            id: randomUUID(),
            atividadeId: atividade.id,
            ordem: index + 1,
            texto: instrucao.texto,
            observacao: instrucao.observacao || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        );

        await tx.atividadeInstrucao.createMany({
          data: instrucoesData,
        });
      }

      // Retornar atividade com instruções
      return await tx.atividade.findUnique({
        where: { id: atividade.id },
        include: {
          instrucoes: {
            orderBy: { ordem: "asc" },
          },
        },
      });
    });

    console.log(`✅ Atividade "${nome}" atualizada com sucesso`);

    return NextResponse.json({
      success: true,
      data: atividadeAtualizada,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar atividade:", error);
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

// API para deletar atividade (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ API Atividades - Deletando atividade...");

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
    if (!hasPermission(user, "delete_activities")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para deletar atividades" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID da atividade é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a atividade existe e pertence à clínica
    const atividadeExistente = await prisma.atividade.findFirst({
      where: {
        id: id,
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar tenant
        ativo: true,
      },
    });

    if (!atividadeExistente) {
      return NextResponse.json(
        { error: "Atividade não encontrada ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    console.log(`🗑️ Desativando atividade "${atividadeExistente.nome}"`);

    // Soft delete - apenas marcar como inativo
    await prisma.atividade.update({
      where: { id },
      data: { ativo: false },
    });

    console.log(
      `✅ Atividade "${atividadeExistente.nome}" desativada com sucesso`
    );

    return NextResponse.json({
      success: true,
      message: "Atividade removida com sucesso",
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao deletar atividade:", error);
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
