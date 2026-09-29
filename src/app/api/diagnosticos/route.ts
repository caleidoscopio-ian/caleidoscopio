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

    const diagnosticos = await prisma.diagnostico.findMany({
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
        data_diagnostico: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: diagnosticos,
    });
  } catch (error: any) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/diagnosticos", acao: "GET" }, error);
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? (error.message || "Erro ao buscar diagnósticos"), details: classificacao.detalhe, ref },
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
      cid10,
      descricao_cid,
      diagnostico_desc,
      hipotese,
      observacoes,
      anexos,
    } = body;

    // Validações básicas
    if (!pacienteId || !diagnostico_desc) {
      return NextResponse.json(
        {
          success: false,
          error: "Paciente e descrição do diagnóstico são obrigatórios",
        },
        { status: 400 }
      );
    }

    const diagnostico = await prisma.diagnostico.create({
      data: {
        pacienteId,
        profissionalId: user.id,
        tenantId: user.tenant.id,
        cid10: cid10 || null,
        descricao_cid: descricao_cid || null,
        diagnostico_desc,
        hipotese: hipotese || false,
        observacoes: observacoes || null,
        anexos: anexos || [],
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
      data: diagnostico,
    });
  } catch (error: any) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/diagnosticos", acao: "POST" }, error);
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? (error.message || "Erro ao criar diagnóstico"), details: classificacao.detalhe, ref },
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
      cid10,
      descricao_cid,
      diagnostico_desc,
      hipotese,
      observacoes,
      anexos,
    } = body;

    // Validações básicas
    if (!id || !diagnostico_desc) {
      return NextResponse.json(
        {
          success: false,
          error: "ID e descrição do diagnóstico são obrigatórios",
        },
        { status: 400 }
      );
    }

    // Verificar se o diagnóstico pertence ao tenant
    const diagnosticoExistente = await prisma.diagnostico.findFirst({
      where: {
        id,
        tenantId: user.tenant.id,
      },
    });

    if (!diagnosticoExistente) {
      return NextResponse.json(
        {
          success: false,
          error: "Diagnóstico não encontrado",
        },
        { status: 404 }
      );
    }

    const diagnostico = await prisma.diagnostico.update({
      where: { id },
      data: {
        cid10: cid10 || null,
        descricao_cid: descricao_cid || null,
        diagnostico_desc,
        hipotese: hipotese || false,
        observacoes: observacoes || null,
        anexos: anexos || [],
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
      data: diagnostico,
    });
  } catch (error: any) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/diagnosticos", acao: "PUT" }, error);
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? (error.message || "Erro ao atualizar diagnóstico"), details: classificacao.detalhe, ref },
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
          error: "ID do diagnóstico é obrigatório",
        },
        { status: 400 }
      );
    }

    // Verificar se o diagnóstico pertence ao tenant
    const diagnostico = await prisma.diagnostico.findFirst({
      where: {
        id,
        tenantId: user.tenant.id,
      },
    });

    if (!diagnostico) {
      return NextResponse.json(
        {
          success: false,
          error: "Diagnóstico não encontrado",
        },
        { status: 404 }
      );
    }

    await prisma.diagnostico.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Diagnóstico excluído com sucesso",
    });
  } catch (error: any) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/diagnosticos", acao: "DELETE" }, error);
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? (error.message || "Erro ao excluir diagnóstico"), details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
