import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { randomUUID } from "crypto";

// API para avaliar uma instrução durante a sessão
export async function POST(request: NextRequest) {
  try {
    console.log("📝 API Sessões/Avaliar - Avaliando instrução...");

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
        { success: false, error: "Sem permissão para avaliar sessões" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sessaoId, instrucaoId, nota, tipos_ajuda, observacao } = body;

    // Validações básicas
    if (!sessaoId || !instrucaoId || nota === undefined) {
      return NextResponse.json(
        { error: "sessaoId, instrucaoId e nota são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar nota (0 a 4)
    if (nota < 0 || nota > 4 || !Number.isInteger(nota)) {
      return NextResponse.json(
        { error: "A nota deve ser um número inteiro entre 0 e 4" },
        { status: 400 }
      );
    }

    // Validar tipos_ajuda (se fornecido, deve ser array)
    if (tipos_ajuda && !Array.isArray(tipos_ajuda)) {
      return NextResponse.json(
        { error: "tipos_ajuda deve ser um array" },
        { status: 400 }
      );
    }

    // Validar valores permitidos para tipos_ajuda
    const tiposPermitidos = ["-", "AFT", "AFP", "AI", "AG", "AVE", "AVG", "+"];
    if (tipos_ajuda && tipos_ajuda.some((tipo: string) => !tiposPermitidos.includes(tipo))) {
      return NextResponse.json(
        { error: "Tipo de ajuda inválido. Valores permitidos: -, AFT, AFP, AI, AG, AVE, AVG, +" },
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
          select: {
            nome: true
          }
        },
        profissional: {
          select: {
            usuarioId: true,
            nome: true
          }
        }
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
        { error: "Não é possível avaliar uma sessão que não está em andamento" },
        { status: 400 }
      );
    }

    // Verificar se o usuário tem permissão para avaliar esta sessão
    // Admins podem avaliar qualquer sessão, terapeutas só as suas próprias
    const adminRoles = ['ADMIN', 'SUPER_ADMIN'];
    const isAdmin = adminRoles.includes(user.role);

    if (!isAdmin && sessao.profissional.usuarioId !== user.id) {
      return NextResponse.json(
        { error: "Você só pode avaliar sessões que você mesmo iniciou" },
        { status: 403 }
      );
    }

    // Verificar se a instrução existe e pertence à atividade da sessão
    const instrucao = await prisma.atividadeInstrucao.findFirst({
      where: {
        id: instrucaoId,
        atividadeId: sessao.atividadeId,
      },
    });

    if (!instrucao) {
      return NextResponse.json(
        { error: "Instrução não encontrada ou não pertence a esta atividade" },
        { status: 404 }
      );
    }

    console.log(`📝 Avaliando instrução ${instrucao.ordem} (Nota: ${nota}, Ajudas: ${tipos_ajuda?.join(', ') || 'Nenhuma'})`);

    // Verificar se já existe avaliação para esta instrução
    const avaliacaoExistente = await prisma.avaliacaoInstrucao.findUnique({
      where: {
        sessaoId_instrucaoId: {
          sessaoId,
          instrucaoId
        }
      }
    });

    let avaliacao;

    if (avaliacaoExistente) {
      // Atualizar avaliação existente
      console.log(`📝 Atualizando avaliação existente`);
      avaliacao = await prisma.avaliacaoInstrucao.update({
        where: { id: avaliacaoExistente.id },
        data: {
          nota,
          tipos_ajuda: tipos_ajuda || [],
          observacao: observacao || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          instrucao: true
        }
      });
    } else {
      // Criar nova avaliação
      console.log(`📝 Criando nova avaliação`);
      avaliacao = await prisma.avaliacaoInstrucao.create({
        data: {
          id: randomUUID(),
          sessaoId,
          instrucaoId,
          nota,
          tipos_ajuda: tipos_ajuda || [],
          observacao: observacao || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        include: {
          instrucao: true
        }
      });
    }

    console.log(`✅ Instrução avaliada com sucesso`);

    return NextResponse.json({
      success: true,
      data: avaliacao,
      message: `Instrução ${instrucao.ordem} avaliada`,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao avaliar instrução:", error);
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
