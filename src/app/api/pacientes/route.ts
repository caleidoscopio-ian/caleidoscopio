/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission, isAdminUser } from "@/lib/auth/server";
import { isValidCPF } from "@/lib/masks";
import { Sexo, ParentescoResponsavel } from "@prisma/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isValidUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

const SEXO_VALUES = Object.values(Sexo)
function isValidSexo(v: unknown): v is Sexo {
  return typeof v === 'string' && (SEXO_VALUES as string[]).includes(v)
}

const PARENTESCO_VALUES = Object.values(ParentescoResponsavel)
function isValidParentesco(v: unknown): v is ParentescoResponsavel {
  return typeof v === 'string' && (PARENTESCO_VALUES as string[]).includes(v)
}

interface ResponsavelInput {
  nome: string
  telefone?: string
  parentesco: ParentescoResponsavel
  cpf?: string
  financeiro?: boolean
}

interface ConvenioInput {
  convenioId: string
  numero_carteirinha?: string
  principal?: boolean
}

// Valida a lista de responsáveis e retorna mensagem de erro (ou null se ok)
function validarResponsaveis(responsaveis: unknown): string | null {
  if (responsaveis === undefined) return null
  if (!Array.isArray(responsaveis)) return "Responsáveis deve ser uma lista"
  for (const r of responsaveis as ResponsavelInput[]) {
    if (!r.nome || !r.nome.trim()) return "Nome do responsável é obrigatório"
    if (!isValidParentesco(r.parentesco)) return "Parentesco do responsável é obrigatório"
    if (r.cpf && !isValidCPF(r.cpf)) return `CPF inválido para o responsável "${r.nome}"`
  }
  return null
}

// Deriva os campos legados (guardianName/guardianPhone) a partir da lista de responsáveis
function derivarResponsavelLegado(responsaveis: ResponsavelInput[] | undefined) {
  if (!responsaveis || responsaveis.length === 0) return { nome: undefined, telefone: undefined }
  const principal = responsaveis.find((r) => r.financeiro) || responsaveis[0]
  return { nome: principal.nome, telefone: principal.telefone }
}

// Deriva os campos legados (convenioId/matricula) a partir da lista de convênios
function derivarConvenioLegado(convenios: ConvenioInput[] | undefined) {
  if (!convenios || convenios.length === 0) return { convenioId: null as string | null, matricula: undefined as string | undefined }
  const principal = convenios.find((c) => c.principal) || convenios[0]
  return {
    convenioId: isValidUuid(principal.convenioId) ? principal.convenioId : null,
    matricula: principal.numero_carteirinha,
  }
}

