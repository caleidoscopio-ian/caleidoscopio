/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import { registrarErroApi } from "@/lib/erro-prisma";

export async function POST(request: NextRequest) {
  try {
    // Criar resposta de logout
    const response = NextResponse.json({ success: true });

    // Remover cookie do token
    response.cookies.set({
      name: "caleidoscopio_token",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Expirar imediatamente
      path: "/",
    });

    return response;
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/auth/logout", acao: "POST" }, error);
    return NextResponse.json(
      { error: classificacao.mensagem ?? "Erro interno do servidor", details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
