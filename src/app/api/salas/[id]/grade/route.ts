// Horário de funcionamento de uma sala (Módulo 27).
//
// Espelha `/api/terapeutas/[id]/grade`, com duas diferenças:
//
//   - **Sem filial.** A sala já pertence a uma filial; repetir a escolha no
//     bloco só criaria oportunidade de divergir.
//   - **Permissão é de sala** (`view_rooms` / `manage_rooms`), não de agenda:
//     quem configura capacidade física é quem administra as salas.
//
// A grade da sala é o denominador da capacidade. Antes dela, o dashboard do
// mapa de ocupação usava um chute — 07h às 21h, todos os dias, inclusive
// domingo — e portanto subestimava a ocupação de toda clínica que não funciona
// 14h por dia nos sete dias da semana.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission, isAdminUser } from '@/lib/auth/server'
import { escopoFilialDoUsuario, filialPermitida } from '@/lib/filial-pessoa'
import { registrarErroApi } from '@/lib/erro-prisma'
import { Prisma } from '@prisma/client'
import type { BlocoGradeSala } from '@/types/ocupacao-sala'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * A sala é do tenant E está numa filial que o usuário pode operar?
 *
 * Responde 404 e não 403 quando é de outro tenant: um 403 confirmaria que o id
 * existe em outra clínica.
 */
async function carregarSala(tenantId: string, usuarioId: string, isAdmin: boolean, salaId: string) {
  const sala = await prisma.sala.findFirst({
    where: { id: salaId, tenantId },
    select: { id: true, nome: true, filialId: true, filial: { select: { nome: true } } },
  })
  if (!sala) return { erro: NextResponse.json({ success: false, error: 'Sala não encontrada' }, { status: 404 }) }

  const escopo = await escopoFilialDoUsuario(tenantId, usuarioId, isAdmin)
  if (!filialPermitida(escopo, sala.filialId))
    return { erro: NextResponse.json({ success: false, error: 'Sala fora das suas unidades' }, { status: 403 }) }

  return { sala }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Sem tenant' }, { status: 403 })
    if (!(await hasPermission(user, 'view_rooms')))
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { id: salaId } = await params
    const { sala, erro } = await carregarSala(user.tenant.id, user.id, isAdminUser(user), salaId)
    if (erro) return erro

    const blocos = await prisma.gradeSala.findMany({
      where: { salaId, tenantId: user.tenant.id, ativo: true },
      select: { id: true, diaSemana: true, hora_inicio: true, hora_fim: true, ativo: true },
      orderBy: [{ diaSemana: 'asc' }, { hora_inicio: 'asc' }],
    })

    return NextResponse.json({
      success: true,
      data: blocos satisfies BlocoGradeSala[],
      sala: { id: sala!.id, nome: sala!.nome, filial: sala!.filial?.nome ?? null },
    })
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: '/api/salas/[id]/grade', acao: 'GET' }, error)
    return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? 'Erro interno', details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== 'conexao' ? 400 : 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Sem tenant' }, { status: 403 })
    if (!(await hasPermission(user, 'manage_rooms')))
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { id: salaId } = await params
    const { erro } = await carregarSala(user.tenant.id, user.id, isAdminUser(user), salaId)
    if (erro) return erro

    const body = (await request.json()) as {
      blocos?: { diaSemana: number; hora_inicio: string; hora_fim: string }[]
    }
    const blocos = body.blocos
    if (!Array.isArray(blocos))
      return NextResponse.json({ success: false, error: 'blocos deve ser um array' }, { status: 400 })

    const reHora = /^\d{2}:\d{2}$/
    for (const b of blocos) {
      if (typeof b.diaSemana !== 'number' || b.diaSemana < 0 || b.diaSemana > 6)
        return NextResponse.json({ success: false, error: 'diaSemana deve ser 0-6' }, { status: 400 })
      if (!reHora.test(b.hora_inicio) || !reHora.test(b.hora_fim))
        return NextResponse.json({ success: false, error: 'Formato de hora inválido (HH:MM)' }, { status: 400 })
      if (b.hora_fim <= b.hora_inicio)
        return NextResponse.json({ success: false, error: 'hora_fim deve ser maior que hora_inicio' }, { status: 400 })
    }

    // Substituição total em transação, igual à grade do profissional: a tela
    // manda a grade inteira, então reconciliar bloco a bloco só criaria estado
    // intermediário sem dono.
    const [, criados] = await prisma.$transaction([
      prisma.gradeSala.deleteMany({ where: { salaId, tenantId: user.tenant.id } }),
      prisma.gradeSala.createManyAndReturn({
        data: blocos.map((b) => ({
          tenantId: user.tenant!.id,
          salaId,
          diaSemana: b.diaSemana,
          hora_inicio: b.hora_inicio,
          hora_fim: b.hora_fim,
          ativo: true,
        })) satisfies Prisma.GradeSalaCreateManyInput[],
        select: { id: true, diaSemana: true, hora_inicio: true, hora_fim: true, ativo: true },
      }),
    ])

    return NextResponse.json({ success: true, data: criados })
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: '/api/salas/[id]/grade', acao: 'PUT' }, error)
    return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? 'Erro interno', details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== 'conexao' ? 400 : 500 }
    )
  }
}
