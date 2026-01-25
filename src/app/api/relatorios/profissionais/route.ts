import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Obter dados do usuário
    const userDataHeader = request.headers.get("X-User-Data");
    if (!userDataHeader) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    const user = JSON.parse(Buffer.from(userDataHeader, "base64").toString());
    const tenantId = user.tenant?.id;

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: "Tenant não identificado" },
        { status: 400 }
      );
    }

    // Filtros
    const profissionaisIds = searchParams.get("profissionais")?.split(",").filter(Boolean);
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");
    const tipo = searchParams.get("tipo"); // curriculum, atividade, avaliacao, agendamento
    const status = searchParams.get("status"); // EM_ANDAMENTO, FINALIZADA, CANCELADA

    // Construir filtros de data
    const filtroData: Record<string, unknown> = {};
    if (dataInicio) {
      filtroData.gte = new Date(dataInicio);
    }
    if (dataFim) {
      const dataFimDate = new Date(dataFim);
      dataFimDate.setHours(23, 59, 59, 999); // Incluir todo o dia
      filtroData.lte = dataFimDate;
    }

    // Buscar sessões de curriculum
    const whereClauseCurriculum: Prisma.SessaoCurriculumWhereInput = {
      profissional: { tenantId },
      ...(profissionaisIds?.length ? { profissionalId: { in: profissionaisIds } } : {}),
      ...(Object.keys(filtroData).length ? { iniciada_em: filtroData } : {}),
    };

    if (status && ["EM_ANDAMENTO", "FINALIZADA", "CANCELADA"].includes(status)) {
      whereClauseCurriculum.status = status as "EM_ANDAMENTO" | "FINALIZADA" | "CANCELADA";
    }

    const sessoesCurriculum = (!tipo || tipo === "curriculum") ? await prisma.sessaoCurriculum.findMany({
      where: whereClauseCurriculum,
      include: {
        paciente: {
          select: { id: true, nome: true, nascimento: true }
        },
        profissional: {
          select: { id: true, nome: true, especialidade: true }
        },
        curriculum: {
          select: { id: true, nome: true }
        },
      },
      orderBy: { iniciada_em: "desc" },
    }) : [];

    // Buscar sessões de atividade
    const whereClauseAtividade: Prisma.sessaoAtividadeWhereInput = {
      profissional: { tenantId },
      ...(profissionaisIds?.length ? { profissionalId: { in: profissionaisIds } } : {}),
      ...(Object.keys(filtroData).length ? { iniciada_em: filtroData } : {}),
    };

    if (status && ["EM_ANDAMENTO", "FINALIZADA", "CANCELADA"].includes(status)) {
      whereClauseAtividade.status = status as "EM_ANDAMENTO" | "FINALIZADA" | "CANCELADA";
    }

    const sessoesAtividade = (!tipo || tipo === "atividade") ? await prisma.sessaoAtividade.findMany({
      where: whereClauseAtividade,
      include: {
        paciente: {
          select: { id: true, nome: true, nascimento: true }
        },
        profissional: {
          select: { id: true, nome: true, especialidade: true }
        },
        atividade: {
          select: { id: true, nome: true }
        },
      },
      orderBy: { iniciada_em: "desc" },
    }) : [];

    // Buscar sessões de avaliação
    const whereClauseAvaliacao: Prisma.SessaoAvaliacaoWhereInput = {
      profissional: { tenantId },
      ...(profissionaisIds?.length ? { profissionalId: { in: profissionaisIds } } : {}),
      ...(Object.keys(filtroData).length ? { iniciada_em: filtroData } : {}),
    };

    if (status && ["EM_ANDAMENTO", "FINALIZADA", "CANCELADA"].includes(status)) {
      whereClauseAvaliacao.status = status as "EM_ANDAMENTO" | "FINALIZADA" | "CANCELADA";
    }

    const sessoesAvaliacao = (!tipo || tipo === "avaliacao") ? await prisma.sessaoAvaliacao.findMany({
      where: whereClauseAvaliacao,
      include: {
        paciente: {
          select: { id: true, nome: true, nascimento: true }
        },
        profissional: {
          select: { id: true, nome: true, especialidade: true }
        },
        avaliacao: {
          select: { id: true, nome: true, tipo: true }
        },
      },
      orderBy: { iniciada_em: "desc" },
    }) : [];

    // Buscar agendamentos
    const whereClauseAgendamento: Prisma.agendamentoWhereInput = {
      profissional: { tenantId },
      ...(profissionaisIds?.length ? { profissionalId: { in: profissionaisIds } } : {}),
      ...(Object.keys(filtroData).length ? { data_hora: filtroData } : {}),
    };

    if (status === "FINALIZADA") {
      whereClauseAgendamento.status = "ATENDIDO";
    } else if (status === "CANCELADA") {
      whereClauseAgendamento.status = "CANCELADO";
    }

    const agendamentos = (!tipo || tipo === "agendamento") ? await prisma.agendamento.findMany({
      where: whereClauseAgendamento,
      include: {
        paciente: {
          select: { id: true, nome: true, nascimento: true }
        },
        profissional: {
          select: { id: true, nome: true, especialidade: true }
        },
        salaRelacao: {
          select: { id: true, nome: true }
        },
        procedimento: {
          select: { id: true, nome: true }
        },
      },
      orderBy: { data_hora: "desc" },
    }) : [];

    // Consolidar dados
    const atendimentos = [
      ...sessoesCurriculum.map(s => ({
        id: s.id,
        tipo: "curriculum" as const,
        paciente: s.paciente,
        profissional: s.profissional,
        data_hora: s.iniciada_em,
        finalizada_em: s.finalizada_em,
        status: s.status,
        nome: s.curriculum.nome,
        observacoes: s.observacoes_gerais,
      })),
      ...sessoesAtividade.map(s => ({
        id: s.id,
        tipo: "atividade" as const,
        paciente: s.paciente,
        profissional: s.profissional,
        data_hora: s.iniciada_em,
        finalizada_em: s.finalizada_em,
        status: s.status,
        nome: s.atividade.nome,
        observacoes: s.observacoes_gerais,
      })),
      ...sessoesAvaliacao.map(s => ({
        id: s.id,
        tipo: "avaliacao" as const,
        paciente: s.paciente,
        profissional: s.profissional,
        data_hora: s.iniciada_em,
        finalizada_em: s.finalizada_em,
        status: s.status,
        nome: s.avaliacao.nome,
        observacoes: s.observacoes_gerais,
      })),
      ...agendamentos.map(a => ({
        id: a.id,
        tipo: "agendamento" as const,
        paciente: a.paciente,
        profissional: a.profissional,
        data_hora: a.data_hora,
        finalizada_em: a.horario_fim,
        status: a.status === "ATENDIDO" ? "FINALIZADA" : a.status === "CANCELADO" ? "CANCELADA" : "EM_ANDAMENTO",
        nome: a.procedimento?.nome || "Consulta",
        observacoes: a.observacoes,
        sala: a.salaRelacao?.nome,
      })),
    ];

    // Ordenar por data
    atendimentos.sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime());

    // Calcular estatísticas
    const totalSessoes = atendimentos.length;
    const sessoesFinalizadas = atendimentos.filter(a => a.status === "FINALIZADA").length;
    const pacientesUnicos = new Set(atendimentos.map(a => a.paciente.id)).size;
    const taxaConclusao = totalSessoes > 0 ? (sessoesFinalizadas / totalSessoes) * 100 : 0;

    // Calcular total de horas
    const horasTotais = atendimentos.reduce((total, a) => {
      if (a.finalizada_em && a.data_hora) {
        const diff = new Date(a.finalizada_em).getTime() - new Date(a.data_hora).getTime();
        return total + (diff / (1000 * 60 * 60)); // converter para horas
      }
      return total;
    }, 0);

    // Distribuição por tipo
    const distribuicao = {
      curriculum: atendimentos.filter(a => a.tipo === "curriculum").length,
      atividade: atendimentos.filter(a => a.tipo === "atividade").length,
      avaliacao: atendimentos.filter(a => a.tipo === "avaliacao").length,
      agendamento: atendimentos.filter(a => a.tipo === "agendamento").length,
    };

    // Agrupar por paciente
    const porPaciente = atendimentos.reduce((acc, atend) => {
      const pacienteId = atend.paciente.id;
      if (!acc[pacienteId]) {
        acc[pacienteId] = {
          paciente: atend.paciente,
          atendimentos: [],
        };
      }
      acc[pacienteId].atendimentos.push(atend);
      return acc;
    }, {} as Record<string, { paciente: { id: string; nome: string; nascimento: Date | null }; atendimentos: typeof atendimentos }>);

    const agrupados = Object.values(porPaciente);

    return NextResponse.json({
      success: true,
      data: {
        resumo: {
          totalSessoes,
          sessoesFinalizadas,
          pacientesUnicos,
          taxaConclusao: Math.round(taxaConclusao * 10) / 10,
          horasTotais: Math.round(horasTotais * 10) / 10,
        },
        distribuicao,
        atendimentos,
        agrupados,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar relatório:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao buscar relatório",
      },
      { status: 500 }
    );
  }
}
