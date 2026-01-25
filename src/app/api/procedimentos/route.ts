import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const userDataHeader = request.headers.get("X-User-Data");

    if (!userDataHeader) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    const userData = JSON.parse(atob(userDataHeader));

    if (!userData.tenantId) {
      return NextResponse.json(
        { error: "Tenant não identificado" },
        { status: 400 }
      );
    }

    // Buscar apenas procedimentos ativos
    const procedimentos = await prisma.procedimento.findMany({
      where: {
        tenantId: userData.tenantId,
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        codigo: true,
        descricao: true,
        valor: true,
        duracao_padrao: true,
        cor: true,
      },
      orderBy: {
        nome: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: procedimentos,
    });
  } catch (error) {
    console.error("Erro ao buscar procedimentos:", error);
    // Se a tabela não existe ou não há procedimentos, retornar array vazio
    return NextResponse.json({
      success: true,
      data: [],
    });
  }
}
