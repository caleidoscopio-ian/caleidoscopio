import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission, isAdminUser } from '@/lib/auth/server'
import { StatusAgendamento } from '@/types/agendamento'
import { escopoFilialDoUsuario, intersecaoFilial } from '@/lib/filial-pessoa'
import { parseInicioPeriodo, parseFimPeriodo, inicioDoDia, fimDoDia } from '@/lib/datas-fuso'
import { registrarErroApi } from "@/lib/erro-prisma";

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
    const filialIdParam = searchParams.get('filialId')

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

    // Módulo 26, Fase 3: a filial é campo do agendamento, não do perfil do
    // profissional. Mesma regra de /api/agendamentos.
    const escopoFilial = await escopoFilialDoUsuario(user.tenant.id, user.id, isAdmin)
    const filiaisVisiveis = intersecaoFilial(
      escopoFilial,
      filialIdParam ? [filialIdParam] : null
    )

    // Mesma regra da agenda: quem não tem `VIEW_ALL` vê só os próprios
    // atendimentos. Esta tela não tinha restrição nenhuma, então um terapeuta
    // enxergava o check-in de todos os pacientes da clínica — as duas telas da
    // recepção discordavam entre si.
    const podeVerTodas = await hasPermission(user, 'view_all_schedules')
    let profissionalProprio: string | null = null
    if (!podeVerTodas) {
      const prof = await prisma.profissional.findFirst({
        where: { usuarioId: user.id, tenantId: user.tenant.id, ativo: true },
        select: { id: true },
      })
      if (!prof) {
        // Sem agenda própria e sem permissão de ver as outras
        // Mesma forma da resposta normal: { success, data, total }
        return NextResponse.json({ success: true, data: [], total: 0 })
      }
      profissionalProprio = prof.id
    }

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        paciente: {
          tenantId: user.tenant.id,
          ...(search ? { nome: { contains: search, mode: 'insensitive' } } : {}),
        },
        profissional: { tenantId: user.tenant.id },
        data_hora: { gte: inicioDia, lte: fimDia },
        // Filial e profissional são filtros independentes agora. Antes, filtrar
        // por profissional descartava silenciosamente o filtro de filial.
        // O próprio profissional vence o parâmetro: quem não vê as outras
        // agendas não passa a ver pedindo outro profissional na query.
        ...(profissionalProprio
          ? { profissionalId: profissionalProprio }
          : profissionalId
            ? { profissionalId }
            : {}),
        ...(filiaisVisiveis ? { filialId: { in: filiaisVisiveis } } : {}),
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
    const { ref, classificacao } = registrarErroApi({ rota: "/api/agendamentos/check-in", acao: "GET" }, error);return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? 'Erro interno do servidor', details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
