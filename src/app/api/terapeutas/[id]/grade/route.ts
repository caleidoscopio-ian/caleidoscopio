// Grade de atendimento de um profissional.
//
// O GET devolve, junto dos blocos, as FILIAIS que podem ser escolhidas em cada
// bloco — a interseção de:
//
//   vínculo do PROFISSIONAL   (ProfissionalFilial, ou UsuarioRole legado)
//   ∩ escopo do USUÁRIO logado (onde quem está configurando pode operar)
//
// Não é a lista de filiais da clínica. Oferecer todas permitia configurar a
// grade de alguém numa unidade onde ele não trabalha, e a filial da grade é o
// que depois alimenta o campo de filial do agendamento.
//
// Profissional sem vínculo nenhum (48 de 57 hoje) cai em "sem restrição" e
// recebe a lista inteira, com `profissionalRestrito: false` para a tela avisar
// que o vínculo está em branco. Esconder tudo deixaria o campo inútil para a
// maioria.
//
// Filial já usada num bloco existente entra na lista mesmo fora do vínculo
// (`foraDoVinculo: true`): há 2 blocos assim no banco, e sumir com a opção
// faria a tela perder silenciosamente a configuração ao salvar.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission, isAdminUser } from '@/lib/auth/server'
import {
  escopoFilialDoProfissional,
  escopoFilialDoUsuario,
  filialPermitida,
} from '@/lib/filial-pessoa'
import { Prisma } from '@prisma/client'
import { registrarErroApi } from "@/lib/erro-prisma";
import type { FilialDaGrade } from '@/types/ocupacao-profissional'


interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Sem tenant' }, { status: 403 })
    if (!await hasPermission(user, 'view_schedule'))
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { id: profissionalId } = await params

    const profissional = await prisma.profissional.findFirst({
      where: { id: profissionalId, tenantId: user.tenant.id },
      select: { id: true, nome: true },
    })
    if (!profissional)
      return NextResponse.json({ success: false, error: 'Profissional não encontrado' }, { status: 404 })

    const [grades, filiais, escopoProf, escopoUsuario] = await Promise.all([
      prisma.gradeAtendimento.findMany({
        where: { profissionalId, tenantId: user.tenant.id, ativo: true },
        select: { id: true, diaSemana: true, hora_inicio: true, hora_fim: true, filialId: true, ativo: true },
        orderBy: [{ diaSemana: 'asc' }, { hora_inicio: 'asc' }],
      }),
      prisma.filial.findMany({
        where: { tenantId: user.tenant.id, ativo: true },
        select: { id: true, nome: true },
        orderBy: { nome: 'asc' },
      }),
      escopoFilialDoProfissional(user.tenant.id, profissionalId),
      escopoFilialDoUsuario(user.tenant.id, user.id, isAdminUser(user)),
    ])

    const jaNaGrade = new Set(
      grades.map((g) => g.filialId).filter((f): f is string => f !== null)
    )

    const opcoes: FilialDaGrade[] = filiais
      .filter(
        (f) =>
          (filialPermitida(escopoProf, f.id) && filialPermitida(escopoUsuario, f.id)) ||
          jaNaGrade.has(f.id)
      )
      .map((f) => ({
        id: f.id,
        nome: f.nome,
        foraDoVinculo: !filialPermitida(escopoProf, f.id),
      }))

    return NextResponse.json({
      success: true,
      data: grades,
      filiais: opcoes,
      profissionalRestrito: escopoProf.restrito,
    })
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/terapeutas/[id]/grade", acao: "GET" }, error);return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? 'Erro interno', details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Sem tenant' }, { status: 403 })
    if (!await hasPermission(user, 'edit_schedule'))
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { id: profissionalId } = await params

    const profissional = await prisma.profissional.findFirst({
      where: { id: profissionalId, tenantId: user.tenant.id },
      select: { id: true },
    })
    if (!profissional)
      return NextResponse.json({ success: false, error: 'Profissional não encontrado' }, { status: 404 })

    const body = await request.json() as { blocos: Array<{ diaSemana: number; hora_inicio: string; hora_fim: string; filialId?: string | null }> }
    const { blocos } = body

    if (!Array.isArray(blocos))
      return NextResponse.json({ success: false, error: 'blocos deve ser um array' }, { status: 400 })

    // A mesma restrição que o GET aplica ao dropdown, conferida aqui: regra
    // validada só no cliente não é validada (um PUT direto passava qualquer
    // filialId, inclusive de OUTRA clínica — isso criava vínculo cross-tenant).
    const [filiaisDoTenant, gradeAtual, escopoProf, escopoUsuario] = await Promise.all([
      prisma.filial.findMany({
        where: { tenantId: user.tenant.id },
        select: { id: true, nome: true },
      }),
      prisma.gradeAtendimento.findMany({
        where: { profissionalId, tenantId: user.tenant.id },
        select: { filialId: true },
      }),
      escopoFilialDoProfissional(user.tenant.id, profissionalId),
      escopoFilialDoUsuario(user.tenant.id, user.id, isAdminUser(user)),
    ])

    const nomePorFilial = new Map(filiaisDoTenant.map((f) => [f.id, f.nome]))
    // Filial já configurada continua aceita mesmo fora do vínculo: senão salvar
    // a grade de quem está nessa situação passaria a falhar.
    const jaNaGrade = new Set(
      gradeAtual.map((g) => g.filialId).filter((f): f is string => f !== null)
    )

    // Validar cada bloco
    for (const bloco of blocos) {
      const { diaSemana, hora_inicio, hora_fim } = bloco
      if (typeof diaSemana !== 'number' || diaSemana < 0 || diaSemana > 6)
        return NextResponse.json({ success: false, error: 'diaSemana deve ser 0-6' }, { status: 400 })
      const reHora = /^\d{2}:\d{2}$/
      if (!reHora.test(hora_inicio) || !reHora.test(hora_fim))
        return NextResponse.json({ success: false, error: 'Formato de hora inválido (HH:MM)' }, { status: 400 })
      if (hora_fim <= hora_inicio)
        return NextResponse.json({ success: false, error: 'hora_fim deve ser maior que hora_inicio' }, { status: 400 })

      // filialId nulo = "qualquer filial", que é opção legítima
      const filialId = bloco.filialId ?? null
      if (filialId === null) continue

      if (!nomePorFilial.has(filialId))
        return NextResponse.json(
          { success: false, error: 'Filial informada não pertence a esta clínica' },
          { status: 400 }
        )
      if (jaNaGrade.has(filialId)) continue

      const nome = nomePorFilial.get(filialId)
      if (!filialPermitida(escopoProf, filialId))
        return NextResponse.json(
          { success: false, error: `O profissional não está vinculado à filial ${nome}` },
          { status: 400 }
        )
      if (!filialPermitida(escopoUsuario, filialId))
        return NextResponse.json(
          { success: false, error: `Você não pode configurar a grade na filial ${nome}` },
          { status: 400 }
        )
    }

    // Substituição total em transação
    const [, grades] = await prisma.$transaction([
      prisma.gradeAtendimento.deleteMany({
        where: { profissionalId, tenantId: user.tenant.id },
      }),
      prisma.gradeAtendimento.createManyAndReturn({
        data: blocos.map((b) => ({
          tenantId: user.tenant!.id,
          profissionalId,
          diaSemana: b.diaSemana,
          hora_inicio: b.hora_inicio,
          hora_fim: b.hora_fim,
          filialId: b.filialId ?? null,
          ativo: true,
        })) satisfies Prisma.GradeAtendimentoCreateManyInput[],
        select: { id: true, diaSemana: true, hora_inicio: true, hora_fim: true, filialId: true, ativo: true },
      }),
    ])

    return NextResponse.json({ success: true, data: grades })
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/terapeutas/[id]/grade", acao: "PUT" }, error);return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? 'Erro interno', details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
