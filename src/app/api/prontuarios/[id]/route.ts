import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";

// API para buscar um prontuário específico por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`🔍 API Prontuário - Buscando prontuário ID: ${id}`);

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error("❌ API Prontuário GET - Falha na autenticação");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
          details:
            "Token inválido ou Sistema 1 não está respondendo. Verifique se o Sistema 1 está rodando em localhost:3000",
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      console.error("❌ API Prontuário - Usuário sem tenant associado");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica",
        },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!hasPermission(user, "view_medical_records")) {
      console.error(
        `❌ API Prontuário - Permissão negada para role: ${user.role}`
      );
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para visualizar prontuários",
        },
        { status: 403 }
      );
    }

    // Buscar prontuário específico
    const prontuario = await prisma.prontuario.findFirst({
      where: {
        id: id,
        paciente: {
          tenantId: user.tenant.id, // 🔒 CRÍTICO: Filtrar por tenant através do paciente
          ativo: true,
        },
        profissional: {
          tenantId: user.tenant.id, // 🔒 CRÍTICO: Filtrar por tenant através do profissional
          ativo: true,
        },
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            nascimento: true,
            foto: true,
            cpf: true,
            telefone: true,
            email: true,
          },
        },
        profissional: {
          select: {
            id: true,
            nome: true,
            especialidade: true,
          },
        },
      },
    });

    if (!prontuario) {
      console.error(`❌ Prontuário ${id} não encontrado`);
      return NextResponse.json(
        {
          success: false,
          error: "Prontuário não encontrado ou não pertence a esta clínica",
        },
        { status: 404 }
      );
    }

    console.log(
      `✅ Prontuário encontrado para clínica "${user.tenant.name}"`
    );

    // Converter para formato esperado pelo frontend
    const prontuarioFormatado = {
      id: prontuario.id,
      patient: {
        id: prontuario.paciente.id,
        nome: prontuario.paciente.nome,
        nascimento: prontuario.paciente.nascimento.toISOString(),
        foto: prontuario.paciente.foto,
        cpf: prontuario.paciente.cpf,
        telefone: prontuario.paciente.telefone,
        email: prontuario.paciente.email,
      },
      professional: {
        id: prontuario.profissional.id,
        nome: prontuario.profissional.nome,
        especialidade: prontuario.profissional.especialidade,
      },
      sessionDate: prontuario.data_sessao.toISOString(),
      serviceType: prontuario.tipo_atendimento,
      clinicalEvolution: prontuario.evolucao_clinica,
      observations: prontuario.observacoes,
      attachments: prontuario.anexos,
      createdAt: prontuario.createdAt.toISOString(),
      updatedAt: prontuario.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: prontuarioFormatado,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar prontuário:", error);

    if (error instanceof Error) {
      if (error.message === "Usuário não autenticado") {
        return NextResponse.json(
          {
            success: false,
            error: "Sessão expirada. Faça login novamente.",
          },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
