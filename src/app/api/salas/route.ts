import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/server";

// API para buscar salas da clínica do usuário logado
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API Salas - Iniciando busca com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error("❌ API Salas GET - Falha na autenticação");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      console.error("❌ API Salas - Usuário sem tenant associado");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica",
        },
        { status: 403 }
      );
    }

    console.log(
      `🔍 Buscando salas para clínica: ${user.tenant.name} (${user.tenant.id})`
    );

    // Buscar salas da clínica
    const salas = await prisma.sala.findMany({
      where: {
        tenantId: user.tenant.id,
      },
      orderBy: {
        nome: "asc",
      },
    });

    console.log(
      `✅ Encontradas ${salas.length} salas para clínica "${user.tenant.name}"`
    );

    return NextResponse.json({
      success: true,
      data: salas,
      total: salas.length,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar salas:", error);

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

// API para criar nova sala
export async function POST(request: NextRequest) {
  try {
    console.log("📝 API Salas - Criando nova sala com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error("❌ API Salas POST - Falha na autenticação");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      console.error("❌ API Salas - Usuário sem tenant associado");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica",
        },
        { status: 403 }
      );
    }

    // Verificar permissão (admin)
    if (user.role.toLowerCase() !== "admin") {
      console.error(`❌ API Salas - Permissão negada para role: ${user.role}`);
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para criar salas. Apenas administradores.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nome, descricao, capacidade, recursos, cor } = body;

    // Validações básicas
    if (!nome) {
      return NextResponse.json(
        { success: false, error: "Nome é obrigatório" },
        { status: 400 }
      );
    }

    console.log(`📝 Criando sala "${nome}" na clínica "${user.tenant.name}"`);

    // Criar nova sala
    const novaSala = await prisma.sala.create({
      data: {
        tenantId: user.tenant.id,
        nome,
        descricao: descricao || null,
        capacidade: capacidade ? parseInt(capacidade) : null,
        recursos: recursos || [],
        cor: cor || null,
        ativo: true,
      },
    });

    console.log(`✅ Sala criada com sucesso: ${novaSala.id}`);

    return NextResponse.json({
      success: true,
      data: novaSala,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao criar sala:", error);

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

// API para atualizar sala
export async function PUT(request: NextRequest) {
  try {
    console.log("✏️ API Salas - Atualizando sala com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error("❌ API Salas PUT - Falha na autenticação");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      console.error("❌ API Salas - Usuário sem tenant associado");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica",
        },
        { status: 403 }
      );
    }

    // Verificar permissão (admin)
    if (user.role.toLowerCase() !== "admin") {
      console.error(`❌ API Salas - Permissão negada para role: ${user.role}`);
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para editar salas. Apenas administradores.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, nome, descricao, capacidade, recursos, cor, ativo } = body;

    // Validações básicas
    if (!id || !nome) {
      return NextResponse.json(
        { success: false, error: "ID e nome são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se a sala existe e pertence à clínica do usuário
    const salaExistente = await prisma.sala.findFirst({
      where: {
        id,
        tenantId: user.tenant.id,
      },
    });

    if (!salaExistente) {
      return NextResponse.json(
        {
          success: false,
          error: "Sala não encontrada ou não pertence a esta clínica",
        },
        { status: 404 }
      );
    }

    console.log(`✏️ Atualizando sala "${id}" na clínica "${user.tenant.name}"`);

    // Atualizar sala
    const salaAtualizada = await prisma.sala.update({
      where: { id },
      data: {
        nome,
        descricao: descricao || null,
        capacidade: capacidade ? parseInt(capacidade) : null,
        recursos: recursos || [],
        cor: cor || null,
        ativo: ativo !== undefined ? ativo : true,
      },
    });

    console.log(`✅ Sala atualizada com sucesso`);

    return NextResponse.json({
      success: true,
      data: salaAtualizada,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar sala:", error);

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

// API para deletar sala
export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ API Salas - Deletando sala com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error("❌ API Salas DELETE - Falha na autenticação");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      console.error("❌ API Salas - Usuário sem tenant associado");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica",
        },
        { status: 403 }
      );
    }

    // Verificar permissão (admin)
    if (user.role.toLowerCase() !== "admin") {
      console.error(`❌ API Salas - Permissão negada para role: ${user.role}`);
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para deletar salas. Apenas administradores.",
        },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID da sala é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a sala existe e pertence à clínica do usuário
    const salaExistente = await prisma.sala.findFirst({
      where: {
        id,
        tenantId: user.tenant.id,
      },
    });

    if (!salaExistente) {
      return NextResponse.json(
        {
          success: false,
          error: "Sala não encontrada ou não pertence a esta clínica",
        },
        { status: 404 }
      );
    }

    console.log(`🗑️ Deletando sala "${id}" na clínica "${user.tenant.name}"`);

    // Deletar sala
    await prisma.sala.delete({
      where: { id },
    });

    console.log(`✅ Sala deletada com sucesso`);

    return NextResponse.json({
      success: true,
      message: "Sala removida com sucesso",
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao deletar sala:", error);

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
