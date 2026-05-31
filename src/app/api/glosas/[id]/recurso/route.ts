import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { Prisma } from "@prisma/client";

interface RouteParams { params: Promise<{ id: string }> }

type AcaoRecurso = "interpor" | "recuperada" | "parcial" | "negada" | "acatar";

const TRANSICOES: Record<AcaoRecurso, string[]> = {
  interpor:    ["PENDENTE"],
  recuperada:  ["EM_RECURSO"],
  parcial:     ["EM_RECURSO"],
  negada:      ["EM_RECURSO"],
  acatar:      ["PENDENTE"],
};

const STATUS_DESTINO: Record<AcaoRecurso, string> = {
  interpor:   "EM_RECURSO",
  recuperada: "RECUPERADA",
  parcial:    "PARCIAL",
  negada:     "NEGADA",
  acatar:     "ACATADA",
};

const TITULO_ACAO: Record<AcaoRecurso, string> = {
  interpor:   "Recurso interposto",
  recuperada: "Glosa recuperada integralmente",
  parcial:    "Glosa parcialmente recuperada",
  negada:     "Recurso negado",
  acatar:     "Glosa acatada",
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: "Sem tenant" }, { status: 403 });
    if (!await hasPermission(user, "edit_convenios"))
      return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });

    const { id } = await params;
    const glosa = await prisma.glosa.findFirst({
      where: { id, tenantId: user.tenant.id },
      select: { id: true, status: true, valor_glosado: true },
    });
    if (!glosa) return NextResponse.json({ success: false, error: "Glosa não encontrada" }, { status: 404 });

    const body = await request.json() as {
      acao: AcaoRecurso;
      valor_recuperado?: number;
      descricao?: string;
    };
    const { acao, valor_recuperado, descricao } = body;

    const acoesValidas: AcaoRecurso[] = ["interpor", "recuperada", "parcial", "negada", "acatar"];
    if (!acao || !acoesValidas.includes(acao))
      return NextResponse.json({ success: false, error: "Ação inválida" }, { status: 400 });

    const statusPermitidos = TRANSICOES[acao];
    if (!statusPermitidos.includes(glosa.status))
      return NextResponse.json(
        { success: false, error: `Ação "${acao}" não permitida para status "${glosa.status}"` },
        { status: 422 }
      );

    const now = new Date();
    const statusNovo = STATUS_DESTINO[acao] as Prisma.GlosaUpdateInput["status"];

    const updateData: Prisma.GlosaUpdateInput = { status: statusNovo };
    if (acao === "interpor") updateData.data_recurso = now;
    if (acao === "recuperada") {
      updateData.valor_recuperado = Number(glosa.valor_glosado);
      updateData.data_resolucao = now;
    }
    if (acao === "parcial") {
      if (valor_recuperado === undefined)
        return NextResponse.json({ success: false, error: "valor_recuperado obrigatório para recuperação parcial" }, { status: 400 });
      updateData.valor_recuperado = valor_recuperado;
      updateData.data_resolucao = now;
    }
    if (acao === "negada") {
      updateData.valor_recuperado = 0;
      updateData.data_resolucao = now;
    }
    if (acao === "acatar") updateData.data_resolucao = now;

    const updated = await prisma.glosa.update({ where: { id }, data: updateData });

    await prisma.glosaHistorico.create({
      data: {
        glosaId: id,
        tenantId: user.tenant.id,
        status_anterior: glosa.status as Prisma.GlosaHistoricoCreateInput["status_anterior"],
        status_novo: statusNovo as Prisma.GlosaHistoricoCreateInput["status_novo"],
        titulo: TITULO_ACAO[acao],
        descricao: descricao || TITULO_ACAO[acao],
        usuario_nome: user.name || user.email,
        usuario_id: user.id,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Erro ao processar recurso:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
