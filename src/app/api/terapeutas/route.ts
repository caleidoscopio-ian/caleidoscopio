import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";

// API para buscar terapeutas/profissionais da clínica do usuário logado
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API Terapeutas - Iniciando busca com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error('❌ API Terapeutas GET - Falha na autenticação');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
          details: "Token inválido ou Sistema 1 não está respondendo. Verifique se o Sistema 1 está rodando em localhost:3000"
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      console.error('❌ API Terapeutas - Usuário sem tenant associado');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica"
        },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!hasPermission(user, 'view_professionals')) {
      console.error(`❌ API Terapeutas - Permissão negada para role: ${user.role}`);
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para visualizar terapeutas"
        },
        { status: 403 }
      );
    }

    console.log(`🔍 Buscando terapeutas para clínica: ${user.tenant.name} (${user.tenant.id})`);

    // Buscar profissionais APENAS da clínica do usuário (isolamento multi-tenant)
    const profissionais = await prisma.profissional.findMany({
      where: {
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Filtrar por tenant
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        cpf: true,
        telefone: true,
        email: true,
        especialidade: true,
        registro_profissional: true,
        salas_acesso: true,
        usuarioId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        nome: "asc",
      },
    });

    console.log(`✅ Encontrados ${profissionais.length} terapeutas para clínica "${user.tenant.name}"`);

    // Converter campos para formato esperado pelo frontend
    const terapeutasFormatados = profissionais.map(profissional => ({
      id: profissional.id,
      name: profissional.nome,
      cpf: profissional.cpf || "",
      phone: profissional.telefone,
      email: profissional.email,
      specialty: profissional.especialidade,
      professionalRegistration: profissional.registro_profissional,
      roomAccess: profissional.salas_acesso,
      usuarioId: profissional.usuarioId,
      createdAt: profissional.createdAt.toISOString(),
      updatedAt: profissional.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: terapeutasFormatados,
      total: terapeutasFormatados.length,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao buscar terapeutas:", error);

    if (error instanceof Error) {
      if (error.message === 'Usuário não autenticado') {
        return NextResponse.json(
          { success: false, error: "Sessão expirada. Faça login novamente." },
          { status: 401 }
        );
      }
    }

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

// API para criar novo terapeuta/profissional
export async function POST(request: NextRequest) {
  try {
    console.log("📝 API Terapeutas - Criando novo terapeuta com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error('❌ API Terapeutas POST - Falha na autenticação');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
          details: "Token inválido ou Sistema 1 não está respondendo. Verifique se o Sistema 1 está rodando em localhost:3000"
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      console.error('❌ API Terapeutas - Usuário sem tenant associado');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica"
        },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!hasPermission(user, 'create_professionals')) {
      console.error(`❌ API Terapeutas - Permissão negada para role: ${user.role}`);
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para criar terapeutas"
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      cpf,
      phone,
      email,
      specialty,
      professionalRegistration,
      roomAccess,
    } = body;

    // Validações básicas
    if (!name || !specialty) {
      return NextResponse.json(
        { error: "Nome e especialidade são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se já existe profissional com este CPF na mesma clínica
    if (cpf) {
      const existingProfessional = await prisma.profissional.findFirst({
        where: {
          tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar apenas na clínica do usuário
          cpf: cpf,
          ativo: true,
        },
      });

      if (existingProfessional) {
        return NextResponse.json(
          { error: "Já existe um terapeuta com este CPF cadastrado nesta clínica" },
          { status: 409 }
        );
      }
    }

    // Verificar se já existe profissional com este email na mesma clínica
    if (email) {
      const existingEmail = await prisma.profissional.findFirst({
        where: {
          tenantId: user.tenant.id,
          email: email,
          ativo: true,
        },
      });

      if (existingEmail) {
        return NextResponse.json(
          { error: "Já existe um terapeuta com este email cadastrado nesta clínica" },
          { status: 409 }
        );
      }
    }

    console.log(`📝 Criando terapeuta "${name}" para clínica "${user.tenant.name}"`);

    // Criar novo profissional associado à clínica do usuário
    const newProfessional = await prisma.profissional.create({
      data: {
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Associar ao tenant do usuário
        nome: name,
        cpf: cpf,
        telefone: phone,
        email: email,
        especialidade: specialty,
        registro_profissional: professionalRegistration,
        salas_acesso: roomAccess || [],
        ativo: true,
      },
    });

    console.log(`✅ Terapeuta "${name}" criado com sucesso para clínica "${user.tenant.name}"`);

    // Converter para formato do frontend
    const professionalFormatted = {
      id: newProfessional.id,
      name: newProfessional.nome,
      cpf: newProfessional.cpf || "",
      phone: newProfessional.telefone,
      email: newProfessional.email,
      specialty: newProfessional.especialidade,
      professionalRegistration: newProfessional.registro_profissional,
      roomAccess: newProfessional.salas_acesso,
      createdAt: newProfessional.createdAt.toISOString(),
      updatedAt: newProfessional.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: professionalFormatted,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao criar terapeuta:", error);

    if (error instanceof Error) {
      if (error.message === 'Usuário não autenticado') {
        return NextResponse.json(
          { success: false, error: "Sessão expirada. Faça login novamente." },
          { status: 401 }
        );
      }
    }

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

// API para atualizar terapeuta/profissional
export async function PUT(request: NextRequest) {
  try {
    console.log("✏️ API Terapeutas - Atualizando terapeuta com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error('❌ API Terapeutas PUT - Falha na autenticação');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
          details: "Token inválido ou Sistema 1 não está respondendo. Verifique se o Sistema 1 está rodando em localhost:3000"
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      console.error('❌ API Terapeutas - Usuário sem tenant associado');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica"
        },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!hasPermission(user, 'edit_professionals')) {
      console.error(`❌ API Terapeutas - Permissão negada para role: ${user.role}`);
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para editar terapeutas"
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id,
      name,
      cpf,
      phone,
      email,
      specialty,
      professionalRegistration,
      roomAccess,
    } = body;

    // Validações básicas
    if (!id || !name || !specialty) {
      return NextResponse.json(
        { error: "ID, nome e especialidade são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se o profissional existe e pertence à clínica do usuário
    const existingProfessional = await prisma.profissional.findFirst({
      where: {
        id: id,
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar tenant
        ativo: true,
      },
    });

    if (!existingProfessional) {
      return NextResponse.json(
        { error: "Terapeuta não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Verificar se CPF já existe em outro profissional da mesma clínica
    if (cpf && cpf !== existingProfessional.cpf) {
      const duplicateCpf = await prisma.profissional.findFirst({
        where: {
          tenantId: user.tenant.id,
          cpf: cpf,
          ativo: true,
          id: { not: id },
        },
      });

      if (duplicateCpf) {
        return NextResponse.json(
          { error: "Já existe outro terapeuta com este CPF nesta clínica" },
          { status: 409 }
        );
      }
    }

    // Verificar se email já existe em outro profissional da mesma clínica
    if (email && email !== existingProfessional.email) {
      const duplicateEmail = await prisma.profissional.findFirst({
        where: {
          tenantId: user.tenant.id,
          email: email,
          ativo: true,
          id: { not: id },
        },
      });

      if (duplicateEmail) {
        return NextResponse.json(
          { error: "Já existe outro terapeuta com este email nesta clínica" },
          { status: 409 }
        );
      }
    }

    console.log(`✏️ Atualizando terapeuta "${name}" na clínica "${user.tenant.name}"`);

    // Atualizar profissional
    const updatedProfessional = await prisma.profissional.update({
      where: { id: id },
      data: {
        nome: name,
        cpf: cpf,
        telefone: phone,
        email: email,
        especialidade: specialty,
        registro_profissional: professionalRegistration,
        salas_acesso: roomAccess || [],
      },
    });

    console.log(`✅ Terapeuta "${name}" atualizado com sucesso`);

    // Converter para formato do frontend
    const professionalFormatted = {
      id: updatedProfessional.id,
      name: updatedProfessional.nome,
      cpf: updatedProfessional.cpf || "",
      phone: updatedProfessional.telefone,
      email: updatedProfessional.email,
      specialty: updatedProfessional.especialidade,
      professionalRegistration: updatedProfessional.registro_profissional,
      roomAccess: updatedProfessional.salas_acesso,
      createdAt: updatedProfessional.createdAt.toISOString(),
      updatedAt: updatedProfessional.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: professionalFormatted,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar terapeuta:", error);

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

// API para deletar terapeuta/profissional (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ API Terapeutas - Deletando terapeuta com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error('❌ API Terapeutas DELETE - Falha na autenticação');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
          details: "Token inválido ou Sistema 1 não está respondendo. Verifique se o Sistema 1 está rodando em localhost:3000"
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      console.error('❌ API Terapeutas - Usuário sem tenant associado');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica"
        },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!hasPermission(user, 'delete_professionals')) {
      console.error(`❌ API Terapeutas - Permissão negada para role: ${user.role}`);
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para deletar terapeutas"
        },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "ID do terapeuta é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se o profissional existe e pertence à clínica do usuário
    const existingProfessional = await prisma.profissional.findFirst({
      where: {
        id: id,
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar tenant
        ativo: true,
      },
    });

    if (!existingProfessional) {
      return NextResponse.json(
        { error: "Terapeuta não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    console.log(`🗑️ Desativando terapeuta "${existingProfessional.nome}" na clínica "${user.tenant.name}"`);

    // Soft delete - apenas marcar como inativo
    await prisma.profissional.update({
      where: { id: id },
      data: { ativo: false },
    });

    console.log(`✅ Terapeuta "${existingProfessional.nome}" desativado com sucesso`);

    return NextResponse.json({
      success: true,
      message: "Terapeuta removido com sucesso",
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao deletar terapeuta:", error);

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