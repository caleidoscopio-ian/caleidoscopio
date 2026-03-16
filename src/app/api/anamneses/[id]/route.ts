import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";

// GET - Buscar anamnese específica por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log(`🔍 API Anamnese - Buscando anamnese ${id}...`);

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      return NextResponse.json(
        { success: false, error: "Usuário não está associado a uma clínica" },
        { status: 403 }
      );
    }

    // Buscar anamnese e verificar se pertence à clínica do usuário
    const anamnese = await prisma.anamnese.findFirst({
      where: {
        id,
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar tenant
      },
      include: {
        paciente: true
      }
    });

    if (!anamnese) {
      return NextResponse.json(
        { error: "Anamnese não encontrada ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    console.log(`✅ Anamnese encontrada: ${id}`);

    return NextResponse.json({
      success: true,
      data: {
        id: anamnese.id,
        paciente: anamnese.paciente,
        profissionalId: anamnese.profissionalId,
        historiaDesenvolvimento: anamnese.historiaDesenvolvimento,
        comportamentosExcessivos: anamnese.comportamentosExcessivos,
        comportamentosDeficitarios: anamnese.comportamentosDeficitarios,
        comportamentosProblema: anamnese.comportamentosProblema,
        rotinaDiaria: anamnese.rotinaDiaria,
        ambienteFamiliar: anamnese.ambienteFamiliar,
        ambienteEscolar: anamnese.ambienteEscolar,
        preferencias: anamnese.preferencias,
        documentosAnexos: anamnese.documentosAnexos,
        habilidadesCriticas: anamnese.habilidadesCriticas,
        observacoesGerais: anamnese.observacoesGerais,
        status: anamnese.status,
        finalizadaEm: anamnese.finalizadaEm?.toISOString(),
        createdAt: anamnese.createdAt.toISOString(),
        updatedAt: anamnese.updatedAt.toISOString(),
      }
    });
  } catch (error) {
    console.error("❌ Erro ao buscar anamnese:", error);

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

// PUT - Atualizar anamnese
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log(`✏️ API Anamnese - Atualizando anamnese ${id}...`);

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      return NextResponse.json(
        { success: false, error: "Usuário não está associado a uma clínica" },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!await hasPermission(user, 'edit_anamneses')) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para editar anamneses" },
        { status: 403 }
      );
    }

    // Verificar se a anamnese existe e pertence à clínica do usuário
    const existingAnamnese = await prisma.anamnese.findFirst({
      where: {
        id,
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar tenant
      },
    });

    if (!existingAnamnese) {
      return NextResponse.json(
        { error: "Anamnese não encontrada ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    const body = await request.json();

    console.log(`✏️ Atualizando anamnese ${id} na clínica "${user.tenant.name}"`);

    // Atualizar anamnese
    const updatedAnamnese = await prisma.anamnese.update({
      where: { id },
      data: {
        historiaDesenvolvimento: body.historiaDesenvolvimento,
        comportamentosExcessivos: body.comportamentosExcessivos,
        comportamentosDeficitarios: body.comportamentosDeficitarios,
        comportamentosProblema: body.comportamentosProblema,
        rotinaDiaria: body.rotinaDiaria,
        ambienteFamiliar: body.ambienteFamiliar,
        ambienteEscolar: body.ambienteEscolar,
        preferencias: body.preferencias,
        documentosAnexos: body.documentosAnexos,
        habilidadesCriticas: body.habilidadesCriticas,
        observacoesGerais: body.observacoesGerais,
        status: body.status,
        finalizadaEm: body.status === 'FINALIZADA' && !existingAnamnese.finalizadaEm
          ? new Date()
          : existingAnamnese.finalizadaEm,
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
          }
        }
      }
    });

    console.log(`✅ Anamnese ${id} atualizada com sucesso`);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedAnamnese.id,
        status: updatedAnamnese.status,
        updatedAt: updatedAnamnese.updatedAt.toISOString(),
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar anamnese:", error);

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

// DELETE - Deletar anamnese (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log(`🗑️ API Anamnese - Deletando anamnese ${id}...`);

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      return NextResponse.json(
        { success: false, error: "Usuário não está associado a uma clínica" },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!await hasPermission(user, 'delete_anamneses')) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para deletar anamneses" },
        { status: 403 }
      );
    }

    // Verificar se a anamnese existe e pertence à clínica do usuário
    const existingAnamnese = await prisma.anamnese.findFirst({
      where: {
        id,
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar tenant
      },
    });

    if (!existingAnamnese) {
      return NextResponse.json(
        { error: "Anamnese não encontrada ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    console.log(`🗑️ Deletando anamnese ${id} na clínica "${user.tenant.name}"`);

    // Hard delete (pode mudar para soft delete se preferir)
    await prisma.anamnese.delete({
      where: { id },
    });

    console.log(`✅ Anamnese ${id} deletada com sucesso`);

    return NextResponse.json({
      success: true,
      message: "Anamnese removida com sucesso",
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao deletar anamnese:", error);

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
