// Capacidade de sala no período (Módulo 27).
//
// Responde a pergunta de gestão "cabe mais um profissional?" decompondo o
// horário de cada sala em três partes que somam a capacidade:
//
//   agendado + livre COM profissional + livre SEM profissional
//
// A última é o sinal que a clínica quer: sala aberta, nenhum profissional
// escalado. O cálculo em si é puro e mora em `@/lib/capacidade-sala`; aqui fica
// o que depende do banco e da autorização.
//
// Endpoint separado de `/api/salas/ocupacao` de propósito: aquele devolve a
// lista completa de agendamentos (a timeline precisa), este devolve números
// agregados. Mandar tudo junto faria o dashboard baixar centenas de
// agendamentos para mostrar seis cartões.
//
// Sala SEM grade fica fora de todos os números, listada em `salas_sem_grade`.
// Sem horário de funcionamento não existe denominador: contar como zero daria
// taxa infinita, e assumir um horário padrão inventaria capacidade que a
// clínica não confirmou.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission, isAdminUser } from '@/lib/auth/server'
import { escopoFilialDoUsuario, intersecaoFilial } from '@/lib/filial-pessoa'
import { diasDoPeriodo, parseInicioPeriodo, parseFimPeriodo } from '@/lib/datas-fuso'
import {
  agendadoPorDia,
  calcularCapacidade,
  calcularSimultaneidade,
  type BlocoSemanal,
} from '@/lib/capacidade-sala'
import { registrarErroApi } from '@/lib/erro-prisma'
import { Prisma, TipoVinculoProfissional } from '@prisma/client'
import type { CapacidadeFilial, CapacidadeSala } from '@/types/ocupacao-sala'

/** Status que ocupam a sala de fato (os mesmos de /api/salas/ocupacao) */
const STATUS_OCUPADOS = ['AGENDADO', 'CONFIRMADO', 'EM_ATENDIMENTO', 'ATENDIDO'] as const

