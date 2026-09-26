/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inicioDoDia, fimDoDia } from "@/lib/datas-fuso";
import { getAuthenticatedUser, isAdminUser } from "@/lib/auth/server";

// API para buscar agendamentos do dia atual
export async function GET(request: NextRequest) {
  try {
    console.log(
      "📅 API Dashboard/Agenda-Hoje - Buscando agendamentos do dia..."
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

    const tenantId = user.tenant.id;
    const isAdmin = isAdminUser(user);

    // Dia atual no fuso da clínica — não no fuso do servidor, que em
    // produção é UTC e viraria o dia às 21:00 no horário de Brasília
    const inicioHoje = inicioDoDia();
    const fimHoje = fimDoDia();

    // Buscar agendamentos do dia
    const agendamentosHoje = await prisma.agendamento.findMany({
      where: {
        data_hora: {
          gte: inicioHoje,
          lte: fimHoje,
        },
        // Se não for admin, filtrar apenas agendamentos do profissional logado
        ...(isAdmin ? {} : { profissional: { usuarioId: user.id } }),
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
          },
        },
        profissional: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: {
        data_hora: "asc",
      },
    });

    console.log(
      `✅ ${agendamentosHoje.length} agendamentos encontrados para hoje`
    );

    return NextResponse.json({
      success: true,
      data: agendamentosHoje,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar agendamentos do dia:", error);
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
