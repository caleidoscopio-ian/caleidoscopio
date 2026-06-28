import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import type { StatusConciliacao } from "@/types/conciliacao";

interface RouteParams { params: Promise<{ id: string }> }

function toNum(v: unknown): number { return Number(v ?? 0); }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: "Sem tenant" }, { status: 403 });
    if (!await hasPermission(user, "view_convenios"))
      return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });

    const { id } = await params;
    const dem = await prisma.demonstrativoImportacao.findFirst({
      where: { id, tenantId: user.tenant.id },
      include: {
        guias: {
          orderBy: [{ status_conciliacao: "asc" }, { valor_glosa: "desc" }],
          include: {
            agendamento: {
              select: {
                id: true, data_hora: true,
                paciente: { select: { nome: true } },
                procedimento: { select: { nome: true } },
              },
            },
          },
        },
      },
    });

    if (!dem) return NextResponse.json({ success: false, error: "Demonstrativo não encontrado" }, { status: 404 });

    return NextResponse.json({
      success: true,
      data: {
        id: dem.id,
        nome_arquivo: dem.nome_arquivo,
        tipo_demonstrativo: dem.tipo_demonstrativo,
        numero_demonstrativo: dem.numero_demonstrativo,
        operadora_nome: dem.operadora_nome,
        data_emissao: dem.data_emissao?.toISOString() ?? null,
        valor_informado_total: toNum(dem.valor_informado_total),
        valor_liberado_total: toNum(dem.valor_liberado_total),
        valor_glosa_total: toNum(dem.valor_glosa_total),
        total_guias: dem.total_guias,
        guias_conciliadas: dem.guias_conciliadas,
        guias_nao_encontradas: dem.guias_nao_encontradas,
        importado_por_nome: dem.importado_por_nome,
        createdAt: dem.createdAt.toISOString(),
        guias: dem.guias.map((g) => ({
          id: g.id,
          numero_guia_prestador: g.numero_guia_prestador,
          senha: g.senha,
          numero_carteira: g.numero_carteira,
          data_realizacao: g.data_realizacao?.toISOString() ?? null,
          valor_informado: toNum(g.valor_informado),
          valor_processado: toNum(g.valor_processado),
          valor_liberado: toNum(g.valor_liberado),
          valor_glosa: toNum(g.valor_glosa),
          codigo_glosa: g.codigo_glosa,
          descricao_glosa: g.descricao_glosa,
          status_conciliacao: g.status_conciliacao as StatusConciliacao,
          agendamento: g.agendamento
            ? {
                id: g.agendamento.id,
                data_hora: g.agendamento.data_hora.toISOString(),
                paciente: g.agendamento.paciente?.nome ?? "—",
                procedimento: g.agendamento.procedimento?.nome ?? null,
              }
            : null,
        })),
      },
    });
  } catch (error) {
    console.error("Erro ao buscar demonstrativo:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: "Sem tenant" }, { status: 403 });
    if (!await hasPermission(user, "delete_convenios"))
      return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });

    const { id } = await params;
    const dem = await prisma.demonstrativoImportacao.findFirst({
      where: { id, tenantId: user.tenant.id }, select: { id: true },
    });
    if (!dem) return NextResponse.json({ success: false, error: "Não encontrado" }, { status: 404 });

    await prisma.demonstrativoImportacao.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir demonstrativo:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
