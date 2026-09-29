import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { registrarErroApi } from "@/lib/erro-prisma";

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

    // Buscar sessões de curriculum pendentes (EM_ANDAMENTO)
    const sessoesPendentes = await prisma.sessaoCurriculum.findMany({
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
        curriculum: {
          select: {
            nome: true
          }
        }
      },
      orderBy: {
        iniciada_em: 'desc'
      },
      take: 5
    });

    // Buscar últimas sessões de curriculum finalizadas
    const sessoesRecentes = await prisma.sessaoCurriculum.findMany({
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
        curriculum: {
          select: {
            nome: true
          }
        },
        avaliacoes: {
          select: {
            nota: true
          }
        }
      },
      orderBy: {
        finalizada_em: 'desc'
      },
      take: 5
    });

    console.log(`✅ Encontradas ${sessoesPendentes.length} sessões de curriculum pendentes e ${sessoesRecentes.length} sessões recentes`);

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
    const { ref, classificacao } = registrarErroApi({ rota: "/api/dashboard/sessoes-recentes", acao: "GET" }, error);
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido", ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
