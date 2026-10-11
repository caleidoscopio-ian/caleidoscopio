// Filiais em que um profissional pode ser agendado (Módulo 26, Fase 1).
//
// É a resposta para o segundo campo do formulário de agendamento:
//
//   profissional → FILIAL → sala
//
// A lista é a interseção de dois escopos:
//
//   filiais da GRADE do profissional   (onde e quando ele atende)
//   ∩ filiais do USUÁRIO logado        (onde quem está marcando pode operar)
//
// Por que a grade e não `ProfissionalFilial`: a grade já está preenchida e é
// mais precisa — diz onde E quando. `ProfissionalFilial` existe para o vínculo
// da pessoa (inclusive administrativa, que não tem grade) e entra aqui pelo
// lado do usuário logado, em `escopoFilialDoUsuario`.
//
// Bloco de grade com `filialId = null` significa "qualquer filial": nesse caso
// todas as unidades do tenant entram.
//
// A rota NÃO esconde a filial sem sala cadastrada. Ela devolve `temSalaAtiva:
// false`, e a tela explica o que falta — esconder deixaria a clínica procurando
// uma unidade que existe e não aparece.
//
// Profissional sem grade nenhuma recebe lista VAZIA, de propósito: cadastro
// incompleto não libera a agenda. `diagnostico.temGrade` faz a tela dizer o que
// configurar.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission, isAdminUser } from "@/lib/auth/server";
import { escopoFilialDoUsuario } from "@/lib/filial-pessoa";
import { registrarErroApi } from "@/lib/erro-prisma";

export interface FilialDoProfissional {
  id: string;
  nome: string;
  cor: string | null;
  /** quantos blocos de grade o profissional tem nesta filial */
  blocosNaGrade: number;
  /** a grade dele aqui vale para qualquer filial (bloco com filialId nulo) */
  viaGradeCoringa: boolean;
  /** false = unidade sem sala ativa; o agendamento não conclui */
  temSalaAtiva: boolean;
  salasAtivas: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: profissionalId } = await params;

  try {
    const user = await getAuthenticatedUser(request);
    if (!user)
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    if (!user.tenant?.id)
      return NextResponse.json({ success: false, error: "Sem tenant" }, { status: 403 });
    if (!(await hasPermission(user, "view_schedule")))
      return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });

    const tenantId = user.tenant.id;

    const profissional = await prisma.profissional.findFirst({
      where: { id: profissionalId, tenantId },
      select: { id: true, nome: true },
    });
    if (!profissional)
      return NextResponse.json(
        { success: false, error: "Profissional não encontrado" },
        { status: 404 }
      );

    const [filiais, grades, salas, escopo] = await Promise.all([
      prisma.filial.findMany({
        where: { tenantId, ativo: true },
        select: { id: true, nome: true, cor: true },
        orderBy: { nome: "asc" },
      }),
      prisma.gradeAtendimento.findMany({
        where: { tenantId, profissionalId, ativo: true },
        select: { filialId: true },
      }),
      prisma.sala.groupBy({
        by: ["filialId"],
        where: { tenantId, ativo: true },
        _count: { id: true },
      }),
      escopoFilialDoUsuario(tenantId, user.id, isAdminUser(user)),
    ]);

    const blocosPorFilial = new Map<string, number>();
    let blocosCoringa = 0;
    for (const g of grades) {
      if (g.filialId === null) blocosCoringa++;
      else blocosPorFilial.set(g.filialId, (blocosPorFilial.get(g.filialId) ?? 0) + 1);
    }

    const salasPorFilial = new Map<string, number>();
    for (const s of salas) {
      if (s.filialId) salasPorFilial.set(s.filialId, s._count.id);
    }

    // POLÍTICA (decidida em 10/10/2026): cadastro incompleto NÃO libera a agenda.
    // Profissional sem grade configurada não pode ser agendado até a grade
    // existir — devolver "todas as filiais" nesse caso abriria a agenda inteira
    // de quem ainda está sendo cadastrado, que é o oposto do que a grade faz.
    //
    // O custo medido é baixo: dos profissionais que aparecem no dropdown de
    // agendamento (`atende=true`), apenas 1 de 20 está sem grade.
    const data: FilialDoProfissional[] = filiais
      .filter((f) => {
        // dentro do que o usuário logado pode operar
        if (escopo.restrito && !escopo.filialIds.includes(f.id)) return false;
        // precisa estar na grade (ou haver bloco coringa)
        return blocosPorFilial.has(f.id) || blocosCoringa > 0;
      })
      .map((f) => ({
        id: f.id,
        nome: f.nome,
        cor: f.cor,
        blocosNaGrade: blocosPorFilial.get(f.id) ?? 0,
        viaGradeCoringa: !blocosPorFilial.has(f.id) && blocosCoringa > 0,
        temSalaAtiva: (salasPorFilial.get(f.id) ?? 0) > 0,
        salasAtivas: salasPorFilial.get(f.id) ?? 0,
      }));

    // Diagnóstico para a tela explicar o vazio: a diferença entre "o
    // profissional não tem grade em lugar nenhum" e "tem, mas não onde você
    // opera" muda completamente o que a clínica precisa fazer.
    const filiaisNaGradeTotal = filiais.filter(
      (f) => blocosPorFilial.has(f.id) || blocosCoringa > 0
    );

    return NextResponse.json({
      success: true,
      data,
      diagnostico: {
        profissionalNome: profissional.nome,
        temGrade: grades.length > 0,
        filiaisNaGrade: filiaisNaGradeTotal.map((f) => f.nome),
        usuarioRestrito: escopo.restrito,
        // nomes das unidades que a grade oferece mas o usuário não pode operar
        foraDoEscopoDoUsuario: escopo.restrito
          ? filiaisNaGradeTotal.filter((f) => !escopo.filialIds.includes(f.id)).map((f) => f.nome)
          : [],
      },
    });
  } catch (error) {
    const { ref, classificacao } = registrarErroApi(
      {
        rota: "/api/terapeutas/[id]/filiais",
        acao: "GET",
        tenantId: undefined,
      },
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
