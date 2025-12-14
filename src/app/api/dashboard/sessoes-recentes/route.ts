import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/server";

// API para buscar sessões recentes para o dashboard
export async function GET(request: NextRequest) {
  try {
    console.log("📊 API Dashboard/Sessões-Recentes - Buscando sessões...");

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

    // Buscar sessões pendentes (EM_ANDAMENTO)
    const sessoesPendentes = await prisma.sessaoAtividade.findMany({
      where: {
        paciente: { tenantId },
        status: 'EM_ANDAMENTO'
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true
          }
        },
        atividade: {
          select: {
            nome: true,
            tipo: true
          }
        }
      },
      orderBy: {
        iniciada_em: 'desc'
      },
      take: 5
    });

    // Buscar últimas sessões finalizadas
    const sessoesRecentes = await prisma.sessaoAtividade.findMany({
      where: {
        paciente: { tenantId },
        status: 'FINALIZADA'
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true
          }
        },
        atividade: {
          select: {
            nome: true,
            tipo: true
          }
        },
        avaliacoes: {
          select: {
            nota: true,
            tipos_ajuda: true
          }
        }
      },
      orderBy: {
        finalizada_em: 'desc'
      },
      take: 5
    });

    console.log(`✅ Encontradas ${sessoesPendentes.length} sessões pendentes e ${sessoesRecentes.length} sessões recentes`);

    return NextResponse.json({
      success: true,
      data: {
        pendentes: sessoesPendentes,
        recentes: sessoesRecentes
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao buscar sessões recentes:", error);
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
