import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { managerClient } from "@/lib/manager-client";
import { prisma } from "@/lib/prisma";

// POST - Criar usuário no Sistema 1 e profissional vinculado no Sistema 2
export async function POST(request: NextRequest) {
  try {
    console.log("👤 API Criar Usuário+Profissional - Iniciando criação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error("❌ API Criar Usuário - Falha na autenticação");
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

    // Verificar permissão RBAC para criar usuários
    const canCreate = await hasPermission(user, "create_usuarios");
    if (!canCreate) {
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para criar usuários",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      // Dados do usuário (Sistema 1)
      email,
      name,
      password,
      role,
      // Dados do profissional (Sistema 2)
      cpf,
      telefone,
      especialidade,
      registro_profissional,
      salas_acesso,
    } = body;

    // Validações
    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Email, nome e senha são obrigatórios" },
        { status: 400 }
      );
    }

    if (!especialidade) {
      return NextResponse.json(
        { error: "Especialidade é obrigatória" },
        { status: 400 }
      );
    }

    console.log(`📝 Criando usuário ${email} no Sistema 1...`);

    // PASSO 1: Criar usuário no Sistema 1
    const usuarioSistema1 = await managerClient.createUser(
      {
        email,
        name,
        password,
        role: role || "USER", // Role padrão é USER (terapeuta)
        tenantId: user.tenant.id,
      },
      user.token
    );

    if (!usuarioSistema1 || !usuarioSistema1.user) {
      throw new Error("Erro ao criar usuário no Sistema 1");
    }

    console.log(`✅ Usuário criado no Sistema 1: ${usuarioSistema1.user.id}`);
    console.log(`📝 Criando profissional vinculado no Sistema 2...`);

    // PASSO 2: Criar profissional no Sistema 2 vinculado ao usuário
    // Nota: tenantId é apenas uma referência ao tenant do Sistema 1 (não FK)
    const profissional = await prisma.profissional.create({
      data: {
        tenantId: user.tenant.id,
        usuarioId: usuarioSistema1.user.id, // 🔗 VÍNCULO CRÍTICO
        nome: name,
        cpf: cpf || null,
        telefone: telefone || null,
        email: email,
        especialidade,
        registro_profissional: registro_profissional || null,
        salas_acesso: salas_acesso || [],
        ativo: true,
      },
    });

    console.log(`✅ Profissional criado no Sistema 2: ${profissional.id}`);
    console.log(
      `🔗 Vínculo estabelecido: Usuario ${usuarioSistema1.user.id} <-> Profissional ${profissional.id}`
    );

    return NextResponse.json(
      {
        success: true,
        usuario: usuarioSistema1.user,
        profissional: {
          id: profissional.id,
          nome: profissional.nome,
          email: profissional.email,
          especialidade: profissional.especialidade,
          usuarioId: profissional.usuarioId,
        },
        message: "Usuário e profissional criados com sucesso",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar usuário+profissional:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao criar usuário e profissional" },
      { status: 500 }
    );
  }
}
