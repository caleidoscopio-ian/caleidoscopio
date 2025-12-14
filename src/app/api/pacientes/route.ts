/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";

// API para buscar pacientes da clínica do usuário logado
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API Pacientes - Iniciando busca com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error("❌ API Pacientes - Falha na autenticação");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
          details:
            "Token inválido ou Sistema 1 não está respondendo. Verifique se o Sistema 1 está rodando em localhost:3000",
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      console.error("❌ API Pacientes - Usuário sem tenant associado");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica",
        },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!hasPermission(user, "view_patients")) {
      console.error(
        `❌ API Pacientes - Permissão negada para role: ${user.role}`
      );
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para visualizar pacientes",
        },
        { status: 403 }
      );
    }

    console.log(
      `🔍 Buscando pacientes para clínica: ${user.tenant.name} (${user.tenant.id})`
    );

    // Construir where clause baseado na role do usuário
    const where: any = {
      tenantId: user.tenant.id, // 🔒 CRÍTICO: Filtrar por tenant
      ativo: true,
    };

    // Se o usuário é USER (terapeuta), filtrar apenas seus pacientes
    const adminRoles = ["ADMIN", "SUPER_ADMIN"];
    if (!adminRoles.includes(user.role)) {
      // Buscar o profissional vinculado ao usuário
      const profissionalDoUsuario = await prisma.profissional.findFirst({
        where: {
          usuarioId: user.id,
          tenantId: user.tenant.id,
          ativo: true,
        },
      });

      if (profissionalDoUsuario) {
        where.profissionalId = profissionalDoUsuario.id;
      } else {
        // Se não encontrou profissional vinculado, retornar vazio
        console.log(
          `⚠️ Usuário ${user.email} (role: ${user.role}) não tem profissional vinculado`
        );
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          tenant: {
            id: user.tenant.id,
            name: user.tenant.name,
          },
        });
      }
    }

    // Buscar pacientes APENAS da clínica do usuário (isolamento multi-tenant)
    const pacientes = await prisma.paciente.findMany({
      where,
      select: {
        id: true,
        nome: true,
        cpf: true,
        nascimento: true,
        email: true,
        telefone: true,
        endereco: true,
        responsavel_financeiro: true,
        contato_emergencia: true,
        plano_saude: true,
        matricula: true,
        cor_agenda: true,
        profissionalId: true,
        profissional: {
          select: {
            id: true,
            nome: true,
            especialidade: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        nome: "asc",
      },
    });

    console.log(
      `✅ Encontrados ${pacientes.length} pacientes para clínica "${user.tenant.name}"`
    );

    // Converter campos para formato esperado pelo frontend
    const pacientesFormatados = pacientes.map((paciente) => ({
      id: paciente.id,
      name: paciente.nome,
      cpf: paciente.cpf || "",
      birthDate: paciente.nascimento.toISOString(),
      email: paciente.email,
      phone: paciente.telefone,
      address: paciente.endereco,
      guardianName: paciente.responsavel_financeiro,
      guardianPhone: paciente.contato_emergencia,
      healthInsurance: paciente.plano_saude,
      healthInsuranceNumber: paciente.matricula,
      profissionalId: paciente.profissionalId,
      profissional: paciente.profissional
        ? {
            id: paciente.profissional.id,
            nome: paciente.profissional.nome,
            especialidade: paciente.profissional.especialidade,
          }
        : null,
      createdAt: paciente.createdAt.toISOString(),
      updatedAt: paciente.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: pacientesFormatados,
      total: pacientesFormatados.length,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar pacientes:", error);

    if (error instanceof Error) {
      if (error.message === "Usuário não autenticado") {
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

// API para criar novo paciente
export async function POST(request: NextRequest) {
  try {
    console.log("📝 API Pacientes - Criando novo paciente com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error("❌ API Pacientes POST - Falha na autenticação");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
          details: "Token inválido ou Sistema 1 não está respondendo",
        },
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
    if (!hasPermission(user, "create_patients")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para criar pacientes" },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log("📥 API Pacientes POST - Body recebido:", body);

    const {
      name,
      cpf,
      birthDate,
      email,
      phone,
      address,
      guardianName,
      guardianPhone,
      healthInsurance,
      healthInsuranceNumber,
      profissionalId,
    } = body;

    console.log("🔑 profissionalId extraído do body:", profissionalId);

    // Validações básicas
    if (!name || !birthDate) {
      return NextResponse.json(
        { error: "Nome e data de nascimento são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se já existe paciente com este CPF na mesma clínica
    if (cpf) {
      const existingPatient = await prisma.paciente.findFirst({
        where: {
          tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar apenas na clínica do usuário
          cpf: cpf,
          ativo: true,
        },
      });

      if (existingPatient) {
        return NextResponse.json(
          {
            error:
              "Já existe um paciente com este CPF cadastrado nesta clínica",
          },
          { status: 409 }
        );
      }
    }

    console.log(
      `📝 Criando paciente "${name}" para clínica "${user.tenant.name}"`
    );
    console.log(`🔗 Vinculando ao profissional: ${profissionalId || "NENHUM"}`);

    // Criar novo paciente associado à clínica do usuário
    const newPatient = await prisma.paciente.create({
      data: {
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Associar ao tenant do usuário
        nome: name,
        cpf: cpf,
        nascimento: new Date(birthDate),
        email: email,
        telefone: phone,
        endereco: address,
        responsavel_financeiro: guardianName,
        contato_emergencia: guardianPhone,
        plano_saude: healthInsurance === "particular" ? null : healthInsurance,
        matricula: healthInsuranceNumber,
        profissionalId: profissionalId || null,
        ativo: true,
      },
    });

    console.log(
      `✅ Paciente criado com ID: ${newPatient.id}, profissionalId: ${newPatient.profissionalId}`
    );

    console.log(
      `✅ Paciente "${name}" criado com sucesso para clínica "${user.tenant.name}"`
    );

    // Converter para formato do frontend
    const patientFormatted = {
      id: newPatient.id,
      name: newPatient.nome,
      cpf: newPatient.cpf || "",
      birthDate: newPatient.nascimento.toISOString(),
      email: newPatient.email,
      phone: newPatient.telefone,
      address: newPatient.endereco,
      guardianName: newPatient.responsavel_financeiro,
      guardianPhone: newPatient.contato_emergencia,
      healthInsurance: newPatient.plano_saude,
      healthInsuranceNumber: newPatient.matricula,
      createdAt: newPatient.createdAt.toISOString(),
      updatedAt: newPatient.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: patientFormatted,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao criar paciente:", error);

    if (error instanceof Error) {
      if (error.message === "Usuário não autenticado") {
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

// API para atualizar paciente
export async function PUT(request: NextRequest) {
  try {
    console.log("✏️ API Pacientes - Atualizando paciente com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error("❌ API Pacientes PUT - Falha na autenticação");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
          details: "Token inválido ou Sistema 1 não está respondendo",
        },
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
    if (!hasPermission(user, "edit_patients")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para editar pacientes" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id,
      name,
      cpf,
      birthDate,
      email,
      phone,
      address,
      guardianName,
      guardianPhone,
      healthInsurance,
      healthInsuranceNumber,
      profissionalId,
    } = body;

    // Validações básicas
    if (!id || !name || !birthDate) {
      return NextResponse.json(
        { error: "ID, nome e data de nascimento são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se o paciente existe e pertence à clínica do usuário
    const existingPatient = await prisma.paciente.findFirst({
      where: {
        id: id,
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar tenant
        ativo: true,
      },
    });

    if (!existingPatient) {
      return NextResponse.json(
        { error: "Paciente não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Verificar se CPF já existe em outro paciente da mesma clínica
    if (cpf && cpf !== existingPatient.cpf) {
      const duplicateCpf = await prisma.paciente.findFirst({
        where: {
          tenantId: user.tenant.id,
          cpf: cpf,
          ativo: true,
          id: { not: id },
        },
      });

      if (duplicateCpf) {
        return NextResponse.json(
          { error: "Já existe outro paciente com este CPF nesta clínica" },
          { status: 409 }
        );
      }
    }

    console.log(
      `✏️ Atualizando paciente "${name}" na clínica "${user.tenant.name}"`
    );

    // Atualizar paciente
    const updatedPatient = await prisma.paciente.update({
      where: { id: id },
      data: {
        nome: name,
        cpf: cpf,
        nascimento: new Date(birthDate),
        email: email,
        telefone: phone,
        endereco: address,
        responsavel_financeiro: guardianName,
        contato_emergencia: guardianPhone,
        plano_saude: healthInsurance === "particular" ? null : healthInsurance,
        matricula: healthInsuranceNumber,
        profissionalId: profissionalId || null,
      },
    });

    console.log(`✅ Paciente "${name}" atualizado com sucesso`);

    // Converter para formato do frontend
    const patientFormatted = {
      id: updatedPatient.id,
      name: updatedPatient.nome,
      cpf: updatedPatient.cpf || "",
      birthDate: updatedPatient.nascimento.toISOString(),
      email: updatedPatient.email,
      phone: updatedPatient.telefone,
      address: updatedPatient.endereco,
      guardianName: updatedPatient.responsavel_financeiro,
      guardianPhone: updatedPatient.contato_emergencia,
      healthInsurance: updatedPatient.plano_saude,
      healthInsuranceNumber: updatedPatient.matricula,
      createdAt: updatedPatient.createdAt.toISOString(),
      updatedAt: updatedPatient.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: patientFormatted,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar paciente:", error);

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

// API para deletar paciente (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ API Pacientes - Deletando paciente com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error("❌ API Pacientes DELETE - Falha na autenticação");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
          details: "Token inválido ou Sistema 1 não está respondendo",
        },
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
    if (!hasPermission(user, "delete_patients")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para deletar pacientes" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID do paciente é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se o paciente existe e pertence à clínica do usuário
    const existingPatient = await prisma.paciente.findFirst({
      where: {
        id: id,
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar tenant
        ativo: true,
      },
    });

    if (!existingPatient) {
      return NextResponse.json(
        { error: "Paciente não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    console.log(
      `🗑️ Desativando paciente "${existingPatient.nome}" na clínica "${user.tenant.name}"`
    );

    // Soft delete - apenas marcar como inativo
    await prisma.paciente.update({
      where: { id: id },
      data: { ativo: false },
    });

    console.log(`✅ Paciente "${existingPatient.nome}" desativado com sucesso`);

    return NextResponse.json({
      success: true,
      message: "Paciente removido com sucesso",
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao deletar paciente:", error);

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
