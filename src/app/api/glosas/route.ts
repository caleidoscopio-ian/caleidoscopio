import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { calcularPrecoProcedimento } from "@/lib/preco-procedimento";
import { startOfDay, endOfDay } from "date-fns";
import type { Glosa, GlosaResumo } from "@/types/glosa";
import { Prisma } from "@prisma/client";

function toNum(v: unknown): number {
  return Number(v ?? 0);
}

function buildGlosa(g: {
  id: string; tenantId: string; agendamentoId: string; convenioId: string | null;
  valor_cobrado: unknown; valor_glosado: unknown; valor_recuperado: unknown | null;
  categoria: string; codigo_glosa: string | null; motivo: string; status: string;
  data_glosa: Date; data_recurso: Date | null; data_resolucao: Date | null;
  observacoes: string | null;
  agendamento: {
    data_hora: Date;
    paciente: { id: string; nome: string } | null;
    profissional: { id: string; nome: string } | null;
    procedimento: { id: string; nome: string; codigo: string | null } | null;
  };
  convenio: { id: string; razao_social: string; nome_fantasia: string | null } | null;
}): Glosa {
  return {
    id: g.id,
    tenantId: g.tenantId,
    agendamentoId: g.agendamentoId,
    data_atendimento: g.agendamento.data_hora.toISOString(),
    paciente: g.agendamento.paciente ?? { id: "", nome: "Desconhecido" },
    profissional: g.agendamento.profissional,
    procedimento: g.agendamento.procedimento,
    convenio: g.convenio
      ? { id: g.convenio.id, nome: g.convenio.nome_fantasia || g.convenio.razao_social }
      : null,
    valor_cobrado: toNum(g.valor_cobrado),
    valor_glosado: toNum(g.valor_glosado),
    valor_recuperado: g.valor_recuperado !== null ? toNum(g.valor_recuperado) : null,
    categoria: g.categoria as Glosa["categoria"],
    codigo_glosa: g.codigo_glosa,
    motivo: g.motivo,
    status: g.status as Glosa["status"],
    data_glosa: g.data_glosa.toISOString(),
    data_recurso: g.data_recurso?.toISOString() ?? null,
    data_resolucao: g.data_resolucao?.toISOString() ?? null,
    observacoes: g.observacoes,
  };
}

