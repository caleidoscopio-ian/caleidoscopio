import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";

// API para buscar prontuários da clínica do usuário logado
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API Prontuários - Iniciando busca com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error('❌ API Prontuários GET - Falha na autenticação');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
          details: "Token inválido ou Sistema 1 não está respondendo. Verifique se o Sistema 1 está rodando em localhost:3000"
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      console.error('❌ API Prontuários - Usuário sem tenant associado');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica"
        },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!await hasPermission(user, 'view_medical_records')) {
      console.error(`❌ API Prontuários - Permissão negada para role: ${user.role}`);
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para visualizar prontuários"
        },
        { status: 403 }
      );
    }

    console.log(`🔍 Buscando prontuários para clínica: ${user.tenant.name} (${user.tenant.id})`);

    // Buscar prontuários com relacionamentos (paciente e profissional da mesma clínica)
    const prontuarios = await prisma.prontuario.findMany({
      where: {
        paciente: {
          tenantId: user.tenant.id, // 🔒 CRÍTICO: Filtrar por tenant através do paciente
          ativo: true,
        },
        profissional: {
          tenantId: user.tenant.id, // 🔒 CRÍTICO: Filtrar por tenant através do profissional
          ativo: true,
        }
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
          }
        },
        profissional: {
          select: {
            id: true,
            nome: true,
            especialidade: true,
          }
        }
      },
      orderBy: {
        data_sessao: "desc", // Mais recentes primeiro
      },
    });

    console.log(`✅ Encontrados ${prontuarios.length} prontuários para clínica "${user.tenant.name}"`);

    // Converter campos para formato esperado pelo frontend
    const prontuariosFormatados = prontuarios.map(prontuario => ({
      id: prontuario.id,
      patient: {
        id: prontuario.paciente.id,
        name: prontuario.paciente.nome,
      },
      professional: {
        id: prontuario.profissional.id,
        name: prontuario.profissional.nome,
        specialty: prontuario.profissional.especialidade,
      },
      sessionDate: prontuario.data_sessao.toISOString(),
      serviceType: prontuario.tipo_atendimento,
      clinicalEvolution: prontuario.evolucao_clinica,
      observations: prontuario.observacoes,
      attachments: prontuario.anexos,
      createdAt: prontuario.createdAt.toISOString(),
      updatedAt: prontuario.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: prontuariosFormatados,
      total: prontuariosFormatados.length,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao buscar prontuários:", error);

    if (error instanceof Error) {
      if (error.message === 'Usuário não autenticado') {
        return NextResponse.json(
          { success: false, error: "Sessão expirada. Faça login novamente." },
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

// API para criar novo prontuário
export async function POST(request: NextRequest) {
  try {
    console.log("📝 API Prontuários - Criando novo prontuário com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error('❌ API Prontuários POST - Falha na autenticação');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
          details: "Token inválido ou Sistema 1 não está respondendo. Verifique se o Sistema 1 está rodando em localhost:3000"
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      console.error('❌ API Prontuários - Usuário sem tenant associado');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica"
        },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!await hasPermission(user, 'create_medical_records')) {
      console.error(`❌ API Prontuários - Permissão negada para role: ${user.role}`);
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para criar prontuários"
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      patientId,
      professionalId,
      sessionDate,
      serviceType,
      clinicalEvolution,
      observations,
      attachments,
    } = body;

    // Validações básicas
    if (!patientId || !professionalId || !sessionDate || !serviceType || !clinicalEvolution) {
      return NextResponse.json(
        { error: "Paciente, profissional, data da sessão, tipo de atendimento e evolução clínica são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se o paciente existe e pertence à clínica do usuário
    const existingPatient = await prisma.paciente.findFirst({
      where: {
        id: patientId,
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar tenant
        ativo: true,
      },
    });

    if (!existingPatient) {
      return NextResponse.json(
        { error: "Paciente não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Verificar se o profissional existe e pertence à clínica do usuário
    const existingProfessional = await prisma.profissional.findFirst({
      where: {
        id: professionalId,
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar tenant
        ativo: true,
      },
    });

    if (!existingProfessional) {
      return NextResponse.json(
        { error: "Profissional não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    console.log(`📝 Criando prontuário para paciente "${existingPatient.nome}" com profissional "${existingProfessional.nome}"`);

    // Criar novo prontuário
    const newRecord = await prisma.prontuario.create({
      data: {
        pacienteId: patientId,
        profissionalId: professionalId,
        data_sessao: new Date(sessionDate),
        tipo_atendimento: serviceType,
        evolucao_clinica: clinicalEvolution,
        observacoes: observations,
        anexos: attachments || [],
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
          }
        },
        profissional: {
          select: {
            id: true,
            nome: true,
            especialidade: true,
          }
        }
      }
    });

    console.log(`✅ Prontuário criado com sucesso para clínica "${user.tenant.name}"`);

    // Converter para formato do frontend
    const recordFormatted = {
      id: newRecord.id,
      patient: {
        id: newRecord.paciente.id,
        name: newRecord.paciente.nome,
      },
      professional: {
        id: newRecord.profissional.id,
        name: newRecord.profissional.nome,
        specialty: newRecord.profissional.especialidade,
      },
      sessionDate: newRecord.data_sessao.toISOString(),
      serviceType: newRecord.tipo_atendimento,
      clinicalEvolution: newRecord.evolucao_clinica,
      observations: newRecord.observacoes,
      attachments: newRecord.anexos,
      createdAt: newRecord.createdAt.toISOString(),
      updatedAt: newRecord.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: recordFormatted,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao criar prontuário:", error);

    if (error instanceof Error) {
      if (error.message === 'Usuário não autenticado') {
        return NextResponse.json(
          { success: false, error: "Sessão expirada. Faça login novamente." },
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

// API para atualizar prontuário
export async function PUT(request: NextRequest) {
  try {
    console.log("✏️ API Prontuários - Atualizando prontuário com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error('❌ API Prontuários PUT - Falha na autenticação');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
          details: "Token inválido ou Sistema 1 não está respondendo. Verifique se o Sistema 1 está rodando em localhost:3000"
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      console.error('❌ API Prontuários - Usuário sem tenant associado');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica"
        },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!await hasPermission(user, 'edit_medical_records')) {
      console.error(`❌ API Prontuários - Permissão negada para role: ${user.role}`);
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para editar prontuários"
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id,
      patientId,
      professionalId,
      sessionDate,
      serviceType,
      clinicalEvolution,
      observations,
      attachments,
    } = body;

    // Validações básicas
    if (!id || !patientId || !professionalId || !sessionDate || !serviceType || !clinicalEvolution) {
      return NextResponse.json(
        { error: "ID, paciente, profissional, data da sessão, tipo de atendimento e evolução clínica são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se o prontuário existe e pertence à clínica do usuário
    const existingRecord = await prisma.prontuario.findFirst({
      where: {
        id: id,
        paciente: {
          tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar tenant através do paciente
        }
      },
      include: {
        paciente: true,
        profissional: true,
      }
    });

    if (!existingRecord) {
      return NextResponse.json(
        { error: "Prontuário não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Verificar se o novo paciente existe e pertence à clínica (se alterado)
    if (patientId !== existingRecord.pacienteId) {
      const newPatient = await prisma.paciente.findFirst({
        where: {
          id: patientId,
          tenantId: user.tenant.id,
          ativo: true,
        },
      });

      if (!newPatient) {
        return NextResponse.json(
          { error: "Novo paciente não encontrado ou não pertence a esta clínica" },
          { status: 404 }
        );
      }
    }

    // Verificar se o novo profissional existe e pertence à clínica (se alterado)
    if (professionalId !== existingRecord.profissionalId) {
      const newProfessional = await prisma.profissional.findFirst({
        where: {
          id: professionalId,
          tenantId: user.tenant.id,
          ativo: true,
        },
      });

      if (!newProfessional) {
        return NextResponse.json(
          { error: "Novo profissional não encontrado ou não pertence a esta clínica" },
          { status: 404 }
        );
      }
    }

    console.log(`✏️ Atualizando prontuário "${id}" na clínica "${user.tenant.name}"`);

    // Atualizar prontuário
    const updatedRecord = await prisma.prontuario.update({
      where: { id: id },
      data: {
        pacienteId: patientId,
        profissionalId: professionalId,
        data_sessao: new Date(sessionDate),
        tipo_atendimento: serviceType,
        evolucao_clinica: clinicalEvolution,
        observacoes: observations,
        anexos: attachments || [],
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
          }
        },
        profissional: {
          select: {
            id: true,
            nome: true,
            especialidade: true,
          }
        }
      }
    });

    console.log(`✅ Prontuário atualizado com sucesso`);

    // Converter para formato do frontend
    const recordFormatted = {
      id: updatedRecord.id,
      patient: {
        id: updatedRecord.paciente.id,
        name: updatedRecord.paciente.nome,
      },
      professional: {
        id: updatedRecord.profissional.id,
        name: updatedRecord.profissional.nome,
        specialty: updatedRecord.profissional.especialidade,
      },
      sessionDate: updatedRecord.data_sessao.toISOString(),
      serviceType: updatedRecord.tipo_atendimento,
      clinicalEvolution: updatedRecord.evolucao_clinica,
      observations: updatedRecord.observacoes,
      attachments: updatedRecord.anexos,
      createdAt: updatedRecord.createdAt.toISOString(),
      updatedAt: updatedRecord.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: recordFormatted,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar prontuário:", error);

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

// API para deletar prontuário
export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ API Prontuários - Deletando prontuário com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error('❌ API Prontuários DELETE - Falha na autenticação');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
          details: "Token inválido ou Sistema 1 não está respondendo. Verifique se o Sistema 1 está rodando em localhost:3000"
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      console.error('❌ API Prontuários - Usuário sem tenant associado');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica"
        },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!await hasPermission(user, 'delete_medical_records')) {
      console.error(`❌ API Prontuários - Permissão negada para role: ${user.role}`);
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para deletar prontuários"
        },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "ID do prontuário é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se o prontuário existe e pertence à clínica do usuário
    const existingRecord = await prisma.prontuario.findFirst({
      where: {
        id: id,
        paciente: {
          tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar tenant
        }
      },
      include: {
        paciente: true,
        profissional: true,
      }
    });

    if (!existingRecord) {
      return NextResponse.json(
        { error: "Prontuário não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    console.log(`🗑️ Deletando prontuário "${id}" na clínica "${user.tenant.name}"`);

    // Deletar prontuário (hard delete - dados clínicos podem ser deletados por compliance)
    await prisma.prontuario.delete({
      where: { id: id },
    });

    console.log(`✅ Prontuário deletado com sucesso`);

    return NextResponse.json({
      success: true,
      message: "Prontuário removido com sucesso",
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao deletar prontuário:", error);

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