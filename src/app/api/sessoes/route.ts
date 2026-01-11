/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { randomUUID } from "crypto";

// API para iniciar uma sessão de atividade
export async function POST(request: NextRequest) {
  try {
    console.log("📝 API Sessões - Iniciando sessão...");

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
    const { pacienteId, atividadeId } = body;

    // Validações básicas
    if (!pacienteId || !atividadeId) {
      return NextResponse.json(
        { error: "ID do paciente e ID da atividade são obrigatórios" },
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

    // Verificar se a atividade existe e pertence à clínica
    const atividade = await prisma.atividade.findFirst({
      where: {
        id: atividadeId,
        tenantId: user.tenant.id,
        ativo: true,
      },
      include: {
        instrucoes: {
          orderBy: { ordem: "asc" },
        },
      },
    });

    if (!atividade) {
      return NextResponse.json(
        { error: "Atividade não encontrada ou não pertence a esta clínica" },
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
    const adminRoles = ['ADMIN', 'SUPER_ADMIN'];
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
    const sessaoEmAndamento = await prisma.sessaoAtividade.findFirst({
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
            "Já existe uma sessão em andamento com este paciente. Finalize a sessão atual antes de iniciar outra.",
        },
        { status: 409 }
      );
    }

    console.log(
      `📝 Iniciando sessão: Paciente "${paciente.nome}" | Atividade "${atividade.nome}" | Terapeuta "${profissional.nome}" | Iniciado por: ${user.email} (${user.role})`
    );

    // Criar sessão
    const sessao = await prisma.sessaoAtividade.create({
      data: {
        id: randomUUID(),
        pacienteId,
        atividadeId,
        profissionalId: profissional.id,
        status: "EM_ANDAMENTO",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        paciente: true,
        atividade: {
          include: {
            instrucoes: {
              orderBy: { ordem: "asc" },
            },
          },
        },
        profissional: true,
      },
    });

    console.log(`✅ Sessão iniciada com ID: ${sessao.id}`);

    return NextResponse.json({
      success: true,
      data: sessao,
      message: `Sessão iniciada com ${atividade.instrucoes.length} instruções`,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao iniciar sessão:", error);
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

// API para listar sessões (histórico) - ATIVIDADES + AVALIAÇÕES
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API Sessões - Listando sessões...");

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

    // Se buscar por ID específico, retornar sessão única (pode ser atividade ou avaliação)
    if (sessaoId) {
      // Tentar buscar como sessão de atividade
      const sessaoAtividade = await prisma.sessaoAtividade.findFirst({
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
          atividade: {
            include: {
              instrucoes: {
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
          avaliacoes: {
            include: {
              instrucao: {
                select: {
                  ordem: true,
                  texto: true,
                },
              },
            },
            orderBy: {
              instrucao: {
                ordem: "asc",
              },
            },
          },
        },
      });

      if (sessaoAtividade) {
        // Formatar resposta de atividade
        return NextResponse.json({
          success: true,
          data: {
            ...sessaoAtividade,
            tipo: "ATIVIDADE",
            paciente: {
              id: sessaoAtividade.paciente.id,
              name: sessaoAtividade.paciente.nome,
            },
          },
        });
      }

      // Se não encontrou como atividade, buscar como avaliação
      const sessaoAvaliacao = await prisma.sessaoAvaliacao.findFirst({
        where: {
          id: sessaoId,
          paciente: {
            tenantId: user.tenant.id,
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

      if (sessaoAvaliacao) {
        // Formatar resposta de avaliação
        return NextResponse.json({
          success: true,
          data: {
            ...sessaoAvaliacao,
            tipo: "AVALIACAO",
            paciente: {
              id: sessaoAvaliacao.paciente.id,
              name: sessaoAvaliacao.paciente.nome,
            },
          },
        });
      }

      return NextResponse.json(
        { success: false, error: "Sessão não encontrada" },
        { status: 404 }
      );
    }

    // Construir where clause para atividades
    const whereAtividade: any = {};

    if (pacienteId) {
      // Verificar se o paciente pertence à clínica
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

      whereAtividade.pacienteId = pacienteId;
    } else {
      // Se não especificar paciente, buscar apenas pacientes da clínica
      whereAtividade.paciente = {
        tenantId: user.tenant.id,
      };
    }

    if (status) {
      whereAtividade.status = status;
    }

    // Construir where clause para avaliações (mesmos critérios)
    const whereAvaliacao = { ...whereAtividade };

    // 🔒 CRÍTICO: Se o usuário for terapeuta, filtrar apenas suas sessões
    const adminRoles = ['ADMIN', 'SUPER_ADMIN'];
    if (!adminRoles.includes(user.role)) {
      // Buscar profissional vinculado ao terapeuta
      const profissional = await prisma.profissional.findFirst({
        where: {
          usuarioId: user.id,
          tenantId: user.tenant.id,
          ativo: true,
        },
      });

      if (profissional) {
        whereAtividade.profissionalId = profissional.id;
        whereAvaliacao.profissionalId = profissional.id;
      } else {
        // Se não encontrou profissional, retornar vazio
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          tenant: {
            id: user.tenant.id,
            name: user.tenant.name,
          },
        });
      }
    }

    console.log(`🔍 Buscando sessões com filtros:`, whereAtividade);

    // Buscar sessões de ATIVIDADES
    const sessoesAtividade = await prisma.sessaoAtividade.findMany({
      where: whereAtividade,
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            cpf: true,
          },
        },
        atividade: {
          select: {
            id: true,
            nome: true,
          },
        },
        profissional: {
          select: {
            id: true,
            nome: true,
            especialidade: true,
          },
        },
        avaliacoes: {
          include: {
            instrucao: true,
          },
          orderBy: {
            instrucao: {
              ordem: "asc",
            },
          },
        },
      },
      orderBy: {
        iniciada_em: "desc",
      },
      take: 50, // Limitar a 50 últimas sessões
    });

    // Buscar sessões de AVALIAÇÕES
    const sessoesAvaliacao = await prisma.sessaoAvaliacao.findMany({
      where: whereAvaliacao,
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            cpf: true,
          },
        },
        avaliacao: {
          select: {
            id: true,
            nome: true,
            tipo: true,
          },
        },
        profissional: {
          select: {
            id: true,
            nome: true,
            especialidade: true,
          },
        },
        respostas: {
          include: {
            tarefa: true,
          },
          orderBy: {
            tarefa: {
              ordem: "asc",
            },
          },
        },
      },
      orderBy: {
        iniciada_em: "desc",
      },
      take: 50,
    });

    // Combinar e formatar as sessões
    const sessoesFormatadas = [
      ...sessoesAtividade.map((s) => ({
        ...s,
        tipo: "ATIVIDADE" as const,
        nome_item: s.atividade.nome,
      })),
      ...sessoesAvaliacao.map((s) => ({
        ...s,
        tipo: "AVALIACAO" as const,
        nome_item: s.avaliacao.nome,
        // Mapear estrutura para compatibilidade
        atividade: {
          id: s.avaliacao.id,
          nome: s.avaliacao.nome,
        },
      })),
    ];

    // Ordenar por data de início (mais recente primeiro)
    sessoesFormatadas.sort(
      (a, b) => new Date(b.iniciada_em).getTime() - new Date(a.iniciada_em).getTime()
    );

    // Limitar ao total de 50 sessões
    const sessoesFinais = sessoesFormatadas.slice(0, 50);

    console.log(
      `✅ Encontradas ${sessoesAtividade.length} sessões de atividades + ${sessoesAvaliacao.length} sessões de avaliações = ${sessoesFinais.length} total`
    );

    return NextResponse.json({
      success: true,
      data: sessoesFinais,
      total: sessoesFinais.length,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao listar sessões:", error);
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
