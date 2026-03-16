/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { StatusAgendamento } from "@/types/agendamento";

// GET - Buscar agendamento específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user || !user.tenant) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    // Buscar agendamento com verificação de tenant
    const agendamento = await prisma.agendamento.findFirst({
      where: {
        id,
        // 🔒 CRÍTICO: Verificar tenant através do paciente
        paciente: {
          tenantId: user.tenant.id,
        },
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            foto: true,
            cor_agenda: true,
            telefone: true,
            email: true,
          },
        },
        profissional: {
          select: {
            id: true,
            nome: true,
            especialidade: true,
            email: true,
            telefone: true,
          },
        },
      },
    });

    if (!agendamento) {
      return NextResponse.json(
        { error: "Agendamento não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    return NextResponse.json(agendamento);
  } catch (error) {
    console.error("Erro ao buscar agendamento:", error);
    return NextResponse.json(
      { error: "Erro ao buscar agendamento" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar agendamento
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user || !user.tenant) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    // Verificar permissão
    if (!await hasPermission(user, "edit_patients")) {
      return NextResponse.json(
        { error: "Sem permissão para editar agendamentos" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Verificar se agendamento existe e pertence à clínica
    const agendamentoExistente = await prisma.agendamento.findFirst({
      where: {
        id,
        // 🔒 CRÍTICO: Verificar tenant através do paciente
        paciente: {
          tenantId: user.tenant.id,
        },
      },
    });

    if (!agendamentoExistente) {
      return NextResponse.json(
        { error: "Agendamento não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Se está alterando horário ou profissional, verificar conflito
    if (body.data_hora || body.horario_fim || body.profissionalId) {
      const profissionalId =
        body.profissionalId || agendamentoExistente.profissionalId;
      const dataHora = body.data_hora
        ? new Date(body.data_hora)
        : agendamentoExistente.data_hora;
      const dataFim = body.horario_fim
        ? new Date(body.horario_fim)
        : new Date(agendamentoExistente.horario_fim);

      // Buscar agendamentos conflitantes do profissional
      const agendamentosProf = await prisma.agendamento.findMany({
        where: {
          id: { not: id },
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

      const conflitoProf = agendamentosProf.find((ag) => {
        const agInicio = new Date(ag.data_hora);
        const agFim = new Date(ag.horario_fim);
        return dataHora < agFim && dataFim > agInicio;
      });

      if (conflitoProf) {
        return NextResponse.json(
          {
            error:
              "Já existe um agendamento neste horário para este profissional",
          },
          { status: 409 }
        );
      }

      // Se está alterando sala, verificar conflito na sala
      const salaId = body.sala || agendamentoExistente.salaId;
      if (salaId) {
        const agendamentosSala = await prisma.agendamento.findMany({
          where: {
            id: { not: id },
            salaId,
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
      }
    }

    // Preparar dados para atualização
    const updateData: any = {};

    if (body.pacienteId) updateData.pacienteId = body.pacienteId;
    if (body.profissionalId) updateData.profissionalId = body.profissionalId;
    if (body.data_hora) updateData.data_hora = new Date(body.data_hora);
    if (body.horario_fim) updateData.horario_fim = new Date(body.horario_fim);

    // Calcular duração se ambos os horários foram fornecidos
    if (body.data_hora && body.horario_fim) {
      const inicio = new Date(body.data_hora);
      const fim = new Date(body.horario_fim);
      updateData.duracao_minutos = Math.round((fim.getTime() - inicio.getTime()) / 60000);
    }

    if (body.sala !== undefined) {
      updateData.salaId = body.sala;
      updateData.sala = body.sala; // Manter campo legado
    }
    if (body.procedimento !== undefined) updateData.procedimentoId = body.procedimento;
    if (body.status) updateData.status = body.status;
    if (body.observacoes !== undefined)
      updateData.observacoes = body.observacoes;

    // Atualizar agendamento
    const agendamento = await prisma.agendamento.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(agendamento);
  } catch (error) {
    console.error("Erro ao atualizar agendamento:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar agendamento" },
      { status: 500 }
    );
  }
}

// DELETE - Deletar agendamento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user || !user.tenant) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    // Verificar permissão
    if (!await hasPermission(user, "delete_patients")) {
      return NextResponse.json(
        { error: "Sem permissão para deletar agendamentos" },
        { status: 403 }
      );
    }

    // Verificar se agendamento existe e pertence à clínica
    const agendamento = await prisma.agendamento.findFirst({
      where: {
        id,
        // 🔒 CRÍTICO: Verificar tenant através do paciente
        paciente: {
          tenantId: user.tenant.id,
        },
      },
    });

    if (!agendamento) {
      return NextResponse.json(
        { error: "Agendamento não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Deletar agendamento
    await prisma.agendamento.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar agendamento:", error);
    return NextResponse.json(
      { error: "Erro ao deletar agendamento" },
      { status: 500 }
    );
  }
}
