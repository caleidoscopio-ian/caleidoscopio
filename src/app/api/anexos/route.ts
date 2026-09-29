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

    const anexos = await prisma.anexoPaciente.findMany({
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
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: anexos,
    });
  } catch (error: any) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/anexos", acao: "GET" }, error);
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? (error.message || "Erro ao buscar anexos"), details: classificacao.detalhe, ref },
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
      categoria,
      titulo,
      descricao,
      arquivo_url,
      arquivo_nome,
      arquivo_tipo,
      arquivo_size,
      data_documento,
    } = body;

    // Validações básicas
    if (
      !pacienteId ||
      !tipo ||
      !titulo ||
      !arquivo_url ||
      !arquivo_nome ||
      !arquivo_tipo
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Paciente, tipo, título e informações do arquivo são obrigatórios",
        },
        { status: 400 }
      );
    }

    const anexo = await prisma.anexoPaciente.create({
      data: {
        pacienteId,
        profissionalId: user.id,
        tenantId: user.tenant.id,
        tipo,
        categoria: categoria || null,
        titulo,
        descricao: descricao || null,
        arquivo_url,
        arquivo_nome,
        arquivo_tipo,
        arquivo_size: arquivo_size || 0,
        data_documento: data_documento ? new Date(data_documento) : null,
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
      data: anexo,
    });
  } catch (error: any) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/anexos", acao: "POST" }, error);
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? (error.message || "Erro ao criar anexo"), details: classificacao.detalhe, ref },
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

    const { id, tipo, categoria, titulo, descricao, data_documento } = body;

    // Validações básicas
    if (!id || !tipo || !titulo) {
      return NextResponse.json(
        {
          success: false,
          error: "ID, tipo e título são obrigatórios",
        },
        { status: 400 }
      );
    }

    // Verificar se o anexo pertence ao tenant
    const anexoExistente = await prisma.anexoPaciente.findFirst({
      where: {
        id,
        tenantId: user.tenant.id,
      },
    });

    if (!anexoExistente) {
      return NextResponse.json(
        {
          success: false,
          error: "Anexo não encontrado",
        },
        { status: 404 }
      );
    }

    const anexo = await prisma.anexoPaciente.update({
      where: { id },
      data: {
        tipo,
        categoria: categoria || null,
        titulo,
        descricao: descricao || null,
        data_documento: data_documento ? new Date(data_documento) : null,
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
      data: anexo,
    });
  } catch (error: any) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/anexos", acao: "PUT" }, error);
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? (error.message || "Erro ao atualizar anexo"), details: classificacao.detalhe, ref },
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
          error: "ID do anexo é obrigatório",
        },
        { status: 400 }
      );
    }

    // Verificar se o anexo pertence ao tenant
    const anexo = await prisma.anexoPaciente.findFirst({
      where: {
        id,
        tenantId: user.tenant.id,
      },
    });

    if (!anexo) {
      return NextResponse.json(
        {
          success: false,
          error: "Anexo não encontrado",
        },
        { status: 404 }
      );
    }

    await prisma.anexoPaciente.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Anexo excluído com sucesso",
    });
  } catch (error: any) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/anexos", acao: "DELETE" }, error);
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? (error.message || "Erro ao excluir anexo"), details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
