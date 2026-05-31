import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'
import { Prisma } from '@prisma/client'

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

    const grades = await prisma.gradeAtendimento.findMany({
      where: { profissionalId, tenantId: user.tenant.id, ativo: true },
      select: { id: true, diaSemana: true, hora_inicio: true, hora_fim: true, filialId: true, ativo: true },
      orderBy: [{ diaSemana: 'asc' }, { hora_inicio: 'asc' }],
    })

    return NextResponse.json({ success: true, data: grades })
  } catch (error) {
    console.error('Erro ao buscar grade:', error)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
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
    console.error('Erro ao salvar grade:', error)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
