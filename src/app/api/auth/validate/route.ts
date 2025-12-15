/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { managerClient } from "@/lib/manager-client";

export async function GET(request: NextRequest) {
  try {
    // Obter token do header ou cookie
    const token =
      request.headers.get("x-caleidoscopio-token") ||
      request.cookies.get("caleidoscopio_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Token não fornecido" },
        { status: 401 }
      );
    }

    // Por enquanto, vamos fazer uma validação simples do token
    // Em uma implementação completa, você validaria via Sistema 1
    if (!token.startsWith("cal_")) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    // Extrair informações básicas do token
    const tokenParts = token.split("_");
    if (tokenParts.length < 4) {
      return NextResponse.json({ error: "Token malformado" }, { status: 401 });
    }

    const userId = tokenParts[1];
    const tenantId = tokenParts[2];

    // Aqui você poderia fazer uma consulta ao Sistema 1 para validar
    // Por enquanto, retornamos sucesso com dados básicos
    return NextResponse.json({
      valid: true,
      userId,
      tenantId,
    });
  } catch (error) {
    console.error("Erro na validação:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
