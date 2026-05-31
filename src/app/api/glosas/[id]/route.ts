import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { Prisma } from "@prisma/client";
import type { GlosaHistoricoItem } from "@/types/glosa";

interface RouteParams { params: Promise<{ id: string }> }

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
  historico: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.GlosaInclude;

function toNum(v: unknown): number { return Number(v ?? 0); }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    if (!await hasPermission(user, "view_convenios"))
      return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });

    const { id } = await params;
    const glosa = await prisma.glosa.findFirst({
      where: { id, tenantId: user.tenant!.id },
      include: INCLUDE,
    });
    if (!glosa) return NextResponse.json({ success: false, error: "Glosa não encontrada" }, { status: 404 });

    const historico: GlosaHistoricoItem[] = glosa.historico.map((h) => ({
      id: h.id,
      status_anterior: h.status_anterior as GlosaHistoricoItem["status_anterior"],
      status_novo: h.status_novo as GlosaHistoricoItem["status_novo"],
      titulo: h.titulo,
      descricao: h.descricao,
      usuario_nome: h.usuario_nome,
      createdAt: h.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        id: glosa.id,
        tenantId: glosa.tenantId,
        agendamentoId: glosa.agendamentoId,
        data_atendimento: glosa.agendamento.data_hora.toISOString(),
        paciente: glosa.agendamento.paciente ?? { id: "", nome: "Desconhecido" },
        profissional: glosa.agendamento.profissional,
        procedimento: glosa.agendamento.procedimento,
        convenio: glosa.convenio
          ? { id: glosa.convenio.id, nome: glosa.convenio.nome_fantasia || glosa.convenio.razao_social }
          : null,
        valor_cobrado: toNum(glosa.valor_cobrado),
        valor_glosado: toNum(glosa.valor_glosado),
        valor_recuperado: glosa.valor_recuperado !== null ? toNum(glosa.valor_recuperado) : null,
        categoria: glosa.categoria,
        codigo_glosa: glosa.codigo_glosa,
        motivo: glosa.motivo,
        status: glosa.status,
        data_glosa: glosa.data_glosa.toISOString(),
        data_recurso: glosa.data_recurso?.toISOString() ?? null,
        data_resolucao: glosa.data_resolucao?.toISOString() ?? null,
        observacoes: glosa.observacoes,
        historico,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar glosa:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    if (!await hasPermission(user, "edit_convenios"))
      return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });

    const { id } = await params;
    const glosa = await prisma.glosa.findFirst({ where: { id, tenantId: user.tenant!.id } });
    if (!glosa) return NextResponse.json({ success: false, error: "Glosa não encontrada" }, { status: 404 });

    const body = await request.json() as Partial<{
      valor_cobrado: number; valor_glosado: number; categoria: string;
      codigo_glosa: string; motivo: string; data_glosa: string; observacoes: string;
    }>;

    const updated = await prisma.glosa.update({
      where: { id },
      data: {
        ...(body.valor_cobrado !== undefined ? { valor_cobrado: body.valor_cobrado } : {}),
        ...(body.valor_glosado !== undefined ? { valor_glosado: body.valor_glosado } : {}),
        ...(body.categoria ? { categoria: body.categoria as Prisma.GlosaUpdateInput["categoria"] } : {}),
        ...(body.codigo_glosa !== undefined ? { codigo_glosa: body.codigo_glosa } : {}),
        ...(body.motivo ? { motivo: body.motivo } : {}),
        ...(body.data_glosa ? { data_glosa: new Date(body.data_glosa) } : {}),
        ...(body.observacoes !== undefined ? { observacoes: body.observacoes } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Erro ao atualizar glosa:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    if (!await hasPermission(user, "delete_convenios"))
      return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });

    const { id } = await params;
    const glosa = await prisma.glosa.findFirst({ where: { id, tenantId: user.tenant!.id } });
    if (!glosa) return NextResponse.json({ success: false, error: "Glosa não encontrada" }, { status: 404 });

    await prisma.glosa.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir glosa:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