const INCLUDE = {
  agendamento: {
    select: {
      data_hora: true,
      paciente: { select: { id: true, nome: true } },
      profissional: { select: { id: true, nome: true } },
      procedimento: { select: { id: true, nome: true, codigo: true } },
    },
  },
  convenio: { select: { id: true, razao_social: true, nome_fantasia: true } },
} satisfies Prisma.GlosaInclude;

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: "Sem tenant" }, { status: 403 });
    if (!await hasPermission(user, "view_convenios"))
      return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const dataInicioParam = searchParams.get("dataInicio");
    const dataFimParam = searchParams.get("dataFim");
    const statusParam = searchParams.get("status");
    const categoriaParam = searchParams.get("categoria");
    const convenioIdParam = searchParams.get("convenioId");
    const buscaParam = searchParams.get("busca") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get("pageSize") ?? "50")));

    const where: Prisma.GlosaWhereInput = {
      tenantId: user.tenant.id,
      ...(dataInicioParam && dataFimParam ? {
        data_glosa: {
          gte: startOfDay(new Date(dataInicioParam)),
          lte: endOfDay(new Date(dataFimParam)),
        },
      } : {}),
      ...(statusParam ? { status: { in: statusParam.split(",") as Prisma.EnumStatusGlosaFilter["in"] } } : {}),
      ...(categoriaParam ? { categoria: categoriaParam as Prisma.EnumCategoriaGlosaFilter["equals"] } : {}),
      ...(convenioIdParam ? { convenioId: convenioIdParam } : {}),
      ...(buscaParam ? {
        agendamento: { paciente: { nome: { contains: buscaParam, mode: "insensitive" } } },
      } : {}),
    };

    const [total, glosas] = await Promise.all([
      prisma.glosa.count({ where }),
      prisma.glosa.findMany({
        where,
        include: INCLUDE,
        orderBy: { data_glosa: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // Resumo sobre todos (não só a página)
    const todas = await prisma.glosa.findMany({
      where,
      select: {
        status: true,
        valor_glosado: true,
        valor_recuperado: true,
        valor_cobrado: true,
      },
    });

    let valorGlosado = 0, valorRecuperado = 0, valorEmRecurso = 0, pendentes = 0;
    let resolvidoGlosado = 0, resolvidoRecuperado = 0;
    for (const g of todas) {
      const vg = toNum(g.valor_glosado);
      const vr = toNum(g.valor_recuperado);
      valorGlosado += vg;
      if (g.status === "EM_RECURSO") valorEmRecurso += vg;
      if (g.status === "PENDENTE") pendentes++;
      if (g.status === "RECUPERADA" || g.status === "PARCIAL" || g.status === "NEGADA") {
        resolvidoGlosado += vg;
        resolvidoRecuperado += vr;
        valorRecuperado += vr;
      }
    }

    // Taxa de glosa: glosado ÷ faturado (ATENDIDO no período com convenio)
    let valorFaturado = 0;
    if (dataInicioParam && dataFimParam) {
      const atendidos = await prisma.agendamento.findMany({
        where: {
          paciente: { tenantId: user.tenant.id },
          status: "ATENDIDO",
          data_hora: {
            gte: startOfDay(new Date(dataInicioParam)),
            lte: endOfDay(new Date(dataFimParam)),
          },
        },
        select: {
          procedimentoId: true,
          paciente: { select: { convenioId: true } },
          procedimento: { select: { valor: true, valor_particular: true } },
        },
      });

      const pares = new Set<string>();
      for (const ag of atendidos) {
        const cId = ag.paciente?.convenioId;
        const pId = ag.procedimentoId;
        if (cId && pId) pares.add(`${cId}|${pId}`);
      }
      const tabelaMap = new Map<string, unknown>();
      if (pares.size > 0) {
        const cIds = [...new Set([...pares].map((p) => p.split("|")[0]))];
        const pIds = [...new Set([...pares].map((p) => p.split("|")[1]))];
        const entradas = await prisma.convenioTabela.findMany({
          where: { convenioId: { in: cIds }, procedimentoId: { in: pIds } },
          select: { convenioId: true, procedimentoId: true, valor_convenio: true },
        });
        for (const e of entradas) tabelaMap.set(`${e.convenioId}|${e.procedimentoId}`, e.valor_convenio);
      }
      for (const ag of atendidos) {
        const cId = ag.paciente?.convenioId ?? null;
        const pId = ag.procedimentoId;
        const entrada = cId && pId ? tabelaMap.get(`${cId}|${pId}`) : null;
        const p = calcularPrecoProcedimento({
          procedimentoId: pId,
          procedimento: ag.procedimento
            ? { valor: ag.procedimento.valor as unknown as number | null, valor_particular: ag.procedimento.valor_particular as unknown as number | null }
            : null,
          temConvenio: !!cId,
          tabelaConvenio: entrada ? [{ procedimentoId: pId, valor_convenio: entrada as unknown as number | null }] : null,
        });
        if (p.valor !== null) valorFaturado += p.valor;
      }
    }

    const resumo: GlosaResumo = {
      total_glosas: total,
      valor_glosado_total: valorGlosado,
      valor_recuperado_total: valorRecuperado,
      valor_em_recurso: valorEmRecurso,
      pendentes,
      taxa_recuperacao: resolvidoGlosado > 0 ? resolvidoRecuperado / resolvidoGlosado : 0,
      taxa_glosa: valorFaturado > 0 ? valorGlosado / valorFaturado : 0,
    };

    return NextResponse.json({
      success: true,
      data: glosas.map(buildGlosa),
      total,
      page,
      pageSize,
      resumo,
      periodo: {
        inicio: dataInicioParam ? startOfDay(new Date(dataInicioParam)).toISOString() : "",
        fim: dataFimParam ? endOfDay(new Date(dataFimParam)).toISOString() : "",
      },
    });
  } catch (error) {
    console.error("Erro ao listar glosas:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: "Sem tenant" }, { status: 403 });
    if (!await hasPermission(user, "create_convenios"))
      return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });

    const body = await request.json() as {
      agendamentoId: string;
      valor_cobrado: number;
      valor_glosado: number;
      categoria: string;
      codigo_glosa?: string;
      motivo: string;
      data_glosa: string;
      observacoes?: string;
    };

    const { agendamentoId, valor_cobrado, valor_glosado, categoria, codigo_glosa, motivo, data_glosa, observacoes } = body;

    if (!agendamentoId || !valor_cobrado || !valor_glosado || !categoria || !motivo || !data_glosa)
      return NextResponse.json({ success: false, error: "Campos obrigatórios ausentes" }, { status: 400 });

    // Verificar que o agendamento pertence ao tenant
    const agendamento = await prisma.agendamento.findFirst({
      where: { id: agendamentoId, paciente: { tenantId: user.tenant.id } },
      select: { id: true, paciente: { select: { convenioId: true } } },
    });
    if (!agendamento)
      return NextResponse.json({ success: false, error: "Agendamento não encontrado" }, { status: 404 });

    const glosa = await prisma.glosa.create({
      data: {
        tenantId: user.tenant.id,
        agendamentoId,
        convenioId: agendamento.paciente?.convenioId ?? null,
        valor_cobrado,
        valor_glosado,
        categoria: categoria as Prisma.GlosaCreateInput["categoria"],
        codigo_glosa: codigo_glosa ?? null,
        motivo,
        data_glosa: new Date(data_glosa),
        observacoes: observacoes ?? null,
      },
      include: INCLUDE,
    });

    await prisma.glosaHistorico.create({
      data: {
        glosaId: glosa.id,
        tenantId: user.tenant.id,
        status_anterior: null,
        status_novo: "PENDENTE",
        titulo: "Glosa registrada",
        descricao: `Glosa registrada: ${CATEGORIA_LABEL[categoria as keyof typeof CATEGORIA_LABEL] ?? categoria} — ${motivo.slice(0, 100)}`,
        usuario_nome: user.name || user.email,
        usuario_id: user.id,
      },
    });

    return NextResponse.json({ success: true, data: buildGlosa(glosa) }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar glosa:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

const CATEGORIA_LABEL: Record<string, string> = {
  ADMINISTRATIVA: "Administrativa", TECNICA: "Técnica", LINEAR: "Linear",
  DUPLICIDADE: "Duplicidade", TABELA: "Tabela/Valor", PRAZO: "Prazo",
  DOCUMENTACAO: "Documentação", OUTROS: "Outros",
};
