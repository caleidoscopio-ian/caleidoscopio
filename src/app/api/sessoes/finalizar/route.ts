import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";

// API para finalizar uma sessão
export async function POST(request: NextRequest) {
  try {
    console.log("📝 API Sessões/Finalizar - Finalizando sessão...");

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
    if (!hasPermission(user, 'edit_sessions')) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para finalizar sessões" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sessaoId, observacoes_gerais } = body;

    // Validações básicas
    if (!sessaoId) {
      return NextResponse.json(
        { error: "ID da sessão é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a sessão existe e está EM_ANDAMENTO
    const sessao = await prisma.sessaoAtividade.findUnique({
      where: { id: sessaoId },
      include: {
        paciente: {
          select: {
            tenantId: true,
            nome: true
          }
        },
        atividade: {
          include: {
            instrucoes: true
          }
        },
        profissional: {
          select: {
            usuarioId: true,
            nome: true
          }
        },
        avaliacoes: true
      }
    });

    if (!sessao) {
      return NextResponse.json(
        { error: "Sessão não encontrada" },
        { status: 404 }
      );
    }

    // Verificar se a sessão pertence à clínica do usuário
    if (sessao.paciente.tenantId !== user.tenant.id) {
      return NextResponse.json(
        { error: "Sessão não pertence a esta clínica" },
        { status: 403 }
      );
    }

    // Verificar se a sessão está em andamento
    if (sessao.status !== 'EM_ANDAMENTO') {
      return NextResponse.json(
        { error: "Esta sessão já foi finalizada ou cancelada" },
        { status: 400 }
      );
    }

    // Verificar se o usuário tem permissão para finalizar esta sessão
    // Admins podem finalizar qualquer sessão, terapeutas só as suas próprias
    const adminRoles = ['ADMIN', 'SUPER_ADMIN'];
    const isAdmin = adminRoles.includes(user.role);

    if (!isAdmin && sessao.profissional.usuarioId !== user.id) {
      return NextResponse.json(
        { error: "Você só pode finalizar sessões que você mesmo iniciou" },
        { status: 403 }
      );
    }

    // Verificar se todas as instruções foram avaliadas
    const totalInstrucoes = sessao.atividade.instrucoes.length;
    const totalAvaliacoes = sessao.avaliacoes.length;

    if (totalAvaliacoes < totalInstrucoes) {
      return NextResponse.json(
        {
          error: `Nem todas as instruções foram avaliadas. Avaliadas: ${totalAvaliacoes}/${totalInstrucoes}`,
          instrucoesAvaliadas: totalAvaliacoes,
          totalInstrucoes: totalInstrucoes,
          instrucoesPendentes: totalInstrucoes - totalAvaliacoes
        },
        { status: 400 }
      );
    }

    console.log(`📝 Finalizando sessão: Paciente "${sessao.paciente.nome}" | Atividade "${sessao.atividade.nome}"`);
    console.log(`   Total de instruções avaliadas: ${totalAvaliacoes}`);

    // Calcular estatísticas da sessão
    const somaNotas = sessao.avaliacoes.reduce((acc, av) => acc + av.nota, 0);
    const mediaNotas = somaNotas / totalAvaliacoes;
    const totalComAjuda = sessao.avaliacoes.filter(av => av.precisou_ajuda).length;
    const percentualComAjuda = (totalComAjuda / totalAvaliacoes) * 100;

    console.log(`   Média de notas: ${mediaNotas.toFixed(2)}`);
    console.log(`   Precisou de ajuda: ${totalComAjuda}/${totalAvaliacoes} (${percentualComAjuda.toFixed(1)}%)`);

    // Finalizar sessão
    const sessaoFinalizada = await prisma.sessaoAtividade.update({
      where: { id: sessaoId },
      data: {
        status: 'FINALIZADA',
        finalizada_em: new Date(),
        observacoes_gerais: observacoes_gerais || null,
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
          }
        },
        atividade: {
          select: {
            id: true,
            nome: true,
            tipo: true,
          }
        },
        profissional: {
          select: {
            id: true,
            nome: true,
          }
        },
        avaliacoes: {
          include: {
            instrucao: true
          },
          orderBy: {
            instrucao: {
              ordem: 'asc'
            }
          }
        }
      }
    });

    console.log(`✅ Sessão finalizada com sucesso`);

    return NextResponse.json({
      success: true,
      data: sessaoFinalizada,
      estatisticas: {
        totalInstrucoes,
        mediaNotas: parseFloat(mediaNotas.toFixed(2)),
        totalComAjuda,
        percentualComAjuda: parseFloat(percentualComAjuda.toFixed(1)),
        notaMaxima: Math.max(...sessao.avaliacoes.map(av => av.nota)),
        notaMinima: Math.min(...sessao.avaliacoes.map(av => av.nota)),
      },
      message: "Sessão finalizada com sucesso",
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao finalizar sessão:", error);
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
