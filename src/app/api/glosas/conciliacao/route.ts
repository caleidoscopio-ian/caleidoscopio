import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import type { ComparativoConciliacao } from "@/types/conciliacao";

function toNum(v: unknown): number { return Number(v ?? 0); }

// GET — comparativo agregado de todas as importações (faturado x liberado x glosado)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: "Sem tenant" }, { status: 403 });
    if (!await hasPermission(user, "view_convenios"))
      return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });

    const demonstrativos = await prisma.demonstrativoImportacao.findMany({
      where: { tenantId: user.tenant.id },
      select: {
        valor_informado_total: true,
        valor_liberado_total: true,
        valor_glosa_total: true,
        total_guias: true,
        guias_conciliadas: true,
        guias_nao_encontradas: true,
      },
    });

    const agg = demonstrativos.reduce(
      (acc, d) => ({
        informado: acc.informado + toNum(d.valor_informado_total),
        liberado: acc.liberado + toNum(d.valor_liberado_total),
        glosa: acc.glosa + toNum(d.valor_glosa_total),
        totalGuias: acc.totalGuias + d.total_guias,
        conciliadas: acc.conciliadas + d.guias_conciliadas,
        naoEncontradas: acc.naoEncontradas + d.guias_nao_encontradas,
      }),
      { informado: 0, liberado: 0, glosa: 0, totalGuias: 0, conciliadas: 0, naoEncontradas: 0 }
    );

    // Glosas geradas a partir de conciliação (têm observação padrão)
    const glosasGeradas = await prisma.glosa.count({
      where: {
        tenantId: user.tenant.id,
        observacoes: { contains: "conciliação do demonstrativo" },
      },
    });

    const comparativo: ComparativoConciliacao = {
      total_demonstrativos: demonstrativos.length,
      valor_informado_total: agg.informado,
      valor_liberado_total: agg.liberado,
      valor_glosa_total: agg.glosa,
      taxa_glosa: agg.informado > 0 ? agg.glosa / agg.informado : 0,
      total_guias: agg.totalGuias,
      guias_conciliadas: agg.conciliadas,
      guias_nao_encontradas: agg.naoEncontradas,
      glosas_geradas: glosasGeradas,
    };

    return NextResponse.json({ success: true, data: comparativo });
  } catch (error) {
    console.error("Erro no comparativo de conciliação:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
