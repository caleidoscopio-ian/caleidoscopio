/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/server";

// API para buscar estatísticas do dashboard
export async function GET(request: NextRequest) {
  try {
    console.log("📊 API Dashboard/Stats - Buscando estatísticas...");

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
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user.role);

    // Buscar estatísticas baseadas no perfil
    const stats: any = {};

    // 1. Total de Pacientes
    stats.totalPacientes = await prisma.paciente.count({
      where: { tenantId },
    });

    // 2. Sessões em Andamento
    stats.sessoesEmAndamento = await prisma.sessaoAtividade.count({
      where: {
        paciente: { tenantId },
        status: "EM_ANDAMENTO",
      },
    });

    // 3. Sessões Finalizadas no Mês Atual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    stats.sessoesRealizadasMes = await prisma.sessaoAtividade.count({
      where: {
        paciente: { tenantId },
        status: "FINALIZADA",
        finalizada_em: {
          gte: inicioMes,
        },
      },
    });

    // 4. Anamneses Pendentes (Rascunho)
    stats.anamnesesPendentes = await prisma.anamnese.count({
      where: {
        tenantId,
        status: "RASCUNHO",
      },
    });

    // 5. Total de Atividades Clínicas
    stats.atividadesCadastradas = await prisma.atividade.count({
      where: { tenantId },
    });

    // Se for Admin, buscar estatísticas adicionais
    if (isAdmin) {
      stats.totalTerapeutas = await prisma.profissional.count({
        where: { tenantId },
      });
    }

    // 6. Próximas Sessões (Agenda) - placeholder
    // TODO: Implementar quando tivermos agendamentos
    stats.sessõesHoje = 0;

    console.log(`✅ Estatísticas calculadas para tenant ${tenantId}`);

    return NextResponse.json({
      success: true,
      data: stats,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar estatísticas:", error);
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
