import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission, isAdminUser } from '@/lib/auth/server'
import { StatusAgendamento } from '@/types/agendamento'
import { resolverProfissionalIdsDaFilial } from '@/lib/filial-profissionais'
import { parseInicioPeriodo, parseFimPeriodo, inicioDoDia, fimDoDia } from '@/lib/datas-fuso'

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
    const isAdmin = isAdminUser(user)
    const filialFiltro = !isAdmin ? (user.filialId ?? null) : (searchParams.get('filialId') || null)

    // Intervalo do dia no fuso da clínica — o construtor local do Date usaria
    // o fuso do servidor, que em produção é UTC
    const inicioDia = data ? parseInicioPeriodo(data) : inicioDoDia()
    const fimDia = data ? parseFimPeriodo(data) : fimDoDia()

    // Filtros de status
    const statusList = statusParam
      ? (statusParam.split(',').filter(s =>
          Object.values(StatusAgendamento).includes(s as StatusAgendamento)
        ) as StatusAgendamento[])
      : undefined

    // A filial "dona" de um agendamento é a do profissional (cadastro), não a
    // da sala onde ele acontece — mesma fonte usada em /api/agendamentos.
    const profissionalIdsDaFilial = filialFiltro
      ? await resolverProfissionalIdsDaFilial(user.tenant.id, filialFiltro)
      : null

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        paciente: {
          tenantId: user.tenant.id,
          ...(search ? { nome: { contains: search, mode: 'insensitive' } } : {}),
        },
        profissional: { tenantId: user.tenant.id },
        data_hora: { gte: inicioDia, lte: fimDia },
        ...(profissionalId
          ? { profissionalId }
          : profissionalIdsDaFilial
            ? { profissionalId: { in: profissionalIdsDaFilial } }
            : {}),
        ...(salaId ? { salaId } : {}),
        ...(statusList?.length ? { status: { in: statusList } } : {}),
      },
      include: {
        paciente: {
          select: {
            id: true, nome: true, foto: true, cor_agenda: true, telefone: true,
            convenioId: true,
            convenio: { select: { id: true, razao_social: true, nome_fantasia: true } },
          },
        },
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
