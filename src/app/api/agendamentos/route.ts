/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { StatusAgendamento } from "@/types/agendamento";

// GET - Listar agendamentos com filtros
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API Agendamentos - Iniciando busca com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error("❌ API Agendamentos - Falha na autenticação");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
          details: "Token inválido ou Sistema 1 não está respondendo",
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      console.error("❌ API Agendamentos - Usuário sem tenant associado");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica",
        },
        { status: 403 }
      );
    }

    // Terapeutas e Admins podem ver agendamentos
    if (!hasPermission(user, "view_patients")) {
      console.error(
        `❌ API Agendamentos - Permissão negada para role: ${user.role}`
      );
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para visualizar agendamentos",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Filtros
    const profissionalId = searchParams.get("profissionalId");
    const pacienteId = searchParams.get("pacienteId");
    const status = searchParams.get("status");
    const data_inicio = searchParams.get("data_inicio");
    const data_fim = searchParams.get("data_fim");
    const sala = searchParams.get("sala");

    // Construir query com filtros e isolamento multi-tenant
    const where: any = {
      // 🔒 CRÍTICO: Filtrar por tenant através do paciente
      paciente: {
        tenantId: user.tenant.id,
        ativo: true,
      },
      // 🔒 CRÍTICO: Filtrar por tenant através do profissional
      profissional: {
        tenantId: user.tenant.id,
        ativo: true,
      },
    };

    // 🔒 CRÍTICO: Se não for admin, terapeuta só vê seus próprios agendamentos
    const adminRoles = ["ADMIN", "SUPER_ADMIN"];
    if (!adminRoles.includes(user.role)) {
      // Buscar profissional vinculado ao usuário
      const profissionalDoUsuario = await prisma.profissional.findFirst({
        where: {
          usuarioId: user.id,
          tenantId: user.tenant.id,
          ativo: true,
        },
      });

      if (profissionalDoUsuario) {
        where.profissionalId = profissionalDoUsuario.id;
        console.log(
          `🔒 Terapeuta ${user.email} - filtrando agendamentos do profissional ${profissionalDoUsuario.nome}`
        );
      } else {
        // Se não encontrou profissional vinculado, não retorna nada
        console.log(
          `⚠️ Usuário ${user.email} (role: ${user.role}) não tem profissional vinculado`
        );
        return NextResponse.json([]);
      }
    } else if (profissionalId) {
      // Admin pode filtrar por profissional específico
      where.profissionalId = profissionalId;
    }

    if (pacienteId) {
      where.pacienteId = pacienteId;
    }

    if (status) {
      where.status = status as StatusAgendamento;
    }

    if (sala) {
      where.sala = sala;
    }

    // Filtro de data
    if (data_inicio || data_fim) {
      where.data_hora = {};

      if (data_inicio) {
        where.data_hora.gte = new Date(data_inicio);
      }

      if (data_fim) {
        where.data_hora.lte = new Date(data_fim);
      }
    }

    console.log(
      `🔍 Buscando agendamentos para clínica: ${user.tenant.name} (${user.tenant.id})`
    );

    // Buscar agendamentos com relacionamentos
    const agendamentos = await prisma.agendamento.findMany({
      where,
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            foto: true,
            cor_agenda: true,
            telefone: true,
          },
        },
        profissional: {
          select: {
            id: true,
            nome: true,
            especialidade: true,
            email: true,
          },
        },
        salaRelacao: {
          select: {
            id: true,
            nome: true,
            cor: true,
          },
        },
      },
      orderBy: {
        data_hora: "asc",
      },
    });

    console.log(
      `✅ Encontrados ${agendamentos.length} agendamentos para clínica "${user.tenant.name}"`
    );

    return NextResponse.json(agendamentos);
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);

    if (error instanceof Error) {
      if (error.message === "Usuário não autenticado") {
        return NextResponse.json(
          { success: false, error: "Sessão expirada. Faça login novamente." },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: "Erro ao buscar agendamentos" },
      { status: 500 }
    );
  }
}

