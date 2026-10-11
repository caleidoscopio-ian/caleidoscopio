// Opções dos dropdowns da barra de filtros da Central de Relatórios.
//
// Uma chamada em vez de quatro: a barra é compartilhada por todos os
// relatórios, então vale buscar filiais, profissionais, convênios,
// procedimentos e especialidades de uma vez, com a mesma forma de resposta.
//
// As especialidades vêm derivadas do cadastro do profissional pela MESMA regra
// usada pelo carimbo (`montarCarimboCriacao`): customizada ▸ texto legado. Se a
// lista do filtro fosse montada de outro jeito, filtrar por especialidade
// deixaria de casar com agrupar por especialidade.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission, isAdminUser } from "@/lib/auth/server";
import { registrarErroApi } from "@/lib/erro-prisma";
import { escopoFilialDoUsuario } from "@/lib/filial-pessoa";
import type { OpcoesRelatorio } from "@/types/relatorio";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user)
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    if (!user.tenant?.id)
      return NextResponse.json({ success: false, error: "Sem tenant" }, { status: 403 });
    if (!(await hasPermission(user, "view_reports")))
      return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });

    const tenantId = user.tenant.id;
    const isAdmin = isAdminUser(user);

    const [filiais, profissionais, convenios, procedimentos] = await Promise.all([
      prisma.filial.findMany({
        where: { tenantId, ativo: true },
        select: { id: true, nome: true },
        orderBy: { nome: "asc" },
      }),
      prisma.profissional.findMany({
        where: { tenantId, ativo: true },
        select: {
          id: true,
          nome: true,
          especialidade: true,
          especialidadeCustomizada: { select: { nome: true } },
        },
        orderBy: { nome: "asc" },
      }),
      prisma.convenio.findMany({
        where: { tenantId },
        select: { id: true, razao_social: true, nome_fantasia: true },
        orderBy: { razao_social: "asc" },
      }),
      prisma.procedimento.findMany({
        where: { tenantId, ativo: true },
        select: { id: true, nome: true, codigo: true },
        orderBy: { nome: "asc" },
      }),
    ]);

    const especialidades = [
      ...new Set(
        profissionais
          .map((p) => p.especialidadeCustomizada?.nome ?? p.especialidade ?? null)
          .filter((e): e is string => !!e && e.trim().length > 0)
      ),
    ].sort((a, b) => a.localeCompare(b, "pt-BR"));

    // Módulo 26: a pessoa pode operar em mais de uma unidade, então "não-admin"
    // deixou de significar "uma filial só". Quem tem duas PODE escolher entre
    // as duas; quem tem uma fica com ela travada; admin vê todas.
    const escopoFilial = await escopoFilialDoUsuario(tenantId, user.id, isAdmin);
    const filiaisPermitidas = escopoFilial.restrito
      ? filiais.filter((f) => escopoFilial.filialIds.includes(f.id))
      : filiais;
    const podeTrocarFilial = !escopoFilial.restrito || filiaisPermitidas.length > 1;
    const filialFixa = podeTrocarFilial ? null : (filiaisPermitidas[0]?.id ?? null);

    const data: OpcoesRelatorio = {
      filiais: filiaisPermitidas,
      profissionais: profissionais.map((p) => ({ id: p.id, nome: p.nome })),
      convenios: convenios.map((c) => ({
        id: c.id,
        nome: c.nome_fantasia || c.razao_social,
      })),
      procedimentos: procedimentos.map((p) => ({
        id: p.id,
        nome: p.codigo ? `${p.nome} (${p.codigo})` : p.nome,
      })),
      especialidades,
      podeTrocarFilial,
      filialFixa,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const { ref, classificacao } = registrarErroApi(
      { rota: "/api/relatorios/opcoes", acao: "GET", tenantId: undefined },
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? "Erro interno",
        details: classificacao.detalhe,
        ref,
      },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
