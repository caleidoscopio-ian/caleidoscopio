import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission, isAdminUser } from "@/lib/auth/server";
import {
  ESPECIALIDADE_CLINICA_LABELS,
  FUNCAO_ADMINISTRATIVA_LABELS,
  CONSELHO_LABELS,
} from "@/lib/profissional-constants";
import { TipoVinculoProfissional, EspecialidadeClinica, FuncaoAdministrativa, ConselhoProfissional } from "@prisma/client";

// Deriva o texto legado de "especialidade" a partir dos campos estruturados
function derivarEspecialidadeLegado(
  tipoVinculo: TipoVinculoProfissional | null | undefined,
  especialidadeClinica: EspecialidadeClinica | null | undefined,
  funcaoAdministrativa: FuncaoAdministrativa | null | undefined
): string | null {
  if (tipoVinculo === "FUNCIONARIO_ADMINISTRATIVO") {
    return funcaoAdministrativa ? FUNCAO_ADMINISTRATIVA_LABELS[funcaoAdministrativa] : null;
  }
  if (tipoVinculo === "PROFISSIONAL_CLINICO") {
    return especialidadeClinica ? ESPECIALIDADE_CLINICA_LABELS[especialidadeClinica] : null;
  }
  return null;
}

// Deriva o texto legado de "registro_profissional" a partir dos campos estruturados
function derivarRegistroLegado(
  conselho: ConselhoProfissional | null | undefined,
  numeroRegistro: string | null | undefined,
  ufRegistro: string | null | undefined
): string | null {
  if (!conselho || !numeroRegistro) return null;
  const base = `${CONSELHO_LABELS[conselho]} ${numeroRegistro}`;
  return ufRegistro ? `${base} - ${ufRegistro}` : base;
}

