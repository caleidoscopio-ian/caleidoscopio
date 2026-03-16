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
    if (!await hasPermission(user, "view_activities")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para visualizar atividades" },
        { status: 403 }
      );
    }

    console.log(
      `🔍 Buscando atividades para clínica: ${user.tenant.name} (${user.tenant.id})`
    );

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // Se buscar por ID específico, retornar atividade única com todas as relações
    if (id) {
      const atividade = await prisma.atividade.findFirst({
        where: {
          id,
          tenantId: user.tenant.id, // 🔒 CRÍTICO: Filtrar por tenant
        },
        include: {
          instrucoes: {
            orderBy: {
              ordem: "asc",
            },
          },
          pontuacoes: {
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
      });

      if (!atividade) {
        return NextResponse.json(
          { success: false, error: "Atividade não encontrada" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: atividade,
      });
    }

    // Buscar todas as atividades da clínica
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
        pontuacoes: {
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
    if (!await hasPermission(user, "create_activities")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para criar atividades" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      nome,
      protocolo,
      habilidade,
      marco_codificacao,
      tipo_ensino,
      qtd_alvos_sessao,
      qtd_tentativas_alvo,
      instrucoes,
      pontuacoes,
    } = body;

    // Validações básicas
    if (!nome) {
      return NextResponse.json(
        { error: "Nome é obrigatório" },
        { status: 400 }
      );
    }

    console.log(`📝 Criando atividade "${nome}"`);

    // Criar atividade com instruções e pontuações em uma transação
    const novaAtividade = await prisma.$transaction(async (tx) => {
      // Criar a atividade
      const atividade = await tx.atividade.create({
        data: {
          id: randomUUID(),
          tenantId: user.tenant!.id, // 🔒 CRÍTICO: Associar ao tenant
          nome,
          protocolo: protocolo || null,
          habilidade: habilidade || null,
          marco_codificacao: marco_codificacao || null,
          tipo_ensino: tipo_ensino || null,
          qtd_alvos_sessao: qtd_alvos_sessao || null,
          qtd_tentativas_alvo: qtd_tentativas_alvo || null,
          ativo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Criar instruções (se houver)
      if (instrucoes && Array.isArray(instrucoes) && instrucoes.length > 0) {
        await tx.atividadeInstrucao.createMany({
          data: instrucoes.map((inst: any, index: number) => ({
            id: randomUUID(),
            atividadeId: atividade.id,
            ordem: inst.ordem || index + 1,
            texto: inst.texto,
            como_aplicar: inst.como_aplicar || null,
            observacao: inst.observacao || null,
            procedimento_correcao: inst.procedimento_correcao || null,
            materiais_utilizados: inst.materiais_utilizados || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        });
      }

      // Criar pontuações (se houver)
      if (pontuacoes && Array.isArray(pontuacoes) && pontuacoes.length > 0) {
        await tx.atividadePontuacao.createMany({
          data: pontuacoes.map((pont: any) => ({
            id: randomUUID(),
            atividadeId: atividade.id,
            ordem: pont.ordem,
            sigla: pont.sigla,
            grau: pont.grau,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        });
      }

      // Retornar atividade completa com instruções e pontuações
      return await tx.atividade.findUnique({
        where: { id: atividade.id },
        include: {
          instrucoes: {
            orderBy: { ordem: "asc" },
          },
          pontuacoes: {
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
    if (!await hasPermission(user, "edit_activities")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para editar atividades" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id,
      nome,
      protocolo,
      habilidade,
      marco_codificacao,
      tipo_ensino,
      qtd_alvos_sessao,
      qtd_tentativas_alvo,
      instrucoes,
      pontuacoes,
    } = body;

    // Validações básicas
    if (!id) {
      return NextResponse.json(
        { error: "ID é obrigatório" },
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

    console.log(`✏️ Atualizando atividade ${id}`);

    // Atualizar atividade e instruções em uma transação
    const atividadeAtualizada = await prisma.$transaction(async (tx) => {
      // Preparar dados de atualização (apenas campos fornecidos)
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (nome !== undefined) updateData.nome = nome;
      if (protocolo !== undefined) updateData.protocolo = protocolo || null;
      if (habilidade !== undefined) updateData.habilidade = habilidade || null;
      if (marco_codificacao !== undefined)
        updateData.marco_codificacao = marco_codificacao || null;
      if (tipo_ensino !== undefined)
        updateData.tipo_ensino = tipo_ensino || null;
      if (qtd_alvos_sessao !== undefined)
        updateData.qtd_alvos_sessao = qtd_alvos_sessao || null;
      if (qtd_tentativas_alvo !== undefined)
        updateData.qtd_tentativas_alvo = qtd_tentativas_alvo || null;

      // Atualizar a atividade
      const atividade = await tx.atividade.update({
        where: { id },
        data: updateData,
      });

      // Se instruções foram fornecidas, atualizar
      if (instrucoes && Array.isArray(instrucoes)) {
        // Deletar instruções antigas
        await tx.atividadeInstrucao.deleteMany({
          where: { atividadeId: id },
        });

        // Criar novas instruções
        if (instrucoes.length > 0) {
          await tx.atividadeInstrucao.createMany({
            data: instrucoes.map((instrucao: any, index: number) => ({
              id: randomUUID(),
              atividadeId: atividade.id,
              ordem: instrucao.ordem || index + 1,
              texto: instrucao.texto,
              como_aplicar: instrucao.como_aplicar || null,
              observacao: instrucao.observacao || null,
              procedimento_correcao: instrucao.procedimento_correcao || null,
              materiais_utilizados: instrucao.materiais_utilizados || null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          });
        }
      }

      // Se pontuações foram fornecidas, atualizar
      if (pontuacoes && Array.isArray(pontuacoes)) {
        // Deletar pontuações antigas
        await tx.atividadePontuacao.deleteMany({
          where: { atividadeId: id },
        });

        // Criar novas pontuações
        if (pontuacoes.length > 0) {
          await tx.atividadePontuacao.createMany({
            data: pontuacoes.map((pont: any) => ({
              id: randomUUID(),
              atividadeId: atividade.id,
              ordem: pont.ordem,
              sigla: pont.sigla,
              grau: pont.grau,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
          });
        }
      }

      // Retornar atividade completa com instruções e pontuações
      return await tx.atividade.findUnique({
        where: { id: atividade.id },
        include: {
          instrucoes: {
            orderBy: { ordem: "asc" },
          },
          pontuacoes: {
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
    if (!await hasPermission(user, "delete_activities")) {
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