// API para buscar pacientes da clínica do usuário logado
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API Pacientes - Iniciando busca com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error("❌ API Pacientes - Falha na autenticação");
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
      console.error("❌ API Pacientes - Usuário sem tenant associado");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica",
        },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!await hasPermission(user, "view_patients")) {
      console.error(
        `❌ API Pacientes - Permissão negada para role: ${user.role}`
      );
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para visualizar pacientes",
        },
        { status: 403 }
      );
    }

    console.log(
      `🔍 Buscando pacientes para clínica: ${user.tenant.name} (${user.tenant.id})`
    );

    const { searchParams } = new URL(request.url)
    const isAdmin = isAdminUser(user)
    // Filtro de filial: admin escolhe via seletor global (query param); não-admin fica
    // restrito à própria filial. Sem filial vinculada/selecionada → toda a clínica.
    const filialFiltro = !isAdmin ? (user.filialId ?? null) : (searchParams.get('filialId') || null)

    // Mostrar TODOS os pacientes da clínica/filial para todos os usuários.
    // A atribuição (profissionalId) continua existindo no cadastro, mas NÃO restringe
    // mais a listagem — apenas o isolamento de tenant e o filtro de filial se aplicam.
    const where: any = {
      tenantId: user.tenant.id, // 🔒 CRÍTICO: Filtrar por tenant
      ativo: true,
    };
    // Filtro de filial inclusivo: quando uma filial está ativa, mostra os pacientes
    // daquela filial + os sem filial (NULL = todas as filiais, ainda não atribuídos).
    // Cobre clínicas multi-filial e clínicas com filial única.
    if (filialFiltro) {
      where.OR = [{ filialId: filialFiltro }, { filialId: null }];
    }

    // Buscar pacientes APENAS da clínica do usuário (isolamento multi-tenant)
    const pacientes = await prisma.paciente.findMany({
      where,
      select: {
        id: true,
        nome: true,
        cpf: true,
        nascimento: true,
        email: true,
        telefone: true,
        endereco: true,
        sexo: true,
        cep: true,
        logradouro: true,
        numero: true,
        complemento: true,
        bairro: true,
        cidade: true,
        estado: true,
        escolaridade: true,
        estado_civil: true,
        responsavel_financeiro: true,
        contato_emergencia: true,
        plano_saude: true,
        convenioId: true,
        matricula: true,
        cor_agenda: true,
        profissionalId: true,
        filialId: true,
        filial: {
          select: {
            id: true,
            nome: true,
            cor: true,
          },
        },
        profissional: {
          select: {
            id: true,
            nome: true,
            especialidade: true,
          },
        },
        convenio: {
          select: {
            id: true,
            razao_social: true,
            nome_fantasia: true,
          },
        },
        responsaveis: {
          orderBy: { createdAt: "asc" },
        },
        convenios: {
          orderBy: { createdAt: "asc" },
          include: {
            convenio: {
              select: { id: true, razao_social: true, nome_fantasia: true },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        nome: "asc",
      },
    });

    console.log(
      `✅ Encontrados ${pacientes.length} pacientes para clínica "${user.tenant.name}"`
    );

    // Converter campos para formato esperado pelo frontend
    const pacientesFormatados = pacientes.map((paciente) => ({
      id: paciente.id,
      name: paciente.nome,
      cpf: paciente.cpf || "",
      birthDate: paciente.nascimento.toISOString(),
      email: paciente.email,
      phone: paciente.telefone,
      address: paciente.endereco,
      sexo: paciente.sexo,
      cep: paciente.cep,
      logradouro: paciente.logradouro,
      numero: paciente.numero,
      complemento: paciente.complemento,
      bairro: paciente.bairro,
      cidade: paciente.cidade,
      estado: paciente.estado,
      escolaridade: paciente.escolaridade,
      estado_civil: paciente.estado_civil,
      guardianName: paciente.responsavel_financeiro,
      guardianPhone: paciente.contato_emergencia,
      healthInsurance: paciente.plano_saude,
      convenioId: paciente.convenioId ?? null,
      convenio: paciente.convenio ?? null,
      healthInsuranceNumber: paciente.matricula,
      profissionalId: paciente.profissionalId,
      filialId: paciente.filialId,
      filial: paciente.filial ?? null,
      profissional: paciente.profissional
        ? {
            id: paciente.profissional.id,
            nome: paciente.profissional.nome,
            especialidade: paciente.profissional.especialidade,
          }
        : null,
      responsaveis: paciente.responsaveis,
      convenios: paciente.convenios,
      createdAt: paciente.createdAt.toISOString(),
      updatedAt: paciente.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: pacientesFormatados,
      total: pacientesFormatados.length,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar pacientes:", error);

    if (error instanceof Error) {
      if (error.message === "Usuário não autenticado") {
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

// API para criar novo paciente
export async function POST(request: NextRequest) {
  try {
    console.log("📝 API Pacientes - Criando novo paciente com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error("❌ API Pacientes POST - Falha na autenticação");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
          details: "Token inválido ou Sistema 1 não está respondendo",
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      return NextResponse.json(
        { success: false, error: "Usuário não está associado a uma clínica" },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!await hasPermission(user, "create_patients")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para criar pacientes" },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log("📥 API Pacientes POST - Body recebido:", body);

    const {
      name,
      cpf,
      birthDate,
      email,
      phone,
      address,
      sexo,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      escolaridade,
      estado_civil,
      guardianName,
      guardianPhone,
      healthInsurance,
      healthInsuranceNumber,
      convenioId,
      profissionalId,
      filialId,
    } = body;
    const responsaveis: ResponsavelInput[] | undefined = body.responsaveis;
    const convenios: ConvenioInput[] | undefined = body.convenios;

    const isAdmin = isAdminUser(user)
    // Admin usa filialId enviado pelo form; não-admin usa a filial do seu perfil
    const filialIdToSave = isAdmin ? (filialId || null) : (user.filialId ?? null)

    console.log("🔑 profissionalId extraído do body:", profissionalId);

    // Validações básicas
    if (!name || !birthDate) {
      return NextResponse.json(
        { error: "Nome e data de nascimento são obrigatórios" },
        { status: 400 }
      );
    }

    if (!isValidSexo(sexo)) {
      return NextResponse.json(
        { error: "Sexo é obrigatório" },
        { status: 400 }
      );
    }

    const erroResponsaveis = validarResponsaveis(responsaveis);
    if (erroResponsaveis) {
      return NextResponse.json({ error: erroResponsaveis }, { status: 400 });
    }

    // Verificar se já existe paciente com este CPF na mesma clínica
    if (cpf) {
      const existingPatient = await prisma.paciente.findFirst({
        where: {
          tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar apenas na clínica do usuário
          cpf: cpf,
          ativo: true,
        },
      });

      if (existingPatient) {
        return NextResponse.json(
          {
            error:
              "Já existe um paciente com este CPF cadastrado nesta clínica",
          },
          { status: 409 }
        );
      }
    }

    console.log(
      `📝 Criando paciente "${name}" para clínica "${user.tenant.name}"`
    );
    console.log(`🔗 Vinculando ao profissional: ${profissionalId || "NENHUM"}`);

    // Deriva campos legados a partir das novas listas (fallback pro valor enviado direto, se houver)
    const responsavelLegado = derivarResponsavelLegado(responsaveis);
    const convenioLegado = derivarConvenioLegado(convenios);

    // Criar novo paciente associado à clínica do usuário
    const newPatient = await prisma.paciente.create({
      data: {
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Associar ao tenant do usuário
        nome: name,
        cpf: cpf,
        nascimento: new Date(birthDate),
        email: email,
        telefone: phone,
        endereco: address,
        sexo: sexo,
        cep: cep || null,
        logradouro: logradouro || null,
        numero: numero || null,
        complemento: complemento || null,
        bairro: bairro || null,
        cidade: cidade || null,
        estado: estado || null,
        escolaridade: escolaridade || null,
        estado_civil: estado_civil || null,
        responsavel_financeiro: responsavelLegado.nome ?? guardianName,
        contato_emergencia: responsavelLegado.telefone ?? guardianPhone,
        plano_saude: healthInsurance === "particular" ? null : healthInsurance,
        convenioId: convenios !== undefined ? convenioLegado.convenioId : (isValidUuid(convenioId) ? convenioId : null),
        matricula: convenios !== undefined ? convenioLegado.matricula : healthInsuranceNumber,
        profissionalId: profissionalId || null,
        filialId: filialIdToSave,
        ativo: true,
        responsaveis: responsaveis && responsaveis.length > 0
          ? {
              create: responsaveis.map((r) => ({
                nome: r.nome,
                telefone: r.telefone || null,
                parentesco: r.parentesco,
                cpf: r.cpf ? r.cpf.replace(/\D/g, "") : null,
                financeiro: !!r.financeiro,
              })),
            }
          : undefined,
        convenios: convenios && convenios.length > 0
          ? {
              create: convenios
                .filter((c) => isValidUuid(c.convenioId))
                .map((c) => ({
                  convenioId: c.convenioId,
                  numero_carteirinha: c.numero_carteirinha || null,
                  principal: !!c.principal,
                })),
            }
          : undefined,
      },
      include: {
        convenio: { select: { id: true, razao_social: true, nome_fantasia: true } },
        profissional: { select: { id: true, nome: true, especialidade: true } },
        responsaveis: true,
        convenios: { include: { convenio: { select: { id: true, razao_social: true, nome_fantasia: true } } } },
      },
    });

    console.log(
      `✅ Paciente criado com ID: ${newPatient.id}, profissionalId: ${newPatient.profissionalId}`
    );

    console.log(
      `✅ Paciente "${name}" criado com sucesso para clínica "${user.tenant.name}"`
    );

    // Converter para formato do frontend
    const patientFormatted = {
      id: newPatient.id,
      name: newPatient.nome,
      cpf: newPatient.cpf || "",
      birthDate: newPatient.nascimento.toISOString(),
      email: newPatient.email,
      phone: newPatient.telefone,
      address: newPatient.endereco,
      sexo: newPatient.sexo,
      cep: newPatient.cep,
      logradouro: newPatient.logradouro,
      numero: newPatient.numero,
      complemento: newPatient.complemento,
      bairro: newPatient.bairro,
      cidade: newPatient.cidade,
      estado: newPatient.estado,
      escolaridade: newPatient.escolaridade,
      estado_civil: newPatient.estado_civil,
      guardianName: newPatient.responsavel_financeiro,
      guardianPhone: newPatient.contato_emergencia,
      healthInsurance: newPatient.plano_saude,
      convenioId: newPatient.convenioId ?? null,
      convenio: newPatient.convenio ?? null,
      healthInsuranceNumber: newPatient.matricula,
      profissionalId: newPatient.profissionalId,
      profissional: newPatient.profissional
        ? { id: newPatient.profissional.id, nome: newPatient.profissional.nome, especialidade: newPatient.profissional.especialidade }
        : null,
      responsaveis: newPatient.responsaveis,
      convenios: newPatient.convenios,
      createdAt: newPatient.createdAt.toISOString(),
      updatedAt: newPatient.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: patientFormatted,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao criar paciente:", error);

    if (error instanceof Error) {
      if (error.message === "Usuário não autenticado") {
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

// API para atualizar paciente
export async function PUT(request: NextRequest) {
  try {
    console.log("✏️ API Pacientes - Atualizando paciente com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error("❌ API Pacientes PUT - Falha na autenticação");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
          details: "Token inválido ou Sistema 1 não está respondendo",
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      return NextResponse.json(
        { success: false, error: "Usuário não está associado a uma clínica" },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!await hasPermission(user, "edit_patients")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para editar pacientes" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id,
      name,
      cpf,
      birthDate,
      email,
      phone,
      address,
      sexo,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      escolaridade,
      estado_civil,
      guardianName,
      guardianPhone,
      healthInsurance,
      healthInsuranceNumber,
      convenioId,
      profissionalId,
      filialId: filialIdBody,
    } = body;
    const responsaveis: ResponsavelInput[] | undefined = body.responsaveis;
    const convenios: ConvenioInput[] | undefined = body.convenios;

    // Validações básicas — apenas o ID é sempre obrigatório, para permitir updates
    // parciais (ex.: reatribuir só o Terapeuta Responsável a partir do modal de detalhes)
    if (!id) {
      return NextResponse.json(
        { error: "ID é obrigatório" },
        { status: 400 }
      );
    }
    if (name !== undefined && !name) {
      return NextResponse.json(
        { error: "Nome não pode ser vazio" },
        { status: 400 }
      );
    }
    if (birthDate !== undefined && !birthDate) {
      return NextResponse.json(
        { error: "Data de nascimento não pode ser vazia" },
        { status: 400 }
      );
    }
    if (sexo !== undefined && !isValidSexo(sexo)) {
      return NextResponse.json(
        { error: "Sexo inválido" },
        { status: 400 }
      );
    }

    const erroResponsaveis = validarResponsaveis(responsaveis);
    if (erroResponsaveis) {
      return NextResponse.json({ error: erroResponsaveis }, { status: 400 });
    }

    // Verificar se o paciente existe e pertence à clínica do usuário
    const existingPatient = await prisma.paciente.findFirst({
      where: {
        id: id,
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

    // Verificar se CPF já existe em outro paciente da mesma clínica
    if (cpf && cpf !== existingPatient.cpf) {
      const duplicateCpf = await prisma.paciente.findFirst({
        where: {
          tenantId: user.tenant.id,
          cpf: cpf,
          ativo: true,
          id: { not: id },
        },
      });

      if (duplicateCpf) {
        return NextResponse.json(
          { error: "Já existe outro paciente com este CPF nesta clínica" },
          { status: 409 }
        );
      }
    }

    console.log(
      `✏️ Atualizando paciente "${existingPatient.nome}" na clínica "${user.tenant.name}"`
    );

    // Deriva campos legados a partir das novas listas, quando enviadas
    const responsavelLegado = derivarResponsavelLegado(responsaveis);
    const convenioLegado = derivarConvenioLegado(convenios);

    // Atualizar paciente — só sobrescreve campos enviados explicitamente no body,
    // pra permitir updates parciais (ex.: reatribuir só o Terapeuta Responsável)
    // sem apagar o restante dos dados do paciente.
    const updatedPatient = await prisma.$transaction(async (tx) => {
      if (responsaveis !== undefined) {
        await tx.pacienteResponsavel.deleteMany({ where: { pacienteId: id } });
        if (responsaveis.length > 0) {
          await tx.pacienteResponsavel.createMany({
            data: responsaveis.map((r) => ({
              pacienteId: id,
              nome: r.nome,
              telefone: r.telefone || null,
              parentesco: r.parentesco,
              cpf: r.cpf ? r.cpf.replace(/\D/g, "") : null,
              financeiro: !!r.financeiro,
            })),
          });
        }
      }

      if (convenios !== undefined) {
        await tx.pacienteConvenio.deleteMany({ where: { pacienteId: id } });
        const validConvenios = convenios.filter((c) => isValidUuid(c.convenioId));
        if (validConvenios.length > 0) {
          await tx.pacienteConvenio.createMany({
            data: validConvenios.map((c) => ({
              pacienteId: id,
              convenioId: c.convenioId,
              numero_carteirinha: c.numero_carteirinha || null,
              principal: !!c.principal,
            })),
          });
        }
      }

      return tx.paciente.update({
        where: { id: id },
        data: {
          ...(name !== undefined ? { nome: name } : {}),
          ...(cpf !== undefined ? { cpf } : {}),
          ...(birthDate !== undefined ? { nascimento: new Date(birthDate) } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(phone !== undefined ? { telefone: phone } : {}),
          ...(address !== undefined ? { endereco: address } : {}),
          ...(sexo !== undefined ? { sexo } : {}),
          ...(cep !== undefined ? { cep: cep || null } : {}),
          ...(logradouro !== undefined ? { logradouro: logradouro || null } : {}),
          ...(numero !== undefined ? { numero: numero || null } : {}),
          ...(complemento !== undefined ? { complemento: complemento || null } : {}),
          ...(bairro !== undefined ? { bairro: bairro || null } : {}),
          ...(cidade !== undefined ? { cidade: cidade || null } : {}),
          ...(estado !== undefined ? { estado: estado || null } : {}),
          ...(escolaridade !== undefined ? { escolaridade: escolaridade || null } : {}),
          ...(estado_civil !== undefined ? { estado_civil: estado_civil || null } : {}),
          ...(responsaveis !== undefined
            ? {
                responsavel_financeiro: responsavelLegado.nome ?? null,
                contato_emergencia: responsavelLegado.telefone ?? null,
              }
            : {
                ...(guardianName !== undefined ? { responsavel_financeiro: guardianName } : {}),
                ...(guardianPhone !== undefined ? { contato_emergencia: guardianPhone } : {}),
              }),
          ...(healthInsurance !== undefined
            ? { plano_saude: healthInsurance === "particular" ? null : healthInsurance }
            : {}),
          ...(convenios !== undefined
            ? { convenioId: convenioLegado.convenioId, matricula: convenioLegado.matricula ?? null }
            : {
                ...(convenioId !== undefined ? { convenioId: isValidUuid(convenioId) ? convenioId : null } : {}),
                ...(healthInsuranceNumber !== undefined ? { matricula: healthInsuranceNumber } : {}),
              }),
          ...(profissionalId !== undefined ? { profissionalId: profissionalId || null } : {}),
          // Atualiza filialId apenas se enviado explicitamente
          ...(filialIdBody !== undefined ? { filialId: filialIdBody || null } : {}),
        },
        include: {
          convenio: { select: { id: true, razao_social: true, nome_fantasia: true } },
          profissional: { select: { id: true, nome: true, especialidade: true } },
          responsaveis: true,
          convenios: { include: { convenio: { select: { id: true, razao_social: true, nome_fantasia: true } } } },
        },
      });
    });

    console.log(`✅ Paciente "${updatedPatient.nome}" atualizado com sucesso`);

    // Converter para formato do frontend
    const patientFormatted = {
      id: updatedPatient.id,
      name: updatedPatient.nome,
      cpf: updatedPatient.cpf || "",
      birthDate: updatedPatient.nascimento.toISOString(),
      email: updatedPatient.email,
      phone: updatedPatient.telefone,
      address: updatedPatient.endereco,
      sexo: updatedPatient.sexo,
      cep: updatedPatient.cep,
      logradouro: updatedPatient.logradouro,
      numero: updatedPatient.numero,
      complemento: updatedPatient.complemento,
      bairro: updatedPatient.bairro,
      cidade: updatedPatient.cidade,
      estado: updatedPatient.estado,
      escolaridade: updatedPatient.escolaridade,
      estado_civil: updatedPatient.estado_civil,
      guardianName: updatedPatient.responsavel_financeiro,
      guardianPhone: updatedPatient.contato_emergencia,
      healthInsurance: updatedPatient.plano_saude,
      convenioId: updatedPatient.convenioId ?? null,
      convenio: updatedPatient.convenio ?? null,
      healthInsuranceNumber: updatedPatient.matricula,
      profissionalId: updatedPatient.profissionalId ?? null,
      profissional: updatedPatient.profissional
        ? { id: updatedPatient.profissional.id, nome: updatedPatient.profissional.nome, especialidade: updatedPatient.profissional.especialidade }
        : null,
      responsaveis: updatedPatient.responsaveis,
      convenios: updatedPatient.convenios,
      createdAt: updatedPatient.createdAt.toISOString(),
      updatedAt: updatedPatient.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: patientFormatted,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar paciente:", error);

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

// API para deletar paciente (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ API Pacientes - Deletando paciente com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error("❌ API Pacientes DELETE - Falha na autenticação");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não autenticado",
          details: "Token inválido ou Sistema 1 não está respondendo",
        },
        { status: 401 }
      );
    }

    if (!user.tenant || !user.tenant.id) {
      return NextResponse.json(
        { success: false, error: "Usuário não está associado a uma clínica" },
        { status: 403 }
      );
    }

    // Verificar permissão
    if (!await hasPermission(user, "delete_patients")) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para deletar pacientes" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID do paciente é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se o paciente existe e pertence à clínica do usuário
    const existingPatient = await prisma.paciente.findFirst({
      where: {
        id: id,
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

    console.log(
      `🗑️ Desativando paciente "${existingPatient.nome}" na clínica "${user.tenant.name}"`
    );

    // Soft delete - apenas marcar como inativo
    await prisma.paciente.update({
      where: { id: id },
      data: { ativo: false },
    });

    console.log(`✅ Paciente "${existingPatient.nome}" desativado com sucesso`);

    return NextResponse.json({
      success: true,
      message: "Paciente removido com sucesso",
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao deletar paciente:", error);

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
