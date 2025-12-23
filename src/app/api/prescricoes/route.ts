import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

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

    const prescricoes = await prisma.prescricaoMedica.findMany({
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
        data_prescricao: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: prescricoes,
    });
  } catch (error: any) {
    console.error("Erro ao buscar prescrições:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao buscar prescrições",
      },
      { status: 500 }
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
      medicamento,
      dosagem,
      frequencia,
      via_admin,
      duracao,
      indicacao,
      observacoes,
      data_inicio,
      data_fim,
    } = body;

    // Validações básicas
    if (!pacienteId || !medicamento || !dosagem || !frequencia) {
      return NextResponse.json(
        {
          success: false,
          error: "Paciente, medicamento, dosagem e frequência são obrigatórios",
        },
        { status: 400 }
      );
    }

    const prescricao = await prisma.prescricaoMedica.create({
      data: {
        pacienteId,
        profissionalId: user.id,
        tenantId: user.tenant.id,
        medicamento,
        dosagem,
        frequencia,
        via_admin: via_admin || null,
        duracao: duracao || null,
        indicacao: indicacao || null,
        observacoes: observacoes || null,
        data_inicio: data_inicio ? new Date(data_inicio) : null,
        data_fim: data_fim ? new Date(data_fim) : null,
        ativo: true,
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
      data: prescricao,
    });
  } catch (error: any) {
    console.error("Erro ao criar prescrição:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao criar prescrição",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
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

    const body = await request.json();
    const {
      id,
      medicamento,
      dosagem,
      frequencia,
      via_admin,
      duracao,
      indicacao,
      observacoes,
      data_inicio,
      data_fim,
      ativo,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID da prescrição é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a prescrição pertence ao tenant do usuário
    const prescricaoExistente = await prisma.prescricaoMedica.findFirst({
      where: { id, tenantId: user.tenant.id },
    });

    if (!prescricaoExistente) {
      return NextResponse.json(
        { success: false, error: "Prescrição não encontrada" },
        { status: 404 }
      );
    }

    const prescricao = await prisma.prescricaoMedica.update({
      where: { id },
      data: {
        medicamento: medicamento || prescricaoExistente.medicamento,
        dosagem: dosagem || prescricaoExistente.dosagem,
        frequencia: frequencia || prescricaoExistente.frequencia,
        via_admin: via_admin !== undefined ? via_admin : prescricaoExistente.via_admin,
        duracao: duracao !== undefined ? duracao : prescricaoExistente.duracao,
        indicacao: indicacao !== undefined ? indicacao : prescricaoExistente.indicacao,
        observacoes: observacoes !== undefined ? observacoes : prescricaoExistente.observacoes,
        data_inicio: data_inicio !== undefined ? (data_inicio ? new Date(data_inicio) : null) : prescricaoExistente.data_inicio,
        data_fim: data_fim !== undefined ? (data_fim ? new Date(data_fim) : null) : prescricaoExistente.data_fim,
        ativo: ativo !== undefined ? ativo : prescricaoExistente.ativo,
      },
      include: {
        paciente: {
          select: { id: true, nome: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: prescricao });
  } catch (error: any) {
    console.error("Erro ao atualizar prescrição:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao atualizar prescrição" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID da prescrição é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se a prescrição pertence ao tenant do usuário
    const prescricao = await prisma.prescricaoMedica.findFirst({
      where: { id, tenantId: user.tenant.id },
    });

    if (!prescricao) {
      return NextResponse.json(
        { success: false, error: "Prescrição não encontrada" },
        { status: 404 }
      );
    }

    await prisma.prescricaoMedica.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Prescrição excluída com sucesso" });
  } catch (error: any) {
    console.error("Erro ao excluir prescrição:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao excluir prescrição" },
      { status: 500 }
    );
  }
}
