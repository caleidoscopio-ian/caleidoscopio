/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { registrarErroApi } from "@/lib/erro-prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica",
        },
        { status: 403 }
      );
    }

    const relatorios = await prisma.relatorioClinico.findMany({
      where: {
        tenantId: user.tenant.id, // 🔒 Multi-tenant isolation
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
      orderBy: {
        data_relatorio: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: relatorios,
    });
  } catch (error: any) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/relatorios", acao: "GET" }, error);
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? (error.message || "Erro ao buscar relatórios"), details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      pacienteId,
      tipo,
      titulo,
      periodo_inicio,
      periodo_fim,
      conteudo,
      finalidade,
      destinatario,
    } = body;

    // Validações básicas
    if (!pacienteId || !tipo || !titulo || !conteudo) {
      return NextResponse.json(
        {
          success: false,
          error: "Paciente, tipo, título e conteúdo são obrigatórios",
        },
        { status: 400 }
      );
    }

    const relatorio = await prisma.relatorioClinico.create({
      data: {
        pacienteId,
        profissionalId: user.id,
        tenantId: user.tenant.id,
        tipo,
        titulo,
        periodo_inicio: periodo_inicio ? new Date(periodo_inicio) : null,
        periodo_fim: periodo_fim ? new Date(periodo_fim) : null,
        conteudo,
        finalidade: finalidade || null,
        destinatario: destinatario || null,
        assinado: false,
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: relatorio,
    });
  } catch (error: any) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/relatorios", acao: "POST" }, error);
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? (error.message || "Erro ao criar relatório"), details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      id,
      tipo,
      titulo,
      periodo_inicio,
      periodo_fim,
      conteudo,
      finalidade,
      destinatario,
    } = body;

    // Validações básicas
    if (!id || !tipo || !titulo || !conteudo) {
      return NextResponse.json(
        {
          success: false,
          error: "ID, tipo, título e conteúdo são obrigatórios",
        },
        { status: 400 }
      );
    }

    // Verificar se o relatório pertence ao tenant
    const relatorioExistente = await prisma.relatorioClinico.findFirst({
      where: {
        id,
        tenantId: user.tenant.id,
      },
    });

    if (!relatorioExistente) {
      return NextResponse.json(
        {
          success: false,
          error: "Relatório não encontrado",
        },
        { status: 404 }
      );
    }

    const relatorio = await prisma.relatorioClinico.update({
      where: { id },
      data: {
        tipo,
        titulo,
        periodo_inicio: periodo_inicio ? new Date(periodo_inicio) : null,
        periodo_fim: periodo_fim ? new Date(periodo_fim) : null,
        conteudo,
        finalidade: finalidade || null,
        destinatario: destinatario || null,
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: relatorio,
    });
  } catch (error: any) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/relatorios", acao: "PUT" }, error);
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? (error.message || "Erro ao atualizar relatório"), details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID do relatório é obrigatório",
        },
        { status: 400 }
      );
    }

    // Verificar se o relatório pertence ao tenant
    const relatorio = await prisma.relatorioClinico.findFirst({
      where: {
        id,
        tenantId: user.tenant.id,
      },
    });

    if (!relatorio) {
      return NextResponse.json(
        {
          success: false,
          error: "Relatório não encontrado",
        },
        { status: 404 }
      );
    }

    await prisma.relatorioClinico.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Relatório excluído com sucesso",
    });
  } catch (error: any) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/relatorios", acao: "DELETE" }, error);
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? (error.message || "Erro ao excluir relatório"), details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
