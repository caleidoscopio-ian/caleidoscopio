import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";

// GET - Buscar anamneses da clínica do usuário logado
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API Anamneses - Iniciando busca com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error('❌ API Anamneses GET - Falha na autenticação');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      console.error('❌ API Anamneses - Usuário sem tenant associado');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica"
        },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!hasPermission(user, 'view_anamneses')) {
      console.error(`❌ API Anamneses - Permissão negada para role: ${user.role}`);
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para visualizar anamneses"
        },
        { status: 403 }
      );
    }

    console.log(`🔍 Buscando anamneses para clínica: ${user.tenant.name} (${user.tenant.id})`);

    // Buscar anamneses APENAS da clínica do usuário (isolamento multi-tenant)
    const anamneses = await prisma.anamnese.findMany({
      where: {
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Filtrar por tenant
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            nascimento: true,
            foto: true,
          }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`✅ Encontradas ${anamneses.length} anamneses para clínica "${user.tenant.name}"`);

    // Converter para formato do frontend
    const anamnesesFormatadas = anamneses.map(anamnese => ({
      id: anamnese.id,
      paciente: {
        id: anamnese.paciente.id,
        nome: anamnese.paciente.nome,
        nascimento: anamnese.paciente.nascimento.toISOString(),
        foto: anamnese.paciente.foto,
      },
      profissionalId: anamnese.profissionalId, // Apenas o ID de referência ao Sistema 1
      status: anamnese.status,
      finalizadaEm: anamnese.finalizadaEm?.toISOString(),
      createdAt: anamnese.createdAt.toISOString(),
      updatedAt: anamnese.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: anamnesesFormatadas,
      total: anamnesesFormatadas.length,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao buscar anamneses:", error);

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

// POST - Criar nova anamnese
export async function POST(request: NextRequest) {
  try {
    console.log("📝 API Anamneses - Criando nova anamnese com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error('❌ API Anamneses POST - Falha na autenticação');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      console.error('❌ API Anamneses - Usuário sem tenant associado');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica"
        },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!hasPermission(user, 'create_anamneses')) {
      console.error(`❌ API Anamneses - Permissão negada para role: ${user.role}`);
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para criar anamneses"
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      pacienteId,
      profissionalId,
      historiaDesenvolvimento,
      comportamentosExcessivos,
      comportamentosDeficitarios,
      comportamentosProblema,
      rotinaDiaria,
      ambienteFamiliar,
      ambienteEscolar,
      preferencias,
      documentosAnexos,
      habilidadesCriticas,
      observacoesGerais,
      status,
    } = body;

    // Validações básicas
    if (!pacienteId) {
      return NextResponse.json(
        { error: "Paciente é obrigatório" },
        { status: 400 }
      );
    }

    console.log(`📝 Criando anamnese para paciente ${pacienteId} na clínica "${user.tenant.name}"`);

    // Criar nova anamnese associada à clínica do usuário
    const newAnamnese = await prisma.anamnese.create({
      data: {
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Associar ao tenant do usuário
        pacienteId,
        profissionalId: profissionalId || user.id, // Se não especificado, usar o próprio usuário
        historiaDesenvolvimento,
        comportamentosExcessivos,
        comportamentosDeficitarios,
        comportamentosProblema,
        rotinaDiaria,
        ambienteFamiliar,
        ambienteEscolar,
        preferencias,
        documentosAnexos: documentosAnexos || [],
        habilidadesCriticas,
        observacoesGerais,
        status: status || 'RASCUNHO',
        finalizadaEm: status === 'FINALIZADA' ? new Date() : null,
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            nascimento: true,
          }
        }
      }
    });

    console.log(`✅ Anamnese criada com sucesso para clínica "${user.tenant.name}"`);

    return NextResponse.json({
      success: true,
      data: {
        id: newAnamnese.id,
        paciente: newAnamnese.paciente,
        profissionalId: newAnamnese.profissionalId,
        status: newAnamnese.status,
        createdAt: newAnamnese.createdAt.toISOString(),
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    }, { status: 201 });
  } catch (error) {
    console.error("❌ Erro ao criar anamnese:", error);

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
