import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/server";

// GET - Buscar atividades e instruções disponíveis para seleção na sessão
// ?pacienteId=X&curriculumId=Y
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (!user.tenant?.id) {
      return NextResponse.json({ error: "Sem tenant" }, { status: 403 });
    }

    const url = new URL(request.url);
    const pacienteId = url.searchParams.get("pacienteId");
    const curriculumId = url.searchParams.get("curriculumId");

    if (!pacienteId || !curriculumId) {
      return NextResponse.json(
        { error: "pacienteId e curriculumId são obrigatórios" },
        { status: 400 }
      );
    }

    const pacienteCurriculum = await prisma.pacienteCurriculum.findFirst({
      where: { pacienteId, curriculumId, ativa: true },
      include: {
        atividadesClone: {
          where: { ativo: true },
          orderBy: { ordem: "asc" },
          select: {
            id: true,
            nome: true,
            ordem: true,
            faseAtual: true,
            qtd_tentativas_alvo: true,
            instrucoes: {
              where: { ativo: true },
              orderBy: { ordem: "asc" },
              select: {
                id: true,
                ordem: true,
                texto: true,
                faseAtual: true,
                qtd_tentativas_alvo: true,
              },
            },
          },
        },
      },
    });

    if (!pacienteCurriculum) {
      return NextResponse.json(
        { error: "Curriculum não atribuído a este paciente" },
        { status: 404 }
      );
    }

    // Buscar a data da última aplicação de cada instrução
    const instrucaoIds = pacienteCurriculum.atividadesClone.flatMap((a) =>
      a.instrucoes.map((i) => i.id)
    );

    const ultimasAplicacoes =
      instrucaoIds.length > 0
        ? await prisma.avaliacaoInstrucaoCurriculum.groupBy({
            by: ["instrucaoId"],
            where: { instrucaoId: { in: instrucaoIds } },
            _max: { createdAt: true },
          })
        : [];

    const mapaUltimaAplicacao = new Map(
      ultimasAplicacoes.map((u) => [u.instrucaoId, u._max.createdAt])
    );

    const atividadesClone = pacienteCurriculum.atividadesClone.map((a) => ({
      ...a,
      instrucoes: a.instrucoes.map((i) => ({
        ...i,
        ultimaAplicacao: mapaUltimaAplicacao.get(i.id) ?? null,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: {
        pacienteCurriculumId: pacienteCurriculum.id,
        atividadesClone,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar instruções disponíveis:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
