import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Usuário sem clínica associada' }, { status: 403 })
    if (!await hasPermission(user, 'view_procedimentos')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { id } = await params

    const procedimento = await prisma.procedimento.findFirst({
      where: { id, tenantId: user.tenant.id },
      include: {
        _count: {
          select: {
            agendamentos: true,
            tabelasConvenio: true,
            regrasRepasse: true,
            pacoteProcedimentos: true,
          },
        },
        tabelasConvenio: {
          where: { ativo: true },
          include: { convenio: { select: { id: true, razao_social: true, nome_fantasia: true } } },
          orderBy: { nome_procedimento: 'asc' },
        },
        regrasRepasse: {
          where: { ativo: true },
          include: {
            profissional: { select: { id: true, nome: true, especialidade: true } },
            convenio: { select: { id: true, razao_social: true, nome_fantasia: true } },
          },
          orderBy: { prioridade: 'desc' },
        },
      },
    })

    if (!procedimento) return NextResponse.json({ success: false, error: 'Procedimento não encontrado' }, { status: 404 })

    return NextResponse.json({ success: true, data: procedimento })
  } catch (error) {
    console.error('Erro ao buscar procedimento:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
