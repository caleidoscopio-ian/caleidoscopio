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
    if (!hasPermission(user, "edit_patients")) {
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
    if (body.data_hora || body.profissionalId || body.duracao_minutos) {
      const profissionalId =
        body.profissionalId || agendamentoExistente.profissionalId;
      const dataHora = body.data_hora
        ? new Date(body.data_hora)
        : agendamentoExistente.data_hora;
      const duracao =
        body.duracao_minutos || agendamentoExistente.duracao_minutos;
      const dataFim = new Date(dataHora.getTime() + duracao * 60000);

      const conflito = await prisma.agendamento.findFirst({
        where: {
          id: { not: id },
          profissionalId,
          status: {
            notIn: [StatusAgendamento.CANCELADO, StatusAgendamento.FALTOU],
          },
          AND: [
            {
              data_hora: {
                lt: dataFim,
              },
            },
            {
              data_hora: {
                gte: dataHora,
              },
            },
          ],
        },
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
    }

    // Preparar dados para atualização
    const updateData: any = {};

    if (body.pacienteId) updateData.pacienteId = body.pacienteId;
    if (body.profissionalId) updateData.profissionalId = body.profissionalId;
    if (body.data_hora) updateData.data_hora = new Date(body.data_hora);
    if (body.duracao_minutos) updateData.duracao_minutos = body.duracao_minutos;
    if (body.sala !== undefined) updateData.sala = body.sala;
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
    if (!hasPermission(user, "delete_patients")) {
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
