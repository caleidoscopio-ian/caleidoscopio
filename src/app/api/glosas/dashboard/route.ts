import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { format, subMonths } from "date-fns";
import {
  inicioDoDia,
  fimDoDia,
  parseInicioPeriodo,
  parseFimPeriodo,
  partesNoFuso,
  inicioDoMesEm,
  fimDoMesEm,
  mesesAtras,
} from "@/lib/datas-fuso";
import type { GlosaDashboard } from "@/types/glosa";

function toNum(v: unknown): number { return Number(v ?? 0); }

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

    // O cliente manda ISO completo; o default é calculado no fuso da clínica
    const dataInicio = dataInicioParam
      ? parseInicioPeriodo(dataInicioParam)
      : inicioDoDia(subMonths(new Date(), 3));
    const dataFim = dataFimParam ? parseFimPeriodo(dataFimParam) : fimDoDia();

    const where = {
      tenantId: user.tenant.id,
      data_glosa: { gte: dataInicio, lte: dataFim },
    };

    const glosas = await prisma.glosa.findMany({
      where,
      select: {
        status: true,
        categoria: true,
        convenioId: true,
        valor_glosado: true,
        valor_recuperado: true,
        data_glosa: true,
        convenio: { select: { razao_social: true, nome_fantasia: true } },
      },
    });

    // Resumo
    let valorGlosado = 0, valorRecuperado = 0, valorEmRecurso = 0, pendentes = 0;
    let resolvidoGlosado = 0, resolvidoRecuperado = 0;
    for (const g of glosas) {
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

    // Por categoria
    const catMap = new Map<string, { total: number; valor: number }>();
    for (const g of glosas) {
      const e = catMap.get(g.categoria) ?? { total: 0, valor: 0 };
      e.total++;
      e.valor += toNum(g.valor_glosado);
      catMap.set(g.categoria, e);
    }

    // Por convênio
    const convMap = new Map<string, { nome: string; total: number; valor: number }>();
    for (const g of glosas) {
      if (!g.convenioId) continue;
      const nome = g.convenio?.nome_fantasia || g.convenio?.razao_social || g.convenioId;
      const e = convMap.get(g.convenioId) ?? { nome, total: 0, valor: 0 };
      e.total++;
      e.valor += toNum(g.valor_glosado);
      convMap.set(g.convenioId, e);
    }

    // Por status
    const statusMap = new Map<string, { total: number; valor: number }>();
    for (const g of glosas) {
      const e = statusMap.get(g.status) ?? { total: 0, valor: 0 };
      e.total++;
      e.valor += toNum(g.valor_glosado);
      statusMap.set(g.status, e);
    }

    // Evolução mensal (últimos 6 meses)
    const evolucao: Array<{ mes: string; glosado: number; recuperado: number }> = [];
    const hojeNaClinica = partesNoFuso(new Date());
    for (let i = 5; i >= 0; i--) {
      const { ano, mes } = mesesAtras(hojeNaClinica.ano, hojeNaClinica.mes, i);
      const mesInicio = inicioDoMesEm(ano, mes);
      const mesFim = fimDoMesEm(ano, mes);
      // Data local só para o rótulo — o mês já veio resolvido no fuso da clínica
      const mesRef = new Date(ano, mes - 1, 1);
      const mesGlosas = glosas.filter(
        (g) => g.data_glosa >= mesInicio && g.data_glosa <= mesFim
      );
      const glosadoMes = mesGlosas.reduce((s, g) => s + toNum(g.valor_glosado), 0);
      const recuperadoMes = mesGlosas
        .filter((g) => g.status === "RECUPERADA" || g.status === "PARCIAL")
        .reduce((s, g) => s + toNum(g.valor_recuperado), 0);
      evolucao.push({ mes: format(mesRef, "MMM/yy"), glosado: glosadoMes, recuperado: recuperadoMes });
    }

    const dashboard: GlosaDashboard = {
      resumo: {
        total_glosas: glosas.length,
        valor_glosado_total: valorGlosado,
        valor_recuperado_total: valorRecuperado,
        valor_em_recurso: valorEmRecurso,
        pendentes,
        taxa_recuperacao: resolvidoGlosado > 0 ? resolvidoRecuperado / resolvidoGlosado : 0,
        taxa_glosa: 0, // calculado no GET principal
      },
      por_categoria: [...catMap.entries()].map(([cat, v]) => ({
        categoria: cat as GlosaDashboard["por_categoria"][0]["categoria"],
        total: v.total,
        valor: v.valor,
      })),
      por_convenio: [...convMap.entries()].map(([cId, v]) => ({
        convenioId: cId,
        nome: v.nome,
        total: v.total,
        valor: v.valor,
      })).sort((a, b) => b.valor - a.valor),
      por_status: [...statusMap.entries()].map(([st, v]) => ({
        status: st as GlosaDashboard["por_status"][0]["status"],
        total: v.total,
        valor: v.valor,
      })),
      evolucao_mensal: evolucao,
    };

    return NextResponse.json({ success: true, data: dashboard });
  } catch (error) {
    console.error("Erro ao buscar dashboard de glosas:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
