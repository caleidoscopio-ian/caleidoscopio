/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { managerClient } from "@/lib/manager-client";
import { LoginCredentials } from "@/types/auth";
import { ensureDefaultRole } from "@/lib/auth/bootstrap-roles";
import { registrarErroApi } from "@/lib/erro-prisma";

export async function POST(request: NextRequest) {
  try {
    const body: LoginCredentials = await request.json();
    const { email, password, tenantSlug } = body;

    // Validar dados de entrada
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    // Fazer login via Sistema 1 (Manager) usando SSO
    const ssoResult = await managerClient.ssoLogin({ email, password });

    if (!ssoResult?.user) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    const { user, tenant, token } = ssoResult;

    // Verificar se usuário tem acesso ao Caleidoscópio
    if (!tenant) {
      return NextResponse.json(
        { error: "Usuário não está associado a uma clínica" },
        { status: 403 }
      );
    }

    // Bootstrap RBAC: garantir role local mapeada à SSO role
    // Blocking — precisa completar antes de retornar para que usePermissions funcione
    try {
      await ensureDefaultRole(user.id, tenant.id, user.role, { name: user.name, email: user.email })
    } catch (err) {
      registrarErroApi({ rota: "/api/auth/login", acao: "POST" }, err);// Não bloqueia o login — o usuário pode acessar via SSO-fallback
    }

    // Criar resposta de sucesso
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: tenant.id,
        tenant: tenant,
        productToken: token,
      },
    });

    // Definir cookie do token
    response.cookies.set({
      name: "caleidoscopio_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 dias
      path: "/",
    });

    return response;
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/auth/login", acao: "POST" }, error);
    return NextResponse.json(
      { error: classificacao.mensagem ?? "Erro interno do servidor", details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
