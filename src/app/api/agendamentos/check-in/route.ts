import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'
import { StatusAgendamento } from '@/types/agendamento'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Usuário sem clínica associada' }, { status: 403 })
    if (!await hasPermission(user, 'view_schedule')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const data = searchParams.get('data') // YYYY-MM-DD, default hoje
    const profissionalId = searchParams.get('profissionalId')
    const salaId = searchParams.get('salaId')
    const search = searchParams.get('search') || ''
    const statusParam = searchParams.get('status') // ex: "AGENDADO,CONFIRMADO"

    // Calcular intervalo do dia — parse manual para evitar UTC vs local mismatch
    let inicioDia: Date
    let fimDia: Date
    if (data) {
      const [y, m, d] = data.split('-').map(Number)
      inicioDia = new Date(y, m - 1, d, 0, 0, 0, 0)
      fimDia    = new Date(y, m - 1, d, 23, 59, 59, 999)
    } else {
      const now = new Date()
      inicioDia = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      fimDia    = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    }

    // Filtros de status
    const statusList = statusParam
      ? (statusParam.split(',').filter(s =>
          Object.values(StatusAgendamento).includes(s as StatusAgendamento)
        ) as StatusAgendamento[])
      : undefined

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        paciente: {
          tenantId: user.tenant.id,
          ...(search ? { nome: { contains: search, mode: 'insensitive' } } : {}),
        },
        profissional: { tenantId: user.tenant.id },
        data_hora: { gte: inicioDia, lte: fimDia },
        ...(profissionalId ? { profissionalId } : {}),
        ...(salaId ? { salaId } : {}),
        ...(statusList?.length ? { status: { in: statusList } } : {}),
      },
      include: {
        paciente: { select: { id: true, nome: true, foto: true, cor_agenda: true, telefone: true } },
        profissional: { select: { id: true, nome: true, especialidade: true, email: true } },
        salaRelacao: { select: { id: true, nome: true, cor: true } },
        procedimento: { select: { id: true, nome: true, codigo: true, cor: true } },
      },
      orderBy: { data_hora: 'asc' },
    })

    return NextResponse.json({ success: true, data: agendamentos, total: agendamentos.length })
  } catch (error) {
    console.error('Erro ao buscar check-in:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
