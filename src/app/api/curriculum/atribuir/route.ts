import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { randomUUID } from "crypto";
import {
  clonarAtividadesFaltantes,
  clonarAtividadesParaPaciente,
} from "@/lib/clone-atividade";
import { registrarErroApi } from "@/lib/erro-prisma";

// API para atribuir curriculum a um paciente
export async function POST(request: NextRequest) {
  try {
    console.log("📝 API Curriculum/Atribuir - Atribuindo curriculum ao paciente...");

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
    if (!await hasPermission(user, 'create_activities')) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para atribuir curriculums" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { pacienteId, curriculumId } = body;

    // Validações básicas
    if (!pacienteId || !curriculumId) {
      return NextResponse.json(
        { error: "ID do paciente e ID do curriculum são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se o paciente existe e pertence à clínica
    const paciente = await prisma.paciente.findFirst({
      where: {
        id: pacienteId,
        tenantId: user.tenant.id,
        ativo: true,
      },
    });

    if (!paciente) {
      return NextResponse.json(
        { error: "Paciente não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Verificar se o curriculum existe e pertence à clínica
    const curriculum = await prisma.curriculum.findFirst({
      where: {
        id: curriculumId,
        tenantId: user.tenant.id,
        ativo: true,
      },
    });

    if (!curriculum) {
      return NextResponse.json(
        { error: "Curriculum não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // `@@unique([pacienteId, curriculumId])`: o par é único, ativo ou não.
    // Então "desassociar e atribuir de novo" não pode passar por `create` — ia
    // estourar P2002 e a clínica veria um erro de constraint sem sentido.
    const atribuicaoExistente = await prisma.pacienteCurriculum.findUnique({
      where: { pacienteId_curriculumId: { pacienteId, curriculumId } },
      select: { id: true, ativa: true },
    });

    if (atribuicaoExistente?.ativa) {
      return NextResponse.json(
        { error: "Este curriculum já está atribuído a este paciente" },
        { status: 409 }
      );
    }

    // Reatribuir = reativar o que existe, não recomeçar do zero. Os clones,
    // critérios, fases e histórico da atribuição anterior continuam lá — era
    // justamente por isso que desassociar é soft delete.
    if (atribuicaoExistente) {
      const reativada = await prisma.pacienteCurriculum.update({
        where: { id: atribuicaoExistente.id },
        data: { ativa: true, atribuida_por: user.id, atribuida_em: new Date() },
        include: {
          curriculum: {
            include: {
              atividades: { orderBy: { ordem: "asc" }, include: { atividade: true } },
            },
          },
          paciente: true,
        },
      });

      // O currículo pode ter mudado enquanto o plano estava fora; traz só o que
      // falta, sem tocar no que já existe
      const { criadas } = await clonarAtividadesFaltantes(atribuicaoExistente.id);

      return NextResponse.json({
        success: true,
        data: reativada,
        reativada: true,
        atividadesAdicionadas: criadas,
        message:
          criadas > 0
            ? `Plano reativado com o histórico anterior. ${criadas} atividade(s) nova(s) do currículo foram incluídas.`
            : "Plano reativado com o histórico anterior.",
      });
    }

    console.log(`📝 Atribuindo curriculum "${curriculum.nome}" ao paciente "${paciente.nome}"`);

    // Criar atribuição
    const atribuicaoId = randomUUID();
    const atribuicao = await prisma.pacienteCurriculum.create({
      data: {
        id: atribuicaoId,
        pacienteId,
        curriculumId,
        atribuida_por: user.id,
        ativa: true,
      },
      include: {
        curriculum: {
          include: {
            atividades: {
              orderBy: { ordem: 'asc' },
              include: {
                atividade: true,
              }
            }
          }
        },
        paciente: true,
      }
    });

    // Clonar atividades do curriculum para o paciente (cópias independentes)
    await clonarAtividadesParaPaciente(atribuicaoId, curriculumId);

    console.log(`✅ Curriculum atribuído e atividades clonadas com sucesso`);

    return NextResponse.json({
      success: true,
      data: atribuicao,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/curriculum/atribuir", acao: "POST" }, error);
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido", ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}

// API para listar curriculums atribuídos a um paciente
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API Curriculum/Atribuir - Listando curriculums do paciente...");

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
    if (!await hasPermission(user, 'view_activities')) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para visualizar curriculums" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const pacienteId = url.searchParams.get('pacienteId');

    if (!pacienteId) {
      return NextResponse.json(
        { error: "ID do paciente é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se o paciente existe e pertence à clínica
    const paciente = await prisma.paciente.findFirst({
      where: {
        id: pacienteId,
        tenantId: user.tenant.id,
        ativo: true,
      },
    });

    if (!paciente) {
      return NextResponse.json(
        { error: "Paciente não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    console.log(`🔍 Buscando curriculums atribuídos ao paciente "${paciente.nome}"`);

    // Buscar curriculums atribuídos
    const atribuicoes = await prisma.pacienteCurriculum.findMany({
      where: {
        pacienteId,
        ativa: true,
      },
      include: {
        curriculum: {
          include: {
            atividades: {
              orderBy: { ordem: 'asc' },
              include: {
                atividade: true,
              }
            }
          }
        }
      },
      orderBy: {
        atribuida_em: 'desc'
      }
    });

    console.log(`✅ Encontrados ${atribuicoes.length} curriculums atribuídos`);

    return NextResponse.json({
      success: true,
      data: atribuicoes,
      total: atribuicoes.length,
      paciente: {
        id: paciente.id,
        nome: paciente.nome
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/curriculum/atribuir", acao: "GET" }, error);
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido", ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}

// API para remover atribuição de curriculum (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ API Curriculum/Atribuir - Removendo atribuição...");

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
    if (!await hasPermission(user, 'edit_activities')) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para remover atribuições" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "ID da atribuição é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a atribuição existe
    const atribuicao = await prisma.pacienteCurriculum.findUnique({
      where: { id },
      include: {
        paciente: true,
        curriculum: true,
      }
    });

    if (!atribuicao) {
      return NextResponse.json(
        { error: "Atribuição não encontrada" },
        { status: 404 }
      );
    }

    // Paciente de outra clínica responde 404, não 403: um 403 confirmaria que o
    // id existe em outro tenant (regra de `multi-tenant.md`)
    if (atribuicao.paciente.tenantId !== user.tenant.id) {
      return NextResponse.json(
        { error: "Atribuição não encontrada" },
        { status: 404 }
      );
    }

    console.log(`🗑️ Removendo atribuição do curriculum "${atribuicao.curriculum.nome}" do paciente "${atribuicao.paciente.nome}"`);

    // Soft delete - apenas marcar como inativa
    await prisma.pacienteCurriculum.update({
      where: { id },
      data: { ativa: false },
    });

    console.log(`✅ Atribuição removida com sucesso`);

    return NextResponse.json({
      success: true,
      message: "Atribuição removida com sucesso",
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/curriculum/atribuir", acao: "DELETE" }, error);
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido", ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
