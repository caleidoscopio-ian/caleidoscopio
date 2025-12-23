/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";

// API para buscar encaminhamentos
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API Encaminhamentos - Buscando encaminhamentos...");

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

    if (!hasPermission(user, "view_patients")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para visualizar encaminhamentos" },
        { status: 403 }
      );
    }

    console.log(
      `🔍 Buscando encaminhamentos para clínica: ${user.tenant.name} (${user.tenant.id})`
    );

    // Buscar encaminhamentos da clínica
    const encaminhamentos = await prisma.encaminhamento.findMany({
      where: {
        tenantId: user.tenant.id,
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            nascimento: true,
            cpf: true,
          },
        },
      },
      orderBy: {
        data_encaminhamento: "desc",
      },
    });

    console.log(`✅ Encontrados ${encaminhamentos.length} encaminhamentos`);

    return NextResponse.json({
      success: true,
      data: encaminhamentos,
      total: encaminhamentos.length,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar encaminhamentos:", error);

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

// API para criar encaminhamento
export async function POST(request: NextRequest) {
  try {
    console.log("📝 API Encaminhamentos - Criando encaminhamento...");

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

    if (!hasPermission(user, "create_patients")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para criar encaminhamentos" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      pacienteId,
      tipo,
      especialidade,
      profissional_dest,
      instituicao_dest,
      motivo,
      observacoes,
    } = body;

    // Validações
    if (!pacienteId || !tipo || !especialidade || !motivo) {
      return NextResponse.json(
        { error: "Campos obrigatórios: pacienteId, tipo, especialidade, motivo" },
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

    console.log(`📝 Criando encaminhamento para paciente: ${paciente.nome}`);

    // Criar encaminhamento
    const encaminhamento = await prisma.encaminhamento.create({
      data: {
        pacienteId,
        profissionalId: user.id,
        tenantId: user.tenant.id,
        tipo,
        especialidade,
        profissional_dest,
        instituicao_dest,
        motivo,
        observacoes,
        status: "PENDENTE",
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            nascimento: true,
          },
        },
      },
    });

    console.log(`✅ Encaminhamento criado com ID: ${encaminhamento.id}`);

    return NextResponse.json({
      success: true,
      data: encaminhamento,
    });
  } catch (error) {
    console.error("❌ Erro ao criar encaminhamento:", error);

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

// API para atualizar encaminhamento
export async function PUT(request: NextRequest) {
  try {
    console.log("✏️ API Encaminhamentos - Atualizando encaminhamento...");

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

    if (!hasPermission(user, "create_patients")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para editar encaminhamentos" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id,
      tipo,
      especialidade,
      profissional_dest,
      instituicao_dest,
      motivo,
      observacoes,
      status,
    } = body;

    // Validações
    if (!id || !tipo || !especialidade || !motivo) {
      return NextResponse.json(
        { error: "Campos obrigatórios: id, tipo, especialidade, motivo" },
        { status: 400 }
      );
    }

    // Verificar se o encaminhamento existe e pertence à clínica
    const encaminhamentoExistente = await prisma.encaminhamento.findFirst({
      where: {
        id,
        tenantId: user.tenant.id,
      },
    });

    if (!encaminhamentoExistente) {
      return NextResponse.json(
        { success: false, error: "Encaminhamento não encontrado" },
        { status: 404 }
      );
    }

    console.log(`✏️ Atualizando encaminhamento ID: ${id}`);

    // Atualizar encaminhamento
    const encaminhamento = await prisma.encaminhamento.update({
      where: { id },
      data: {
        tipo,
        especialidade,
        profissional_dest,
        instituicao_dest,
        motivo,
        observacoes,
        status: status || encaminhamentoExistente.status,
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            nascimento: true,
          },
        },
      },
    });

    console.log(`✅ Encaminhamento atualizado com sucesso`);

    return NextResponse.json({
      success: true,
      data: encaminhamento,
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar encaminhamento:", error);

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

// API para excluir encaminhamento
export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ API Encaminhamentos - Excluindo encaminhamento...");

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

    if (!hasPermission(user, "create_patients")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para excluir encaminhamentos" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do encaminhamento é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se o encaminhamento existe e pertence à clínica
    const encaminhamento = await prisma.encaminhamento.findFirst({
      where: {
        id,
        tenantId: user.tenant.id,
      },
    });

    if (!encaminhamento) {
      return NextResponse.json(
        { success: false, error: "Encaminhamento não encontrado" },
        { status: 404 }
      );
    }

    console.log(`🗑️ Excluindo encaminhamento ID: ${id}`);

    await prisma.encaminhamento.delete({
      where: { id },
    });

    console.log(`✅ Encaminhamento excluído com sucesso`);

    return NextResponse.json({
      success: true,
      message: "Encaminhamento excluído com sucesso",
    });
  } catch (error) {
    console.error("❌ Erro ao excluir encaminhamento:", error);

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