// API para buscar terapeutas/profissionais da clínica do usuário logado
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API Terapeutas - Iniciando busca com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error('❌ API Terapeutas GET - Falha na autenticação');
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
      console.error('❌ API Terapeutas - Usuário sem tenant associado');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica"
        },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!await hasPermission(user, 'view_professionals')) {
      console.error(`❌ API Terapeutas - Permissão negada para role: ${user.role}`);
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para visualizar terapeutas"
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const isAdmin = isAdminUser(user);
    const filialIdParam = searchParams.get('filialId');
    const filialFiltro = !isAdmin ? (user.filialId ?? null) : (filialIdParam || null);

    console.log(`🔍 Buscando terapeutas para clínica: ${user.tenant.name} (${user.tenant.id})`);

    // Quando filtrando por filial, descobrir quais usuários estão atribuídos a ela
    // A filial do profissional é gerenciada via UsuarioRole.filialId (página /usuarios)
    let usuarioIdsDaFilial: string[] | null = null;
    if (filialFiltro) {
      const rolesNaFilial = await prisma.usuarioRole.findMany({
        where: {
          tenantId: user.tenant.id,
          ativo: true,
          filialId: filialFiltro,
        },
        select: { usuarioId: true },
      });
      usuarioIdsDaFilial = rolesNaFilial.map((r) => r.usuarioId);
    }

    // Buscar profissionais APENAS da clínica do usuário (isolamento multi-tenant)
    const profissionais = await prisma.profissional.findMany({
      where: {
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Filtrar por tenant
        ativo: true,
        ...(filialFiltro && usuarioIdsDaFilial !== null ? {
          OR: [
            // Profissional cujo usuário está atribuído à filial selecionada
            { usuarioId: { in: usuarioIdsDaFilial } },
            // Profissional sem conta de usuário no sistema (tratado como global)
            { usuarioId: null },
            // Compat: vínculo direto via ProfissionalFilial (se existir)
            { filiais: { some: { filialId: filialFiltro } } },
          ],
        } : {}),
      },
      select: {
        id: true,
        nome: true,
        cpf: true,
        telefone: true,
        email: true,
        especialidade: true,
        registro_profissional: true,
        tipo_vinculo: true,
        especialidade_clinica: true,
        funcao_administrativa: true,
        conselho: true,
        numero_registro: true,
        uf_registro: true,
        salas_acesso: true,
        usuarioId: true,
        createdAt: true,
        updatedAt: true,
        filiais: {
          select: { filialId: true, principal: true },
        },
      },
      orderBy: {
        nome: "asc",
      },
    });

    console.log(`✅ Encontrados ${profissionais.length} terapeutas para clínica "${user.tenant.name}"`);

    // Resolver a filial de cada profissional para exibição/agrupamento:
    // 1ª fonte — UsuarioRole.filialId (gerenciado na página /usuarios)
    // 2ª fonte — ProfissionalFilial (compat), priorizando o vínculo "principal"
    const usuarioIdsPresentes = profissionais
      .map((p) => p.usuarioId)
      .filter((id): id is string => !!id);
    const rolesAtivos = usuarioIdsPresentes.length > 0
      ? await prisma.usuarioRole.findMany({
          where: { tenantId: user.tenant.id, ativo: true, usuarioId: { in: usuarioIdsPresentes }, filialId: { not: null } },
          select: { usuarioId: true, filialId: true },
        })
      : [];
    const filialPorUsuario = new Map(rolesAtivos.map((r) => [r.usuarioId, r.filialId as string]));

    // Converter campos para formato esperado pelo frontend
    const terapeutasFormatados = profissionais.map(profissional => {
      const filialViaRole = profissional.usuarioId ? filialPorUsuario.get(profissional.usuarioId) : undefined;
      const filialViaVinculo = profissional.filiais.find((f) => f.principal)?.filialId || profissional.filiais[0]?.filialId;
      const filialIdResolvido = filialViaRole || filialViaVinculo || null;

      return {
        id: profissional.id,
        name: profissional.nome,
        cpf: profissional.cpf || "",
        phone: profissional.telefone,
        email: profissional.email,
        specialty: profissional.especialidade,
        professionalRegistration: profissional.registro_profissional,
        tipoVinculo: profissional.tipo_vinculo,
        especialidadeClinica: profissional.especialidade_clinica,
        funcaoAdministrativa: profissional.funcao_administrativa,
        conselho: profissional.conselho,
        numeroRegistro: profissional.numero_registro,
        ufRegistro: profissional.uf_registro,
        roomAccess: profissional.salas_acesso,
        usuarioId: profissional.usuarioId,
        filialId: filialIdResolvido,
        createdAt: profissional.createdAt.toISOString(),
        updatedAt: profissional.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      data: terapeutasFormatados,
      total: terapeutasFormatados.length,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao buscar terapeutas:", error);

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

// API para criar novo terapeuta/profissional
export async function POST(request: NextRequest) {
  try {
    console.log("📝 API Terapeutas - Criando novo terapeuta com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error('❌ API Terapeutas POST - Falha na autenticação');
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
      console.error('❌ API Terapeutas - Usuário sem tenant associado');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica"
        },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!await hasPermission(user, 'create_professionals')) {
      console.error(`❌ API Terapeutas - Permissão negada para role: ${user.role}`);
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para criar terapeutas"
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      cpf,
      phone,
      email,
      roomAccess,
      filialId,
      tipoVinculo,
      especialidadeClinica,
      funcaoAdministrativa,
      conselho,
      numeroRegistro,
      ufRegistro,
    } = body;

    // Validações básicas
    if (!name) {
      return NextResponse.json(
        { error: "Nome é obrigatório" },
        { status: 400 }
      );
    }

    // Tipo de vínculo: default resiliente para PROFISSIONAL_CLINICO se não enviado
    const tipoVinculoFinal = tipoVinculo || "PROFISSIONAL_CLINICO";
    const especialidadeLegado = derivarEspecialidadeLegado(tipoVinculoFinal, especialidadeClinica, funcaoAdministrativa);
    const registroLegado = derivarRegistroLegado(conselho, numeroRegistro, ufRegistro);

    // Verificar se já existe profissional com este CPF na mesma clínica
    if (cpf) {
      const existingProfessional = await prisma.profissional.findFirst({
        where: {
          tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar apenas na clínica do usuário
          cpf: cpf,
          ativo: true,
        },
      });

      if (existingProfessional) {
        return NextResponse.json(
          { error: "Já existe um terapeuta com este CPF cadastrado nesta clínica" },
          { status: 409 }
        );
      }
    }

    // Verificar se já existe profissional com este email na mesma clínica
    if (email) {
      const existingEmail = await prisma.profissional.findFirst({
        where: {
          tenantId: user.tenant.id,
          email: email,
          ativo: true,
        },
      });

      if (existingEmail) {
        return NextResponse.json(
          { error: "Já existe um terapeuta com este email cadastrado nesta clínica" },
          { status: 409 }
        );
      }
    }

    console.log(`📝 Criando terapeuta "${name}" para clínica "${user.tenant.name}"`);

    // Criar novo profissional associado à clínica do usuário
    const newProfessional = await prisma.profissional.create({
      data: {
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Associar ao tenant do usuário
        nome: name,
        cpf: cpf,
        telefone: phone,
        email: email,
        especialidade: especialidadeLegado,
        registro_profissional: registroLegado,
        tipo_vinculo: tipoVinculoFinal,
        especialidade_clinica: especialidadeClinica || null,
        funcao_administrativa: funcaoAdministrativa || null,
        conselho: conselho || null,
        numero_registro: numeroRegistro || null,
        uf_registro: ufRegistro || null,
        salas_acesso: roomAccess || [],
        ativo: true,
      },
    });

    console.log(`✅ Terapeuta "${name}" criado com sucesso para clínica "${user.tenant.name}"`);

    // Vincular à filial se informada
    if (filialId) {
      await prisma.profissionalFilial.create({
        data: {
          profissionalId: newProfessional.id,
          filialId,
          principal: true,
        },
      });
    }

    // Converter para formato do frontend
    const professionalFormatted = {
      id: newProfessional.id,
      name: newProfessional.nome,
      cpf: newProfessional.cpf || "",
      phone: newProfessional.telefone,
      email: newProfessional.email,
      specialty: newProfessional.especialidade,
      professionalRegistration: newProfessional.registro_profissional,
      tipoVinculo: newProfessional.tipo_vinculo,
      especialidadeClinica: newProfessional.especialidade_clinica,
      funcaoAdministrativa: newProfessional.funcao_administrativa,
      conselho: newProfessional.conselho,
      numeroRegistro: newProfessional.numero_registro,
      ufRegistro: newProfessional.uf_registro,
      roomAccess: newProfessional.salas_acesso,
      createdAt: newProfessional.createdAt.toISOString(),
      updatedAt: newProfessional.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: professionalFormatted,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao criar terapeuta:", error);

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

// API para atualizar terapeuta/profissional
export async function PUT(request: NextRequest) {
  try {
    console.log("✏️ API Terapeutas - Atualizando terapeuta com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error('❌ API Terapeutas PUT - Falha na autenticação');
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
      console.error('❌ API Terapeutas - Usuário sem tenant associado');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica"
        },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!await hasPermission(user, 'edit_professionals')) {
      console.error(`❌ API Terapeutas - Permissão negada para role: ${user.role}`);
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para editar terapeutas"
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id,
      name,
      cpf,
      phone,
      email,
      roomAccess,
      tipoVinculo,
      especialidadeClinica,
      funcaoAdministrativa,
      conselho,
      numeroRegistro,
      ufRegistro,
    } = body;

    // Validações básicas
    if (!id || !name) {
      return NextResponse.json(
        { error: "ID e nome são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se o profissional existe e pertence à clínica do usuário
    const existingProfessional = await prisma.profissional.findFirst({
      where: {
        id: id,
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar tenant
        ativo: true,
      },
    });

    if (!existingProfessional) {
      return NextResponse.json(
        { error: "Terapeuta não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Verificar se CPF já existe em outro profissional da mesma clínica
    if (cpf && cpf !== existingProfessional.cpf) {
      const duplicateCpf = await prisma.profissional.findFirst({
        where: {
          tenantId: user.tenant.id,
          cpf: cpf,
          ativo: true,
          id: { not: id },
        },
      });

      if (duplicateCpf) {
        return NextResponse.json(
          { error: "Já existe outro terapeuta com este CPF nesta clínica" },
          { status: 409 }
        );
      }
    }

    // Verificar se email já existe em outro profissional da mesma clínica
    if (email && email !== existingProfessional.email) {
      const duplicateEmail = await prisma.profissional.findFirst({
        where: {
          tenantId: user.tenant.id,
          email: email,
          ativo: true,
          id: { not: id },
        },
      });

      if (duplicateEmail) {
        return NextResponse.json(
          { error: "Já existe outro terapeuta com este email nesta clínica" },
          { status: 409 }
        );
      }
    }

    console.log(`✏️ Atualizando terapeuta "${name}" na clínica "${user.tenant.name}"`);

    // Deriva os campos legados somente quando a classificação estrutural for enviada,
    // sem sobrescrever o que já existia caso o PUT seja parcial.
    const tipoVinculoParaDerivar = tipoVinculo !== undefined ? tipoVinculo : existingProfessional.tipo_vinculo;
    const especialidadeLegado = (tipoVinculo !== undefined || especialidadeClinica !== undefined || funcaoAdministrativa !== undefined)
      ? derivarEspecialidadeLegado(
          tipoVinculoParaDerivar,
          especialidadeClinica !== undefined ? especialidadeClinica : existingProfessional.especialidade_clinica,
          funcaoAdministrativa !== undefined ? funcaoAdministrativa : existingProfessional.funcao_administrativa
        )
      : undefined;
    const registroLegado = (conselho !== undefined || numeroRegistro !== undefined || ufRegistro !== undefined)
      ? derivarRegistroLegado(
          conselho !== undefined ? conselho : existingProfessional.conselho,
          numeroRegistro !== undefined ? numeroRegistro : existingProfessional.numero_registro,
          ufRegistro !== undefined ? ufRegistro : existingProfessional.uf_registro
        )
      : undefined;

    // Atualizar profissional — só sobrescreve campos enviados explicitamente no body
    const updatedProfessional = await prisma.profissional.update({
      where: { id: id },
      data: {
        nome: name,
        cpf: cpf,
        telefone: phone,
        email: email,
        ...(tipoVinculo !== undefined ? { tipo_vinculo: tipoVinculo } : {}),
        ...(especialidadeClinica !== undefined ? { especialidade_clinica: especialidadeClinica || null } : {}),
        ...(funcaoAdministrativa !== undefined ? { funcao_administrativa: funcaoAdministrativa || null } : {}),
        ...(conselho !== undefined ? { conselho: conselho || null } : {}),
        ...(numeroRegistro !== undefined ? { numero_registro: numeroRegistro || null } : {}),
        ...(ufRegistro !== undefined ? { uf_registro: ufRegistro || null } : {}),
        ...(especialidadeLegado !== undefined ? { especialidade: especialidadeLegado } : {}),
        ...(registroLegado !== undefined ? { registro_profissional: registroLegado } : {}),
        salas_acesso: roomAccess || [],
      },
    });

    console.log(`✅ Terapeuta "${name}" atualizado com sucesso`);

    // Converter para formato do frontend
    const professionalFormatted = {
      id: updatedProfessional.id,
      name: updatedProfessional.nome,
      cpf: updatedProfessional.cpf || "",
      phone: updatedProfessional.telefone,
      email: updatedProfessional.email,
      specialty: updatedProfessional.especialidade,
      professionalRegistration: updatedProfessional.registro_profissional,
      tipoVinculo: updatedProfessional.tipo_vinculo,
      especialidadeClinica: updatedProfessional.especialidade_clinica,
      funcaoAdministrativa: updatedProfessional.funcao_administrativa,
      conselho: updatedProfessional.conselho,
      numeroRegistro: updatedProfessional.numero_registro,
      ufRegistro: updatedProfessional.uf_registro,
      roomAccess: updatedProfessional.salas_acesso,
      createdAt: updatedProfessional.createdAt.toISOString(),
      updatedAt: updatedProfessional.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: professionalFormatted,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar terapeuta:", error);

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

// API para deletar terapeuta/profissional (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ API Terapeutas - Deletando terapeuta com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error('❌ API Terapeutas DELETE - Falha na autenticação');
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
      console.error('❌ API Terapeutas - Usuário sem tenant associado');
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica"
        },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!await hasPermission(user, 'delete_professionals')) {
      console.error(`❌ API Terapeutas - Permissão negada para role: ${user.role}`);
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para deletar terapeutas"
        },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "ID do terapeuta é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se o profissional existe e pertence à clínica do usuário
    const existingProfessional = await prisma.profissional.findFirst({
      where: {
        id: id,
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar tenant
        ativo: true,
      },
    });

    if (!existingProfessional) {
      return NextResponse.json(
        { error: "Terapeuta não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    console.log(`🗑️ Desativando terapeuta "${existingProfessional.nome}" na clínica "${user.tenant.name}"`);

    // Soft delete - apenas marcar como inativo
    await prisma.profissional.update({
      where: { id: id },
      data: { ativo: false },
    });

    console.log(`✅ Terapeuta "${existingProfessional.nome}" desativado com sucesso`);

    return NextResponse.json({
      success: true,
      message: "Terapeuta removido com sucesso",
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name
      }
    });
  } catch (error) {
    console.error("❌ Erro ao deletar terapeuta:", error);

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