/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { randomUUID } from "crypto";

// API para iniciar uma sessão de avaliação
export async function POST(request: NextRequest) {
  try {
    console.log("📝 API Sessões Avaliação - Iniciando sessão...");

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
    if (!hasPermission(user, "create_sessions")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para criar sessões" },
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
      include: {
        tarefas: {
          orderBy: { ordem: "asc" },
          include: {
            nivel: true,
            habilidade: true,
          },
        },
        niveis: {
          orderBy: { ordem: "asc" },
        },
        habilidades: {
          orderBy: { ordem: "asc" },
        },
        pontuacoes: {
          orderBy: { ordem: "asc" },
        },
      },
    });

    if (!avaliacao) {
      return NextResponse.json(
        { error: "Avaliação não encontrada ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Buscar profissional vinculado ao usuário
    let profissional = await prisma.profissional.findFirst({
      where: {
        usuarioId: user.id,
        tenantId: user.tenant.id,
        ativo: true,
      },
    });

    // Se não encontrou profissional vinculado e o usuário é Admin, buscar o profissional do paciente
    const adminRoles = ["ADMIN", "SUPER_ADMIN"];
    if (!profissional && adminRoles.includes(user.role)) {
      // Buscar profissional vinculado ao paciente
      if (paciente.profissionalId) {
        profissional = await prisma.profissional.findFirst({
          where: {
            id: paciente.profissionalId,
            tenantId: user.tenant.id,
            ativo: true,
          },
        });
      }

      // Se ainda não encontrou, buscar qualquer profissional ativo da clínica
      if (!profissional) {
        profissional = await prisma.profissional.findFirst({
          where: {
            tenantId: user.tenant.id,
            ativo: true,
          },
        });
      }
    }

    if (!profissional) {
      return NextResponse.json(
        {
          error:
            "Profissional não encontrado. Verifique se seu usuário está vinculado a um profissional ou se há profissionais cadastrados na clínica.",
        },
        { status: 404 }
      );
    }

    // Verificar se existe sessão EM_ANDAMENTO para este paciente/terapeuta
    const sessaoEmAndamento = await prisma.sessaoAvaliacao.findFirst({
      where: {
        pacienteId,
        profissionalId: profissional.id,
        status: "EM_ANDAMENTO",
      },
    });

    if (sessaoEmAndamento) {
      return NextResponse.json(
        {
          error:
            "Já existe uma sessão de avaliação em andamento com este paciente. Finalize a sessão atual antes de iniciar outra.",
        },
        { status: 409 }
      );
    }

    console.log(
      `📝 Iniciando sessão de avaliação: Paciente "${paciente.nome}" | Avaliação "${avaliacao.nome}" | Terapeuta "${profissional.nome}" | Iniciado por: ${user.email} (${user.role})`
    );

    // Criar sessão
    const sessao = await prisma.sessaoAvaliacao.create({
      data: {
        id: randomUUID(),
        pacienteId,
        avaliacaoId,
        profissionalId: profissional.id,
        status: "EM_ANDAMENTO",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        paciente: true,
        avaliacao: {
          include: {
            tarefas: {
              orderBy: { ordem: "asc" },
              include: {
                nivel: true,
                habilidade: true,
              },
            },
            niveis: {
              orderBy: { ordem: "asc" },
            },
            habilidades: {
              orderBy: { ordem: "asc" },
            },
            pontuacoes: {
              orderBy: { ordem: "asc" },
            },
          },
        },
        profissional: true,
      },
    });

    console.log(`✅ Sessão de avaliação iniciada com ID: ${sessao.id}`);

    return NextResponse.json({
      success: true,
      data: sessao,
      message: `Sessão iniciada com ${avaliacao.tarefas.length} tarefas`,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao iniciar sessão de avaliação:", error);
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

// API para buscar sessão(ões) de avaliação
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API Sessões Avaliação - Buscando sessão(ões)...");

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
    if (!hasPermission(user, "view_sessions")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para visualizar sessões" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const sessaoId = url.searchParams.get("id");
    const pacienteId = url.searchParams.get("pacienteId");
    const status = url.searchParams.get("status");

    // Se tem ID, buscar sessão específica
    if (sessaoId) {
      const sessao = await prisma.sessaoAvaliacao.findFirst({
        where: {
          id: sessaoId,
          paciente: {
            tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar tenant
          },
        },
        include: {
          paciente: {
            select: {
              id: true,
              nome: true,
            },
          },
          avaliacao: {
            include: {
              tarefas: {
                orderBy: { ordem: "asc" },
                include: {
                  nivel: true,
                  habilidade: true,
                },
              },
              niveis: {
                orderBy: { ordem: "asc" },
              },
              habilidades: {
                orderBy: { ordem: "asc" },
              },
              pontuacoes: {
                orderBy: { ordem: "asc" },
              },
            },
          },
          profissional: {
            select: {
              id: true,
              nome: true,
            },
          },
          respostas: {
            include: {
              tarefa: {
                select: {
                  id: true,
                  ordem: true,
                  pergunta: true,
                },
              },
            },
            orderBy: {
              tarefa: {
                ordem: "asc",
              },
            },
          },
        },
      });

      if (!sessao) {
        return NextResponse.json(
          { success: false, error: "Sessão não encontrada" },
          { status: 404 }
        );
      }

      // Formatar resposta
      return NextResponse.json({
        success: true,
        data: {
          ...sessao,
          paciente: {
            id: sessao.paciente.id,
            nome: sessao.paciente.nome,
          },
        },
      });
    }

    // Listar sessões com filtros
    const whereClause: any = {
      paciente: {
        tenantId: user.tenant.id,
      },
    };

    if (pacienteId) {
      whereClause.pacienteId = pacienteId;
    }

    if (status) {
      whereClause.status = status;
    }

    const sessoes = await prisma.sessaoAvaliacao.findMany({
      where: whereClause,
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
          },
        },
        avaliacao: {
          select: {
            id: true,
            nome: true,
          },
        },
        profissional: {
          select: {
            nome: true,
          },
        },
        respostas: true,
      },
      orderBy: {
        iniciada_em: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: sessoes,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar sessão(ões) de avaliação:", error);
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

// API para salvar respostas e atualizar sessão
export async function PUT(request: NextRequest) {
  try {
    console.log("💾 API Sessões Avaliação - Salvando respostas...");

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
    if (!hasPermission(user, "edit_sessions")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para editar sessões" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      sessaoId,
      tarefaId,
      pontuacao,
      observacao,
      finalizar,
      observacoes_gerais,
    } = body;

    // Validações básicas
    if (!sessaoId) {
      return NextResponse.json(
        { error: "ID da sessão é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a sessão existe e pertence à clínica
    const sessao = await prisma.sessaoAvaliacao.findFirst({
      where: {
        id: sessaoId,
        paciente: {
          tenantId: user.tenant.id,
        },
      },
    });

    if (!sessao) {
      return NextResponse.json(
        { error: "Sessão não encontrada ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Se for para salvar resposta de uma tarefa
    if (tarefaId) {
      // Criar ou atualizar resposta
      await prisma.respostaTarefa.upsert({
        where: {
          sessaoId_tarefaId: {
            sessaoId,
            tarefaId,
          },
        },
        update: {
          pontuacao,
          observacao,
          updatedAt: new Date(),
        },
        create: {
          id: randomUUID(),
          sessaoId,
          tarefaId,
          pontuacao,
          observacao,
        },
      });

      console.log(`✅ Resposta salva para tarefa ${tarefaId}`);
    }

    // Se for para finalizar a sessão
    if (finalizar) {
      await prisma.sessaoAvaliacao.update({
        where: { id: sessaoId },
        data: {
          status: "FINALIZADA",
          finalizada_em: new Date(),
          observacoes_gerais,
          updatedAt: new Date(),
        },
      });

      console.log(`✅ Sessão finalizada: ${sessaoId}`);

      return NextResponse.json({
        success: true,
        message: "Sessão finalizada com sucesso",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Resposta salva com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao salvar resposta:", error);
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
