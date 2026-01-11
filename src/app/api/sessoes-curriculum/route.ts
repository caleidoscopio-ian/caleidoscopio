import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { randomUUID } from "crypto";
import { Prisma, StatusSessao } from "@prisma/client";

// POST - Iniciar sessão de curriculum
export async function POST(request: NextRequest) {
  try {
    console.log(
      "📝 API Sessoes-Curriculum - Iniciando sessão de curriculum..."
    );

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
        { success: false, error: "Sem permissão para iniciar sessões" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { pacienteId, curriculumId } = body;

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
      include: {
        atividades: {
          orderBy: { ordem: "asc" },
          include: {
            atividade: {
              include: {
                instrucoes: {
                  orderBy: { ordem: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!curriculum) {
      return NextResponse.json(
        { error: "Curriculum não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    if (!curriculum.atividades || curriculum.atividades.length === 0) {
      return NextResponse.json(
        { error: "Este curriculum não possui atividades atribuídas" },
        { status: 400 }
      );
    }

    // Buscar qualquer profissional ativo da mesma tenant
    const profissional = await prisma.profissional.findFirst({
      where: {
        tenantId: user.tenant.id,
        ativo: true,
      },
    });

    if (!profissional) {
      return NextResponse.json(
        { error: "Nenhum profissional encontrado nesta clínica" },
        { status: 404 }
      );
    }

    // Verificar se já existe uma sessão EM_ANDAMENTO para este paciente
    const sessaoExistente = await prisma.sessaoCurriculum.findFirst({
      where: {
        pacienteId,
        status: "EM_ANDAMENTO",
        paciente: {
          tenantId: user.tenant.id,
        },
      },
      include: {
        paciente: true,
        curriculum: {
          include: {
            atividades: {
              orderBy: { ordem: "asc" },
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
            },
          },
        },
        profissional: true,
        avaliacoes: true,
      },
    });

    if (sessaoExistente) {
      console.log(
        `ℹ️ Sessão EM_ANDAMENTO já existe para o paciente "${paciente.nome}". Retornando sessão existente.`
      );
      return NextResponse.json({
        success: true,
        data: sessaoExistente,
        message:
          "Já existe uma sessão em andamento para este paciente. Continue de onde parou.",
        existente: true,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
        },
      });
    }

    console.log(
      `📝 Criando sessão de curriculum "${curriculum.nome}" para paciente "${paciente.nome}"`
    );

    // Criar sessão de curriculum
    const sessao = await prisma.sessaoCurriculum.create({
      data: {
        id: randomUUID(),
        pacienteId,
        curriculumId,
        profissionalId: profissional.id,
        status: "EM_ANDAMENTO",
      },
      include: {
        paciente: true,
        curriculum: {
          include: {
            atividades: {
              orderBy: { ordem: "asc" },
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
            },
          },
        },
        profissional: true,
      },
    });

    console.log(`✅ Sessão de curriculum criada com sucesso`);

    return NextResponse.json({
      success: true,
      data: sessao,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao iniciar sessão de curriculum:", error);
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

// GET - Buscar sessão(ões) de curriculum
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API Sessoes-Curriculum - Buscando sessão(ões)...");

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

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const pacienteId = url.searchParams.get("pacienteId");
    const status = url.searchParams.get("status");

    // Se tem ID, buscar sessão específica
    if (id) {
      const sessao = await prisma.sessaoCurriculum.findUnique({
        where: { id },
        include: {
          paciente: true,
          curriculum: {
            include: {
              atividades: {
                orderBy: { ordem: "asc" },
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
              },
            },
          },
          profissional: true,
          avaliacoes: true,
        },
      });

      if (!sessao) {
        return NextResponse.json(
          { error: "Sessão não encontrada" },
          { status: 404 }
        );
      }

      // Verificar se o paciente pertence à clínica do usuário
      if (sessao.paciente.tenantId !== user.tenant.id) {
        return NextResponse.json(
          { error: "Sessão não pertence a esta clínica" },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        data: sessao,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
        },
      });
    }

    // Listar sessões com filtros
    const whereClause: Prisma.SessaoCurriculumWhereInput = {};

    // Filtrar por paciente (garantindo tenant)
    if (pacienteId) {
      whereClause.pacienteId = pacienteId;
      whereClause.paciente = {
        tenantId: user.tenant.id,
      };
    } else {
      // Se não especificou paciente, buscar apenas do tenant
      whereClause.paciente = {
        tenantId: user.tenant.id,
      };
    }

    // Filtrar por status (com validação)
    if (
      status &&
      ["EM_ANDAMENTO", "FINALIZADA", "CANCELADA"].includes(status)
    ) {
      whereClause.status = status as StatusSessao;
    }

    const sessoes = await prisma.sessaoCurriculum.findMany({
      where: whereClause,
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
          },
        },
        curriculum: {
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
        avaliacoes: true,
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
    console.error("❌ Erro ao buscar sessão(ões):", error);
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
