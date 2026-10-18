import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { registrarErroApi } from "@/lib/erro-prisma";

// GET - Listar atividades clonadas de um paciente com dados de fase
export async function GET(request: NextRequest) {
  try {
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

    if (!await hasPermission(user, "view_activities")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const pacienteId = url.searchParams.get("pacienteId");
    const pacienteCurriculumId = url.searchParams.get("pacienteCurriculumId");

    if (!pacienteId) {
      return NextResponse.json(
        { error: "ID do paciente é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar paciente pertence à clínica
    const paciente = await prisma.paciente.findFirst({
      where: { id: pacienteId, tenantId: user.tenant.id, ativo: true },
    });

    if (!paciente) {
      return NextResponse.json(
        { error: "Paciente não encontrado" },
        { status: 404 }
      );
    }

    // Buscar curriculums atribuídos ao paciente com clones
    const whereClause: { pacienteId: string; ativa: boolean; id?: string } = {
      pacienteId,
      ativa: true,
    };

    if (pacienteCurriculumId) {
      whereClause.id = pacienteCurriculumId;
    }

    const atribuicoes = await prisma.pacienteCurriculum.findMany({
      where: whereClause,
      include: {
        curriculum: {
          select: {
            id: true,
            nome: true,
            // As atividades do currículo entram para a tela poder comparar com
            // o que o plano tem: o plano é um snapshot da atribuição, então
            // atividade adicionada depois não está nele.
            atividades: {
              orderBy: { ordem: "asc" },
              select: { ordem: true, atividade: { select: { id: true, nome: true } } },
            },
          },
        },
        atividadesClone: {
          where: { ativo: true },
          orderBy: { ordem: "asc" },
          include: {
            instrucoes: {
              where: { ativo: true },
              orderBy: { ordem: "asc" },
              include: {
                fases: true, // InstrucaoFase — critérios por instrução
                historico: {
                  orderBy: { alterado_em: "desc" },
                  take: 5,
                },
                pontuacoes: { orderBy: { ordem: "asc" } },
              },
            },
            pontuacoes: { orderBy: { ordem: "asc" } },
            fases: true,
            historico: {
              orderBy: { alterado_em: "desc" },
              take: 5,
            },
          },
        },
      },
      orderBy: { atribuida_em: "desc" },
    });

    // Diferença entre o currículo e o plano, por atribuição.
    //
    // Consulta à parte de propósito: `atividadesClone` acima é filtrado por
    // `ativo: true` (a tela não mostra desativado), e usar essa lista aqui
    // marcaria como "faltando" um clone que alguém desativou. O botão de
    // sincronizar — que é aditivo e ignora clone existente, ativo ou não — não
    // resolveria o aviso, e a tela ficaria pedindo uma ação impossível.
    // tenant-ok: os ids vêm de pacienteCurriculum do paciente já validado acima
    const clonesTodos = await prisma.pacienteAtividadeClone.findMany({
      where: { pacienteCurriculumId: { in: atribuicoes.map((a) => a.id) } },
      select: { pacienteCurriculumId: true, atividadeOriginalId: true },
    });
    const clonadasPorPlano = new Map<string, Set<string>>();
    for (const c of clonesTodos) {
      // `atividadeOriginalId` é nulo quando a atividade de origem foi apagada;
      // esse clone não corresponde a nenhuma atividade do currículo
      if (!c.atividadeOriginalId) continue;
      const conjunto = clonadasPorPlano.get(c.pacienteCurriculumId) ?? new Set<string>();
      conjunto.add(c.atividadeOriginalId);
      clonadasPorPlano.set(c.pacienteCurriculumId, conjunto);
    }

    const data = atribuicoes.map((atribuicao) => {
      const jaClonadas = clonadasPorPlano.get(atribuicao.id) ?? new Set<string>();
      return {
        ...atribuicao,
        faltando: atribuicao.curriculum.atividades
          .filter((a) => !jaClonadas.has(a.atividade.id))
          .map((a) => ({ id: a.atividade.id, nome: a.atividade.nome })),
      };
    });

    return NextResponse.json({
      success: true,
      data,
      paciente: { id: paciente.id, nome: paciente.nome },
    });
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/evolucao", acao: "GET" }, error);
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido", ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