const MAX_DIAS = 35

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Sem tenant' }, { status: 403 })
    if (!(await hasPermission(user, 'view_rooms')))
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const tenantId = user.tenant.id
    const sp = request.nextUrl.searchParams
    const dataInicio = sp.get('dataInicio')
    const dataFim = sp.get('dataFim')
    if (!dataInicio || !dataFim)
      return NextResponse.json(
        { success: false, error: 'dataInicio e dataFim são obrigatórios' },
        { status: 400 }
      )

    const inicio = parseInicioPeriodo(dataInicio)
    const fim = parseFimPeriodo(dataFim)
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime()))
      return NextResponse.json({ success: false, error: 'Datas inválidas' }, { status: 400 })
    if (fim.getTime() < inicio.getTime())
      return NextResponse.json({ success: false, error: 'A data final é anterior à inicial' }, { status: 400 })
    if ((fim.getTime() - inicio.getTime()) / 86400000 > MAX_DIAS)
      return NextResponse.json({ success: false, error: `Período máximo de ${MAX_DIAS} dias` }, { status: 400 })

    const escopo = await escopoFilialDoUsuario(tenantId, user.id, isAdminUser(user))
    const filialParam = sp.get('filialId')
    const filiaisVisiveis = intersecaoFilial(escopo, filialParam ? [filialParam] : null)
    const salaParam = sp.get('salaId')

    const salas = await prisma.sala.findMany({
      where: {
        tenantId,
        ativo: true,
        ...(filiaisVisiveis ? { filialId: { in: filiaisVisiveis } } : {}),
        ...(salaParam ? { id: salaParam } : {}),
      },
      select: {
        id: true,
        nome: true,
        cor: true,
        filialId: true,
        filial: { select: { id: true, nome: true } },
        grades: {
          where: { ativo: true },
          select: { diaSemana: true, hora_inicio: true, hora_fim: true, ativo: true },
        },
      },
      orderBy: [{ filial: { nome: 'asc' } }, { nome: 'asc' }],
    })

    const dias = diasDoPeriodo(inicio, fim)

    if (salas.length === 0) {
      return NextResponse.json({
        success: true,
        periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
        salas: [],
        filiais: [],
        total: { salas: 0, ...vazio() },
        salas_sem_grade: [],
        salas_fechadas_no_periodo: 0,
      })
    }

    const salaIds = salas.map((s) => s.id)

    const [agendamentos, gradesProf] = await Promise.all([
      // tenant-ok: salaIds vem da consulta de salas filtrada por tenantId acima
      prisma.agendamento.findMany({
        where: {
          salaId: { in: salaIds },
          data_hora: { gte: inicio, lte: fim },
          status: { in: STATUS_OCUPADOS as unknown as Prisma.EnumStatusAgendamentoFilter['in'] },
        },
        select: { salaId: true, data_hora: true, horario_fim: true },
      }),
      // Grade de quem de fato atende. Bloco com filialId nulo vale em qualquer
      // unidade; os demais só na sua.
      prisma.gradeAtendimento.findMany({
        where: {
          tenantId,
          ativo: true,
          profissional: { ativo: true, tipo_vinculo: TipoVinculoProfissional.PROFISSIONAL_CLINICO },
        },
        select: {
          profissionalId: true,
          diaSemana: true,
          hora_inicio: true,
          hora_fim: true,
          filialId: true,
          ativo: true,
        },
      }),
    ])

    const agsPorSala = new Map<string, { data_hora: Date; horario_fim: Date }[]>()
    for (const ag of agendamentos) {
      const lista = agsPorSala.get(ag.salaId) ?? []
      lista.push({ data_hora: ag.data_hora, horario_fim: ag.horario_fim })
      agsPorSala.set(ag.salaId, lista)
    }

    const coringas = gradesProf.filter((g) => g.filialId === null) as BlocoSemanal[]
    const porFilial = new Map<string, BlocoSemanal[]>()
    for (const g of gradesProf) {
      if (!g.filialId) continue
      const lista = porFilial.get(g.filialId) ?? []
      lista.push(g)
      porFilial.set(g.filialId, lista)
    }

    // Para o teto vendavel a grade tem de ficar separada POR PESSOA: unir tudo
    // perderia quantas pessoas existem no mesmo horario, que e justamente o que
    // limita o quanto da para vender.
    const pessoasDaFilial = (filialId: string | null): BlocoSemanal[][] => {
      const porPessoa = new Map<string, BlocoSemanal[]>()
      for (const g of gradesProf) {
        const serve = g.filialId === null || (filialId !== null && g.filialId === filialId)
        if (!serve) continue
        const lista = porPessoa.get(g.profissionalId) ?? []
        lista.push(g)
        porPessoa.set(g.profissionalId, lista)
      }
      return [...porPessoa.values()]
    }

    const comGrade = salas.filter((s) => s.grades.length > 0)
    const semGrade = salas.filter((s) => s.grades.length === 0)

    const calculadas: CapacidadeSala[] = comGrade.map((sala) => {
      const ags = agsPorSala.get(sala.id) ?? []
      const gradeDaUnidade = [
        ...(sala.filialId ? (porFilial.get(sala.filialId) ?? []) : []),
        ...coringas,
      ]
      const c = calcularCapacidade(dias, sala.grades, gradeDaUnidade, agendadoPorDia(ags))

      return {
        id: sala.id,
        nome: sala.nome,
        cor: sala.cor,
        filial: sala.filial ? { id: sala.filial.id, nome: sala.filial.nome } : null,
        ...c,
        atendimentos: ags.length,
        taxa_ocupacao:
          c.minutos_capacidade > 0 ? c.minutos_agendados / c.minutos_capacidade : 0,
        taxa_sobre_atendivel:
          c.minutos_com_profissional > 0 ? c.minutos_agendados / c.minutos_com_profissional : 0,
      }
    })

    // Sala que não abre em NENHUM dos dias escolhidos (grade só de sábado num
    // período de seg a sex) sai da lista: barra de 0h não compara nada. É caso
    // diferente de "sem grade" — ali falta cadastro, aqui o filtro é que não
    // alcança o horário — então vai num contador próprio, não no aviso de
    // configuração.
    const resultado = calculadas.filter((s) => s.minutos_capacidade > 0)
    const fechadasNoPeriodo = calculadas.length - resultado.length

    // Agregado por filial: sala sem filial cai num grupo "Sem filial", como em
    // outras telas, em vez de desaparecer da soma
    const grupos = new Map<string, { id: string | null; nome: string; salas: typeof comGrade }>()
    for (const sala of comGrade) {
      const chave = sala.filial?.id ?? '_sem_filial'
      const grupo =
        grupos.get(chave) ??
        { id: sala.filial?.id ?? null, nome: sala.filial?.nome ?? 'Sem filial', salas: [] }
      grupo.salas.push(sala)
      grupos.set(chave, grupo)
    }
    const porSalaId = new Map(resultado.map((s) => [s.id, s]))

    const filiais: CapacidadeFilial[] = [...grupos.values()]
      .map((grupo) => {
        const visiveis = grupo.salas
          .map((s) => porSalaId.get(s.id))
          .filter((s): s is CapacidadeSala => Boolean(s))

        // Teto vendavel: contagem simultanea de salas abertas x pessoas
        // escaladas NA UNIDADE. Profissional de uma filial nao preenche sala de
        // outra, entao o min e por grupo e o total e a soma dos grupos.
        const teto = calcularSimultaneidade(
          dias,
          grupo.salas.map((s) => ({
            grade: s.grades,
            agendado: agendadoPorDia(agsPorSala.get(s.id) ?? []),
          })),
          pessoasDaFilial(grupo.id)
        )

        const soma = (campo: keyof CapacidadeSala) =>
          visiveis.reduce((acc, s) => acc + (s[campo] as number), 0)

        const capacidade = soma('minutos_capacidade')
        const agendados = soma('minutos_agendados')

        return {
          id: grupo.id,
          nome: grupo.nome,
          salas: visiveis.length,
          minutos_capacidade: capacidade,
          minutos_com_profissional: soma('minutos_com_profissional'),
          minutos_agendados: agendados,
          minutos_agendados_fora: soma('minutos_agendados_fora'),
          minutos_livres_com_profissional: soma('minutos_livres_com_profissional'),
          minutos_livres_sem_profissional: soma('minutos_livres_sem_profissional'),
          atendimentos: soma('atendimentos'),
          taxa_ocupacao: capacidade > 0 ? agendados / capacidade : 0,
          minutos_profissional: teto.minutos_profissional,
          minutos_efetivos: teto.minutos_efetivos,
          minutos_agendados_efetivos: teto.minutos_agendados,
          minutos_livres_efetivos: teto.minutos_livres_efetivos,
          minutos_limitados_por_pessoa: teto.minutos_limitados_por_pessoa,
          minutos_limitados_por_sala: teto.minutos_limitados_por_sala,
        }
      })
      // Grupo em que nenhuma sala abre no periodo nao tem o que mostrar
      .filter((g) => g.salas > 0)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

    const total = filiais.reduce(
      (acc, g) => ({
        salas: acc.salas + g.salas,
        minutos_capacidade: acc.minutos_capacidade + g.minutos_capacidade,
        minutos_com_profissional: acc.minutos_com_profissional + g.minutos_com_profissional,
        minutos_agendados: acc.minutos_agendados + g.minutos_agendados,
        minutos_agendados_fora: acc.minutos_agendados_fora + g.minutos_agendados_fora,
        minutos_livres_com_profissional:
          acc.minutos_livres_com_profissional + g.minutos_livres_com_profissional,
        minutos_livres_sem_profissional:
          acc.minutos_livres_sem_profissional + g.minutos_livres_sem_profissional,
        atendimentos: acc.atendimentos + g.atendimentos,
        taxa_ocupacao: 0,
        // Somar os tetos das unidades e correto: o min ja foi aplicado dentro de
        // cada uma, e pessoal nao se transfere entre unidades
        minutos_profissional: acc.minutos_profissional + g.minutos_profissional,
        minutos_efetivos: acc.minutos_efetivos + g.minutos_efetivos,
        minutos_agendados_efetivos: acc.minutos_agendados_efetivos + g.minutos_agendados_efetivos,
        minutos_livres_efetivos: acc.minutos_livres_efetivos + g.minutos_livres_efetivos,
        minutos_limitados_por_pessoa:
          acc.minutos_limitados_por_pessoa + g.minutos_limitados_por_pessoa,
        minutos_limitados_por_sala: acc.minutos_limitados_por_sala + g.minutos_limitados_por_sala,
      }),
      { salas: 0, ...vazio() }
    )
    total.taxa_ocupacao =
      total.minutos_capacidade > 0 ? total.minutos_agendados / total.minutos_capacidade : 0

    return NextResponse.json({
      success: true,
      periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
      dias: dias.length,
      salas: resultado,
      filiais,
      total,
      salas_sem_grade: semGrade.map((s) => ({
        id: s.id,
        nome: s.nome,
        filial: s.filial?.nome ?? null,
      })),
      salas_fechadas_no_periodo: fechadasNoPeriodo,
    })
  } catch (error) {
    const { ref, classificacao } = registrarErroApi(
      { rota: '/api/salas/capacidade', acao: 'GET' },
      error
    )
    return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? 'Erro interno', details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== 'conexao' ? 400 : 500 }
    )
  }
}

function vazio() {
  return {
    minutos_capacidade: 0,
    minutos_com_profissional: 0,
    minutos_agendados: 0,
    minutos_agendados_fora: 0,
    minutos_livres_com_profissional: 0,
    minutos_livres_sem_profissional: 0,
    atendimentos: 0,
    taxa_ocupacao: 0,
    minutos_profissional: 0,
    minutos_efetivos: 0,
    minutos_agendados_efetivos: 0,
    minutos_livres_efetivos: 0,
    minutos_limitados_por_pessoa: 0,
    minutos_limitados_por_sala: 0,
  }
}
