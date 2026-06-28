import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";
import { parseDemonstrativo, TissParseError } from "@/lib/tiss";
import { conciliarGuias, mapearCategoriaGlosa, type AtendimentoIndexavel } from "@/lib/tiss/conciliacao";
import { Prisma } from "@prisma/client";

function toNum(v: unknown): number { return Number(v ?? 0); }

// GET — lista demonstrativos importados
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: "Sem tenant" }, { status: 403 });
    if (!await hasPermission(user, "view_convenios"))
      return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });

    const demonstrativos = await prisma.demonstrativoImportacao.findMany({
      where: { tenantId: user.tenant.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: demonstrativos.map((d) => ({
        id: d.id,
        nome_arquivo: d.nome_arquivo,
        tipo_demonstrativo: d.tipo_demonstrativo,
        numero_demonstrativo: d.numero_demonstrativo,
        operadora_nome: d.operadora_nome,
        data_emissao: d.data_emissao?.toISOString() ?? null,
        valor_informado_total: toNum(d.valor_informado_total),
        valor_liberado_total: toNum(d.valor_liberado_total),
        valor_glosa_total: toNum(d.valor_glosa_total),
        total_guias: d.total_guias,
        guias_conciliadas: d.guias_conciliadas,
        guias_nao_encontradas: d.guias_nao_encontradas,
        importado_por_nome: d.importado_por_nome,
        createdAt: d.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Erro ao listar demonstrativos:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}

// POST — upload + parse + conciliação + persistência
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: "Sem tenant" }, { status: 403 });
    if (!await hasPermission(user, "create_convenios"))
      return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get("file");
    const convenioId = formData.get("convenioId");

    if (!file || typeof file === "string")
      return NextResponse.json({ success: false, error: "Arquivo XML é obrigatório" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Parse TISS
    let demonstrativo;
    try {
      demonstrativo = parseDemonstrativo(buffer);
    } catch (e) {
      if (e instanceof TissParseError)
        return NextResponse.json({ success: false, error: e.message }, { status: 422 });
      throw e;
    }

    if (demonstrativo.guias.length === 0)
      return NextResponse.json({ success: false, error: "Nenhuma guia encontrada no demonstrativo" }, { status: 422 });

    // 2. Buscar atendimentos do tenant que tenham senha/guia (candidatos a match)
    const atendimentosDb = await prisma.agendamento.findMany({
      where: {
        paciente: { tenantId: user.tenant.id },
        OR: [
          { senha_autorizacao: { not: null } },
          { numero_guia: { not: null } },
        ],
      },
      select: { id: true, senha_autorizacao: true, numero_guia: true },
    });
    const atendimentos: AtendimentoIndexavel[] = atendimentosDb.map((a) => ({
      agendamentoId: a.id,
      senha: a.senha_autorizacao,
      numero_guia: a.numero_guia,
    }));

    // 3. Conciliar
    const conc = conciliarGuias(demonstrativo.guias, atendimentos);

    // 4. Idempotência: remover importação anterior do mesmo demonstrativo
    if (demonstrativo.numero_demonstrativo) {
      await prisma.demonstrativoImportacao.deleteMany({
        where: {
          tenantId: user.tenant.id,
          numero_demonstrativo: demonstrativo.numero_demonstrativo,
          tipo_demonstrativo: demonstrativo.tipo_demonstrativo,
        },
      });
    }

    // 5. Persistir importação + guias
    const importacao = await prisma.demonstrativoImportacao.create({
      data: {
        tenantId: user.tenant.id,
        convenioId: typeof convenioId === "string" && convenioId ? convenioId : null,
        nome_arquivo: file.name || "demonstrativo.xml",
        tipo_demonstrativo: demonstrativo.tipo_demonstrativo,
        numero_demonstrativo: demonstrativo.numero_demonstrativo,
        operadora_nome: demonstrativo.operadora_nome,
        registro_ans: demonstrativo.registro_ans,
        data_emissao: demonstrativo.data_emissao ? new Date(demonstrativo.data_emissao) : null,
        valor_informado_total: demonstrativo.valor_informado_total,
        valor_processado_total: demonstrativo.valor_processado_total,
        valor_liberado_total: demonstrativo.valor_liberado_total,
        valor_glosa_total: demonstrativo.valor_glosa_total,
        total_guias: conc.total_guias,
        guias_conciliadas: conc.guias_conciliadas,
        guias_nao_encontradas: conc.guias_nao_encontradas,
        importado_por: user.id,
        importado_por_nome: user.name || user.email,
        guias: {
          create: conc.guias.map((g) => ({
            tenantId: user.tenant!.id,
            agendamentoId: g.agendamentoId,
            numero_guia_prestador: g.numero_guia_prestador,
            numero_guia_operadora: g.numero_guia_operadora,
            senha: g.senha,
            numero_carteira: g.numero_carteira,
            data_realizacao: g.data_realizacao ? new Date(g.data_realizacao) : null,
            valor_informado: g.valor_informado,
            valor_processado: g.valor_processado,
            valor_liberado: g.valor_liberado,
            valor_glosa: g.valor_glosa,
            situacao: g.situacao,
            codigo_glosa: g.codigo_glosa,
            descricao_glosa: g.descricao_glosa,
            status_conciliacao: g.status_conciliacao as Prisma.DemonstrativoGuiaCreateInput["status_conciliacao"],
          })),
        },
      },
    });

    // 6. Auto-criar Glosa para guias conciliadas com glosa (dedup por agendamento)
    let glosasGeradas = 0;
    const dataGlosa = demonstrativo.data_emissao ? new Date(demonstrativo.data_emissao) : new Date();
    for (const g of conc.guias) {
      if (g.status_conciliacao !== "CONCILIADO_GLOSA" || !g.agendamentoId) continue;
      const jaExiste = await prisma.glosa.findFirst({
        where: { tenantId: user.tenant.id, agendamentoId: g.agendamentoId },
        select: { id: true },
      });
      if (jaExiste) continue;

      const ag = await prisma.agendamento.findUnique({
        where: { id: g.agendamentoId },
        select: { paciente: { select: { convenioId: true } } },
      });

      await prisma.glosa.create({
        data: {
          tenantId: user.tenant.id,
          agendamentoId: g.agendamentoId,
          convenioId: ag?.paciente?.convenioId ?? null,
          valor_cobrado: g.valor_informado > 0 ? g.valor_informado : g.valor_glosa,
          valor_glosado: g.valor_glosa,
          categoria: mapearCategoriaGlosa(g.codigo_glosa, g.descricao_glosa) as Prisma.GlosaCreateInput["categoria"],
          codigo_glosa: g.codigo_glosa,
          motivo: g.descricao_glosa || `Glosa importada do demonstrativo ${demonstrativo.numero_demonstrativo ?? ""}`.trim(),
          data_glosa: dataGlosa,
          status: "PENDENTE",
          observacoes: `Gerada automaticamente pela conciliação do demonstrativo ${demonstrativo.operadora_nome ?? ""}.`,
        },
      });

      await prisma.glosaHistorico.create({
        data: {
          glosaId: (await prisma.glosa.findFirstOrThrow({
            where: { tenantId: user.tenant.id, agendamentoId: g.agendamentoId },
            orderBy: { createdAt: "desc" }, select: { id: true },
          })).id,
          tenantId: user.tenant.id,
          status_anterior: null,
          status_novo: "PENDENTE",
          titulo: "Glosa importada (conciliação)",
          descricao: `Identificada na conciliação do demonstrativo ${demonstrativo.numero_demonstrativo ?? ""}.`,
          usuario_nome: user.name || user.email,
          usuario_id: user.id,
        },
      });
      glosasGeradas++;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: importacao.id,
        operadora_nome: demonstrativo.operadora_nome,
        tipo_demonstrativo: demonstrativo.tipo_demonstrativo,
        total_guias: conc.total_guias,
        guias_conciliadas: conc.guias_conciliadas,
        guias_com_glosa: conc.guias_com_glosa,
        guias_nao_encontradas: conc.guias_nao_encontradas,
        glosas_geradas: glosasGeradas,
        valor_glosa_total: demonstrativo.valor_glosa_total,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Erro ao importar demonstrativo:", error);
    return NextResponse.json({ success: false, error: "Erro interno ao processar o arquivo" }, { status: 500 });
  }
}
