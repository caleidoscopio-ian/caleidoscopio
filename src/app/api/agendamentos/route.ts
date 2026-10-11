/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission, isAdminUser } from "@/lib/auth/server";
import { StatusAgendamento } from "@/types/agendamento";
import { calcularPrecoProcedimento } from "@/lib/preco-procedimento";

const normalizarValorParticular = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
import { registrarErroApi } from "@/lib/erro-prisma";
import { montarCarimboCriacao } from "@/lib/carimbo-agendamento";
import { escopoFilialDoUsuario, intersecaoFilial } from "@/lib/filial-pessoa";
import { validarFilialDaSala } from "@/lib/validar-filial-agendamento";
import { avisosDoAgendamento } from "@/lib/avisos-agendamento";

// GET - Listar agendamentos com filtros
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API Agendamentos - Iniciando busca com autenticação...");

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error("❌ API Agendamentos - Falha na autenticação");
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
      console.error("❌ API Agendamentos - Usuário sem tenant associado");
      return NextResponse.json(
        {
          success: false,
          error: "Usuário não está associado a uma clínica",
        },
        { status: 403 }
      );
    }

    // Terapeutas e Admins podem ver agendamentos
    if (!await hasPermission(user, "view_patients")) {
      console.error(
        `❌ API Agendamentos - Permissão negada para role: ${user.role}`
      );
      return NextResponse.json(
        {
          success: false,
          error: "Sem permissão para visualizar agendamentos",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Filtros
    const profissionalId = searchParams.get("profissionalId");
    const pacienteId = searchParams.get("pacienteId");
    const status = searchParams.get("status");
    const data_inicio = searchParams.get("data_inicio");
    const data_fim = searchParams.get("data_fim");
    const sala = searchParams.get("sala");

    // 🔒 CRÍTICO: Se não for admin, terapeuta só vê seus próprios agendamentos
    const isAdmin = isAdminUser(user);
    const filialIdParam = searchParams.get("filialId");

    // Módulo 26, Fase 3: a filial do agendamento é um CAMPO dele, não mais algo
    // derivado do perfil do profissional.
    //
    // A derivação antiga (`resolverProfissionalIdsDaFilial`) respondia "quais
    // profissionais pertencem a esta filial", que é outra pergunta. Como os 4
    // profissionais que atendem têm todos perfil em Bragança mas trabalham em
    // três unidades, o filtro dizia que 944 de 945 agendamentos eram de Bragança
    // enquanto a sala dizia 605/286/54.
    //
    // O escopo do usuário entra pela interseção: quem está vinculado a uma ou
    // mais unidades só vê as suas, qualquer que seja o parâmetro recebido.
    const escopoFilial = await escopoFilialDoUsuario(user.tenant.id, user.id, isAdmin);
    const filiaisVisiveis = intersecaoFilial(
      escopoFilial,
      filialIdParam ? [filialIdParam] : null
    );

    // Construir query com filtros e isolamento multi-tenant
    const where: any = {
      // 🔒 CRÍTICO: Filtrar por tenant através do paciente
      paciente: {
        tenantId: user.tenant.id,
        ativo: true,
      },
      // 🔒 CRÍTICO: Filtrar por tenant através do profissional
      profissional: {
        tenantId: user.tenant.id,
        ativo: true,
      },
      ...(filiaisVisiveis ? { filialId: { in: filiaisVisiveis } } : {}),
    };


    // Quem pode ver a agenda dos OUTROS profissionais?
    //
    // Antes o portão era `isAdmin`, o que confundia dois conceitos: ser
    // administrador e poder ver a agenda da clínica. O efeito era que uma
    // secretária não-admin abria a agenda e via VAZIO — enquanto o check-in,
    // que nunca teve essa restrição, mostrava a recepção inteira. As duas telas
    // da recepção discordavam.
    //
    // Agora é permissão (`agenda` + `VIEW_ALL`), não cargo:
    //   terapeuta           → só a própria agenda
    //   recepção/coordenação → toda a agenda, dentro das filiais do vínculo
    //   admin                → tudo (MANAGE implica VIEW_ALL)
    //
    // A escolha é permissão e não `tipo_vinculo` porque um coordenador que
    // atende também precisa ver os outros — cargo não expressa isso.
    const podeVerTodas = await hasPermission(user, "view_all_schedules");

    if (!podeVerTodas) {
      const profissionalDoUsuario = await prisma.profissional.findFirst({
        where: {
          usuarioId: user.id,
          tenantId: user.tenant.id,
          ativo: true,
        },
        select: { id: true },
      });

      if (profissionalDoUsuario) {
        where.profissionalId = profissionalDoUsuario.id;
      } else {
        // Sem agenda própria e sem permissão de ver as outras: nada a mostrar.
        // Não é erro — é cadastro incompleto ou perfil sem acesso à agenda.
        return NextResponse.json([]);
      }
    } else if (profissionalId) {
      // Quem vê todas pode recortar por profissional
      where.profissionalId = profissionalId;
    }

    if (pacienteId) {
      where.pacienteId = pacienteId;
    }

    if (status) {
      where.status = status as StatusAgendamento;
    }

    if (sala) {
      where.sala = sala;
    }

    // Filtro de data
    if (data_inicio || data_fim) {
      where.data_hora = {};

      if (data_inicio) {
        where.data_hora.gte = new Date(data_inicio);
      }

      if (data_fim) {
        where.data_hora.lte = new Date(data_fim);
      }
    }

    console.log(
      `🔍 Buscando agendamentos para clínica: ${user.tenant.name} (${user.tenant.id})`
    );

    // Buscar agendamentos com relacionamentos
    const agendamentos = await prisma.agendamento.findMany({
      where,
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            foto: true,
            cor_agenda: true,
            telefone: true,
            convenioId: true,
            convenio: {
              select: { id: true, razao_social: true, nome_fantasia: true },
            },
          },
        },
        profissional: {
          select: {
            id: true,
            nome: true,
            especialidade: true,
            email: true,
          },
        },
        salaRelacao: {
          select: {
            id: true,
            nome: true,
            cor: true,
          },
        },
        procedimento: {
          select: {
            id: true,
            nome: true,
            codigo: true,
            cor: true,
            valor: true,
            valor_particular: true,
            duracao_padrao: true,
          },
        },
      },
      orderBy: {
        data_hora: "asc",
      },
    });

    // Calcular preço efetivo para cada agendamento (considerando convênio do paciente)
    // Otimização: buscar entradas de ConvenioTabela em batch
    const paresConvenioProc = new Set<string>();
    for (const ag of agendamentos) {
      const convenioId = ag.paciente?.convenioId;
      const procedimentoId = ag.procedimentoId;
      if (convenioId && procedimentoId) {
        paresConvenioProc.add(`${convenioId}|${procedimentoId}`);
      }
    }

    const tabelaMap = new Map<string, { procedimentoId: string | null; valor_convenio: unknown }>();
    if (paresConvenioProc.size > 0) {
      const convenioIds = Array.from(
        new Set(Array.from(paresConvenioProc).map((p) => p.split("|")[0]))
      );
      const procIds = Array.from(
        new Set(Array.from(paresConvenioProc).map((p) => p.split("|")[1]))
      );
      const entradas = await prisma.convenioTabela.findMany({
        where: {
          convenioId: { in: convenioIds },
          procedimentoId: { in: procIds },
        },
        select: { convenioId: true, procedimentoId: true, valor_convenio: true },
      });
      for (const e of entradas) {
        tabelaMap.set(`${e.convenioId}|${e.procedimentoId}`, {
          procedimentoId: e.procedimentoId,
          valor_convenio: e.valor_convenio,
        });
      }
    }

    const agendamentosComPreco = agendamentos.map((ag) => {
      const convenioId = ag.paciente?.convenioId ?? null;
      const procedimentoId = ag.procedimentoId;
      const entrada =
        convenioId && procedimentoId
          ? tabelaMap.get(`${convenioId}|${procedimentoId}`)
          : null;
      const preco = calcularPrecoProcedimento({
        procedimentoId,
        procedimento: ag.procedimento
          ? {
              valor: ag.procedimento.valor as unknown as number | null,
              valor_particular: ag.procedimento.valor_particular as unknown as number | null,
            }
          : null,
        temConvenio: !!convenioId,
        tabelaConvenio: entrada
          ? [{ procedimentoId: entrada.procedimentoId, valor_convenio: entrada.valor_convenio as unknown as number | null }]
          : null,
        valorParticular: ag.valor_particular as unknown as number | null,
      });
      return { ...ag, precoCalculado: preco };
    });

    console.log(
      `✅ Encontrados ${agendamentos.length} agendamentos para clínica "${user.tenant.name}"`
    );

    return NextResponse.json(agendamentosComPreco);
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/agendamentos", acao: "GET" }, error);

    if (error instanceof Error) {
      if (error.message === "Usuário não autenticado") {
        return NextResponse.json(
          { success: false, error: "Sessão expirada. Faça login novamente." },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: classificacao.mensagem ?? "Erro ao buscar agendamentos", details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}

// POST - Criar novo agendamento
export async function POST(request: NextRequest) {
  try {
    console.log(
      "📝 API Agendamentos - Criando novo agendamento com autenticação..."
    );

    // Autenticar usuário
    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.error("❌ API Agendamentos POST - Falha na autenticação");
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
        { success: false, error: "Sem permissão para criar agendamentos" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      pacienteId,
      profissionalId,
      data_hora,
      horario_fim,
      sala,
      procedimento,
      status = StatusAgendamento.AGENDADO,
      observacoes,
      valor_particular,
      // Módulo 26: unidade do atendimento, escolhida no formulário.
      // Ausente = derivada da sala pela validação.
      filialId,
    } = body;

    // Validações
    if (!pacienteId || !profissionalId || !data_hora || !horario_fim || !sala) {
      return NextResponse.json(
        { error: "Paciente, profissional, sala, horário de início e fim são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se paciente existe e pertence à clínica
    const paciente = await prisma.paciente.findFirst({
      where: {
        id: pacienteId,
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar tenant
        ativo: true,
      },
    });

    if (!paciente) {
      return NextResponse.json(
        { error: "Paciente não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Verificar se profissional existe e pertence à clínica
    const profissional = await prisma.profissional.findFirst({
      where: {
        id: profissionalId,
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Verificar tenant
        ativo: true,
      },
    });

    if (!profissional) {
      return NextResponse.json(
        { error: "Profissional não encontrado ou não pertence a esta clínica" },
        { status: 404 }
      );
    }

    // Verificar conflito de horário para o profissional
    const dataHora = new Date(data_hora);
    const dataFim = new Date(horario_fim);

    // Buscar agendamentos que possam conflitar
    const agendamentosExistentes = await prisma.agendamento.findMany({
      where: {
        profissionalId,
        status: {
          notIn: [StatusAgendamento.CANCELADO, StatusAgendamento.FALTOU],
        },
      },
      select: {
        id: true,
        data_hora: true,
        horario_fim: true,
      },
    });

    // Verificar sobreposição de intervalos
    const conflito = agendamentosExistentes.find((ag) => {
      const agInicio = new Date(ag.data_hora);
      const agFim = new Date(ag.horario_fim);

      // Dois intervalos se sobrepõem se:
      // (NovoInicio < ExistenteVim) E (NovoFim > ExistenteInicio)
      return dataHora < agFim && dataFim > agInicio;
    });

    if (conflito) {
      return NextResponse.json(
        {
          error:
            "Já existe um agendamento neste horário para este profissional",
        },
        { status: 409 }
      );
    }

    // Sala + filial: a validação confere que a sala existe, é do tenant, está
    // ativa, pertence à filial escolhida e que o usuário pode agendar nela.
    // Antes daqui só se conferia o tenant — e foi isso que permitiu 339 de 945
    // agendamentos com filial divergente (ver @/lib/validar-filial-agendamento).
    const escopo = await escopoFilialDoUsuario(user.tenant.id, user.id, isAdminUser(user));
    const validacao = await validarFilialDaSala({
      tenantId: user.tenant.id,
      salaId: sala,
      filialId: filialId ?? null,
      escopo,
    });

    if (!validacao.ok) {
      return NextResponse.json(
        { error: validacao.erro, details: validacao.detalhe },
        { status: validacao.status ?? 400 }
      );
    }

    const filialResolvida = validacao.filialId;


    // Verificar conflito de horário na sala
    const agendamentosSala = await prisma.agendamento.findMany({
      where: {
        salaId: sala,
        status: {
          notIn: [StatusAgendamento.CANCELADO, StatusAgendamento.FALTOU],
        },
      },
      select: {
        id: true,
        data_hora: true,
        horario_fim: true,
      },
    });

    // Verificar sobreposição de intervalos para sala
    const conflitoSala = agendamentosSala.find((ag) => {
      const agInicio = new Date(ag.data_hora);
      const agFim = new Date(ag.horario_fim);
      return dataHora < agFim && dataFim > agInicio;
    });

    if (conflitoSala) {
      return NextResponse.json(
        {
          error: "Sala já está ocupada neste horário",
        },
        { status: 409 }
      );
    }

    // Verificar procedimento se fornecido
    if (procedimento) {
      const procedimentoExistente = await prisma.procedimento.findFirst({
        where: {
          id: procedimento,
          tenantId: user.tenant.id,
          ativo: true,
        },
      });

      if (!procedimentoExistente) {
        return NextResponse.json(
          { error: "Procedimento não encontrado ou não pertence a esta clínica" },
          { status: 404 }
        );
      }
    }

    console.log(
      `📝 Criando agendamento para "${paciente.nome}" com "${profissional.nome}" na clínica "${user.tenant.name}"`
    );

    // Criar agendamento
    const agendamento = await prisma.agendamento.create({
      data: {
        pacienteId,
        profissionalId,
        data_hora: dataHora,
        horario_fim: dataFim,
        duracao_minutos: Math.round((dataFim.getTime() - dataHora.getTime()) / 60000), // Calcular para compatibilidade
        salaId: sala, // Obrigatório agora
        sala: sala, // Manter campo antigo por compatibilidade
        procedimentoId: procedimento || null,
        status,
        observacoes,
        valor_particular: normalizarValorParticular(valor_particular),
        // Congela filial e especialidade da competência. A filial vem validada
        // contra a sala, não derivada do perfil do profissional.
        ...(await montarCarimboCriacao(user.tenant.id, profissionalId, filialResolvida)),
      },
      include: {
        paciente: {
          select: {
            id: true,
            nome: true,
            foto: true,
            cor_agenda: true,
            telefone: true,
          },
        },
        profissional: {
          select: {
            id: true,
            nome: true,
            especialidade: true,
            email: true,
          },
        },
        salaRelacao: {
          select: {
            id: true,
            nome: true,
            cor: true,
          },
        },
        procedimento: {
          select: {
            id: true,
            nome: true,
            codigo: true,
            cor: true,
          },
        },
      },
    });

    console.log(
      `✅ Agendamento criado com sucesso para clínica "${user.tenant.name}"`
    );

    // Conferência de grade: AVISA, não bloqueia (ver @/lib/avisos-agendamento).
    // Fica depois do create de propósito — é diagnóstico, e não pode impedir o
    // agendamento de existir.
    const avisos = await avisosDoAgendamento({
      tenantId: user.tenant.id,
      profissionalId,
      filialId: filialResolvida,
      ocorrencias: [{ inicio: dataHora, fim: dataFim }],
    });

    return NextResponse.json(
      avisos.length > 0 ? { ...agendamento, avisos } : agendamento,
      { status: 201 }
    );
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/agendamentos", acao: "POST" }, error);

    if (error instanceof Error) {
      if (error.message === "Usuário não autenticado") {
        return NextResponse.json(
          { success: false, error: "Sessão expirada. Faça login novamente." },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: classificacao.mensagem ?? "Erro ao criar agendamento", details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