// POST - Criar novo agendamento
export async function POST(request: NextRequest) {
  try {
    console.log(
      "📝 API Agendamentos - Criando novo agendamento com autenticação..."
    );

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error("❌ API Agendamentos POST - Falha na autenticação");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
          details: "Token inválido ou Sistema 1 não está respondendo",
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      return NextResponse.json(
        { success: false, error: "Usuário não está associado a uma clínica" },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!hasPermission(user, "create_patients")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para criar agendamentos" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      pacienteId,
      profissionalId,
      data_hora,
      horario_fim,
      sala,
      procedimento,
      status = StatusAgendamento.AGENDADO,
      observacoes,
    } = body;

    // Validações
    if (!pacienteId || !profissionalId || !data_hora || !horario_fim || !sala) {
      return NextResponse.json(
        { error: "Paciente, profissional, sala, horário de início e fim são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se paciente existe e pertence à clínica
    const paciente = await prisma.paciente.findFirst({
      where: {
        id: pacienteId,
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar tenant
        ativo: true,
      },
    });

    if (!paciente) {
      return NextResponse.json(
        { error: "Paciente não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Verificar se profissional existe e pertence à clínica
    const profissional = await prisma.profissional.findFirst({
      where: {
        id: profissionalId,
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar tenant
        ativo: true,
      },
    });

    if (!profissional) {
      return NextResponse.json(
        { error: "Profissional não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Verificar conflito de horário para o profissional
    const dataHora = new Date(data_hora);
    const dataFim = new Date(horario_fim);

    // Buscar agendamentos que possam conflitar
    const agendamentosExistentes = await prisma.agendamento.findMany({
      where: {
        profissionalId,
        status: {
          notIn: [StatusAgendamento.CANCELADO, StatusAgendamento.FALTOU],
        },
      },
      select: {
        id: true,
        data_hora: true,
        horario_fim: true,
      },
    });

    // Verificar sobreposição de intervalos
    const conflito = agendamentosExistentes.find((ag) => {
      const agInicio = new Date(ag.data_hora);
      const agFim = new Date(ag.horario_fim);

      // Dois intervalos se sobrepõem se:
      // (NovoInicio < ExistenteVim) E (NovoFim > ExistenteInicio)
      return dataHora < agFim && dataFim > agInicio;
    });

    if (conflito) {
      return NextResponse.json(
        {
          error:
            "Já existe um agendamento neste horário para este profissional",
        },
        { status: 409 }
      );
    }

    // Verificar disponibilidade da sala (obrigatória agora)
    const salaExistente = await prisma.sala.findFirst({
      where: {
        id: sala,
        tenantId: user.tenant.id,
        ativo: true,
      },
    });

    if (!salaExistente) {
      return NextResponse.json(
        { error: "Sala não encontrada ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Verificar conflito de horário na sala
    const agendamentosSala = await prisma.agendamento.findMany({
      where: {
        salaId: sala,
        status: {
          notIn: [StatusAgendamento.CANCELADO, StatusAgendamento.FALTOU],
        },
      },
      select: {
        id: true,
        data_hora: true,
        horario_fim: true,
      },
    });

    // Verificar sobreposição de intervalos para sala
    const conflitoSala = agendamentosSala.find((ag) => {
      const agInicio = new Date(ag.data_hora);
      const agFim = new Date(ag.horario_fim);
      return dataHora < agFim && dataFim > agInicio;
    });

    if (conflitoSala) {
      return NextResponse.json(
        {
          error: "Sala já está ocupada neste horário",
        },
        { status: 409 }
      );
    }

    // Verificar procedimento se fornecido
    if (procedimento) {
      const procedimentoExistente = await prisma.procedimento.findFirst({
        where: {
          id: procedimento,
          tenantId: user.tenant.id,
          ativo: true,
        },
      });

      if (!procedimentoExistente) {
        return NextResponse.json(
          { error: "Procedimento não encontrado ou não pertence a esta clínica" },
          { status: 404 }
        );
      }
    }

    console.log(
      `📝 Criando agendamento para "${paciente.nome}" com "${profissional.nome}" na clínica "${user.tenant.name}"`
    );

    // Criar agendamento
    const agendamento = await prisma.agendamento.create({
      data: {
        pacienteId,
        profissionalId,
        data_hora: dataHora,
        horario_fim: dataFim,
        duracao_minutos: Math.round((dataFim.getTime() - dataHora.getTime()) / 60000), // Calcular para compatibilidade
        salaId: sala, // Obrigatório agora
        sala: sala, // Manter campo antigo por compatibilidade
        procedimentoId: procedimento || null,
        status,
        observacoes,
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            foto: true,
            cor_agenda: true,
            telefone: true,
          },
        },
        profissional: {
          select: {
            id: true,
            nome: true,
            especialidade: true,
            email: true,
          },
        },
        salaRelacao: {
          select: {
            id: true,
            nome: true,
            cor: true,
          },
        },
        procedimento: {
          select: {
            id: true,
            nome: true,
            codigo: true,
            cor: true,
          },
        },
      },
    });

    console.log(
      `✅ Agendamento criado com sucesso para clínica "${user.tenant.name}"`
    );

    return NextResponse.json(agendamento, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar agendamento:", error);

    if (error instanceof Error) {
      if (error.message === "Usuário não autenticado") {
        return NextResponse.json(
          { success: false, error: "Sessão expirada. Faça login novamente." },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: "Erro ao criar agendamento" },
      { status: 500 }
    );
  }
}
