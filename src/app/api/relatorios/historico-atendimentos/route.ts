import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { calcularPrecoProcedimento } from "@/lib/preco-procedimento";
import { startOfDay, endOfDay } from "date-fns";
import type { AtendimentoHistorico, HistoricoResumo } from "@/types/historico-atendimento";
import { Prisma } from "@prisma/client";

const STATUS_HISTORICO = ["ATENDIDO", "FALTOU", "CANCELADO"] as const;

function diffMin(a: Date | null, b: Date | null): number | null {
  if (!a || !b) return null;
  const d = Math.round((b.getTime() - a.getTime()) / 60000);
  return d >= 0 ? d : null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user)
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    if (!user.tenant?.id)
      return NextResponse.json({ success: false, error: "Sem tenant" }, { status: 403 });
    if (!await hasPermission(user, "view_reports"))
      return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const dataInicioParam = searchParams.get("dataInicio");
    const dataFimParam = searchParams.get("dataFim");

    if (!dataInicioParam || !dataFimParam)
      return NextResponse.json(
        { success: false, error: "dataInicio e dataFim são obrigatórios" },
        { status: 400 }
      );

    const dataInicio = startOfDay(new Date(dataInicioParam));
    const dataFim = endOfDay(new Date(dataFimParam));

    if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime()))
      return NextResponse.json({ success: false, error: "Datas inválidas" }, { status: 400 });

    const diffDias = (dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDias > 366)
      return NextResponse.json(
        { success: false, error: "Período máximo de 12 meses" },
        { status: 400 }
      );

    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes((user.role ?? "").toUpperCase());
    const filialIdParam = searchParams.get("filialId");
    const filialFiltro = !isAdmin ? (user.filialId ?? null) : (filialIdParam ?? null);

    // Filtros opcionais
    const statusParam = searchParams.get("status");
    const statusFiltro = statusParam
      ? statusParam.split(",").filter((s) => STATUS_HISTORICO.includes(s as typeof STATUS_HISTORICO[number]))
      : [...STATUS_HISTORICO];

    const profissionalId = searchParams.get("profissionalId");
    const pacienteBusca = searchParams.get("busca") ?? "";
    const convenioId = searchParams.get("convenioId");
    const procedimentoId = searchParams.get("procedimentoId");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") ?? "50")));

    const where: Prisma.agendamentoWhereInput = {
      paciente: {
        tenantId: user.tenant.id,
        ...(pacienteBusca ? { nome: { contains: pacienteBusca, mode: "insensitive" } } : {}),
        ...(convenioId ? { convenioId } : {}),
      },
      profissional: { tenantId: user.tenant.id },
      data_hora: { gte: dataInicio, lte: dataFim },
      status: { in: statusFiltro as Prisma.EnumStatusAgendamentoFilter["in"] },
      ...(profissionalId ? { profissionalId } : {}),
      ...(procedimentoId ? { procedimentoId } : {}),
      ...(filialFiltro ? { salaRelacao: { filialId: filialFiltro } } : {}),
    };

    const [total, agendamentos] = await Promise.all([
      prisma.agendamento.count({ where }),
      prisma.agendamento.findMany({
        where,
        include: {
          paciente: {
            select: {
              id: true, nome: true,
              convenioId: true,
              convenio: { select: { id: true, razao_social: true, nome_fantasia: true } },
            },
          },
          profissional: { select: { id: true, nome: true, especialidade: true } },
          procedimento: {
            select: { id: true, nome: true, codigo: true, valor: true, valor_particular: true },
          },
          salaRelacao: {
            select: { id: true, nome: true, filial: { select: { id: true, nome: true } } },
          },
        },
        orderBy: { data_hora: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // Batch ConvenioTabela para calcular preços
    const pares = new Set<string>();
    for (const ag of agendamentos) {
      const cId = ag.paciente?.convenioId;
      const pId = ag.procedimentoId;
      if (cId && pId) pares.add(`${cId}|${pId}`);
    }
    const tabelaMap = new Map<string, { procedimentoId: string | null; valor_convenio: unknown }>();
    if (pares.size > 0) {
      const convenioIds = [...new Set([...pares].map((p) => p.split("|")[0]))];
      const procIds = [...new Set([...pares].map((p) => p.split("|")[1]))];
      const entradas = await prisma.convenioTabela.findMany({
        where: { convenioId: { in: convenioIds }, procedimentoId: { in: procIds } },
        select: { convenioId: true, procedimentoId: true, valor_convenio: true },
      });
      for (const e of entradas) {
        tabelaMap.set(`${e.convenioId}|${e.procedimentoId}`, {
          procedimentoId: e.procedimentoId,
          valor_convenio: e.valor_convenio,
        });
      }
    }

    const data: AtendimentoHistorico[] = agendamentos.map((ag) => {
      const convenioId = ag.paciente?.convenioId ?? null;
      const entrada = convenioId && ag.procedimentoId
        ? tabelaMap.get(`${convenioId}|${ag.procedimentoId}`)
        : null;
      const preco = calcularPrecoProcedimento({
        procedimentoId: ag.procedimentoId,
        procedimento: ag.procedimento
          ? { valor: ag.procedimento.valor as unknown as number | null, valor_particular: ag.procedimento.valor_particular as unknown as number | null }
          : null,
        temConvenio: !!convenioId,
        tabelaConvenio: entrada
          ? [{ procedimentoId: entrada.procedimentoId, valor_convenio: entrada.valor_convenio as unknown as number | null }]
          : null,
      });

      const duracaoMin = Math.max(
        0,
        Math.round((ag.horario_fim.getTime() - ag.data_hora.getTime()) / 60000)
      );
      const convenioNome = ag.paciente?.convenio
        ? (ag.paciente.convenio.nome_fantasia || ag.paciente.convenio.razao_social)
        : null;

      return {
        id: ag.id,
        data_hora: ag.data_hora.toISOString(),
        horario_fim: ag.horario_fim.toISOString(),
        duracao_minutos: duracaoMin,
        status: ag.status as AtendimentoHistorico["status"],
        paciente: { id: ag.paciente!.id, nome: ag.paciente!.nome },
        profissional: {
          id: ag.profissional!.id,
          nome: ag.profissional!.nome,
          especialidade: ag.profissional!.especialidade,
        },
        procedimento: ag.procedimento
          ? { id: ag.procedimento.id, nome: ag.procedimento.nome, codigo: ag.procedimento.codigo }
          : null,
        convenio: convenioNome ? { id: convenioId!, nome: convenioNome } : null,
        valor: preco.valor,
        origem_valor: preco.origem,
        sala: ag.salaRelacao?.nome ?? null,
        filial: ag.salaRelacao?.filial?.nome ?? null,
        hora_chegada: ag.hora_chegada?.toISOString() ?? null,
        hora_inicio_real: ag.hora_inicio_real?.toISOString() ?? null,
        hora_fim_real: ag.hora_fim_real?.toISOString() ?? null,
        tempo_espera_min: diffMin(ag.hora_chegada, ag.hora_inicio_real),
        duracao_real_min: diffMin(ag.hora_inicio_real, ag.hora_fim_real),
        motivo_falta: ag.motivo_falta ?? null,
        observacoes: ag.observacoes ?? null,
      };
    });

    // Resumo sobre TODOS os registros filtrados (não só a página)
    const todosParaResumo = await prisma.agendamento.findMany({
      where,
      select: {
        status: true,
        procedimentoId: true,
        paciente: { select: { convenioId: true } },
        procedimento: { select: { valor: true, valor_particular: true } },
      },
    });

    let totalAtendimentos = 0;
    let valorTotal = 0;
    let faltas = 0;
    let cancelamentos = 0;

    for (const ag of todosParaResumo) {
      const s = ag.status as string;
      if (s === "ATENDIDO") {
        totalAtendimentos++;
        const convenioId = ag.paciente?.convenioId ?? null;
        const entrada2 = convenioId && ag.procedimentoId
          ? tabelaMap.get(`${convenioId}|${ag.procedimentoId}`)
          : null;
        const p = calcularPrecoProcedimento({
          procedimentoId: ag.procedimentoId,
          procedimento: ag.procedimento
            ? { valor: ag.procedimento.valor as unknown as number | null, valor_particular: ag.procedimento.valor_particular as unknown as number | null }
            : null,
          temConvenio: !!convenioId,
          tabelaConvenio: entrada2
            ? [{ procedimentoId: entrada2.procedimentoId, valor_convenio: entrada2.valor_convenio as unknown as number | null }]
            : null,
        });
        if (p.valor !== null) valorTotal += p.valor;
      } else if (s === "FALTOU") {
        faltas++;
      } else if (s === "CANCELADO") {
        cancelamentos++;
      }
    }

    const resumo: HistoricoResumo = {
      total_atendimentos: totalAtendimentos,
      valor_total: valorTotal,
      ticket_medio: totalAtendimentos > 0 ? valorTotal / totalAtendimentos : 0,
      faltas,
      cancelamentos,
      total_registros: total,
    };

    return NextResponse.json({
      success: true,
      data,
      total,
      page,
      pageSize,
      resumo,
      periodo: { inicio: dataInicio.toISOString(), fim: dataFim.toISOString() },
    });
  } catch (error) {
    console.error("Erro ao buscar histórico de atendimentos:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
