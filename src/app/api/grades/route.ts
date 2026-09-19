import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'
import { Prisma } from '@prisma/client'
import { resolverProfissionalIdsDaFilial } from '@/lib/filial-profissionais'

// Grades de atendimento em lote — usado pela aba "Grade de Horários" da agenda,
// que precisa da grade de vários profissionais de uma vez (a rota
// /api/terapeutas/[id]/grade atende um profissional por requisição).
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Sem tenant' }, { status: 403 })
    if (!await hasPermission(user, 'view_schedule'))
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const profissionalId = searchParams.get('profissionalId')
    const filialId = searchParams.get('filialId')

    const where: Prisma.GradeAtendimentoWhereInput = {
      tenantId: user.tenant.id,
      ativo: true,
    }

    if (profissionalId) {
      where.profissionalId = profissionalId
    } else if (filialId) {
      // Mesma regra do filtro da agenda: a filial de um atendimento é a do
      // profissional, não a da sala (ver src/lib/filial-profissionais.ts)
      where.profissionalId = { in: await resolverProfissionalIdsDaFilial(user.tenant.id, filialId) }
    }

    // Bloco sem filial definida vale para qualquer unidade
    if (filialId) {
      where.OR = [{ filialId }, { filialId: null }]
    }

    const grades = await prisma.gradeAtendimento.findMany({
      where,
      select: {
        id: true,
        profissionalId: true,
        diaSemana: true,
        hora_inicio: true,
        hora_fim: true,
        filialId: true,
      },
      orderBy: [{ profissionalId: 'asc' }, { diaSemana: 'asc' }, { hora_inicio: 'asc' }],
    })

    return NextResponse.json({ success: true, data: grades })
  } catch (error) {
    console.error('Erro ao buscar grades:', error)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
