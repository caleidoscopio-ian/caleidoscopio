/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { managerClient } from "@/lib/manager-client";
import { LoginCredentials } from "@/types/auth";

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
    console.error("Erro no login do Caleidoscópio:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
