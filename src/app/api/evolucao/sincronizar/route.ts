// Traz para o plano do paciente as atividades que entraram no currículo depois
// da atribuição (Módulo 10 — evolução).
//
// Por que existe: o plano atribuído é um snapshot, porque o clone é editado por
// paciente (fase, critérios, pontuações). Atividade adicionada ao currículo
// depois não aparece sozinha — eram 4 dos 9 planos do banco nessa situação, um
// deles com a evolução inteira vazia.
//
// A operação é **aditiva por contrato**: cria só o que falta e nunca atualiza
// nem remove clone existente. É o que permite oferecer o botão sem risco de
// passar por cima do trabalho do terapeuta.
//
// Atividade REMOVIDA do currículo não é tratada aqui de propósito: o clone
// guarda dados coletados em sessão, então apagá-lo perderia histórico. Quem
// quer parar de usar desativa o clone na própria tela.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'
import { atividadesFaltantesDoPlano, clonarAtividadesFaltantes } from '@/lib/clone-atividade'
import { registrarErroApi } from '@/lib/erro-prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user)
      return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id)
      return NextResponse.json(
        { success: false, error: 'Usuário não está associado a uma clínica' },
        { status: 403 }
      )
    // Mesma permissão de atribuir plano: criar clone é criar atividade do paciente
    if (!(await hasPermission(user, 'create_activities')))
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const body = (await request.json()) as { pacienteCurriculumId?: string }
    const pacienteCurriculumId = body.pacienteCurriculumId
    if (!pacienteCurriculumId)
      return NextResponse.json(
        { success: false, error: 'pacienteCurriculumId é obrigatório' },
        { status: 400 }
      )

    // `pacienteCurriculum` não tem tenantId: o escopo vem pelo paciente.
    // Validar ANTES de clonar, e responder 404 (não 403) para não confirmar que
    // o id existe em outra clínica.
    const plano = await prisma.pacienteCurriculum.findFirst({
      where: { id: pacienteCurriculumId, paciente: { tenantId: user.tenant.id } },
      select: { id: true, ativa: true, curriculum: { select: { nome: true } } },
    })
    if (!plano)
      return NextResponse.json({ success: false, error: 'Plano não encontrado' }, { status: 404 })

    const faltantes = await atividadesFaltantesDoPlano(pacienteCurriculumId)
    if (faltantes.length === 0)
      return NextResponse.json({
        success: true,
        criadas: 0,
        nomes: [],
        mensagem: 'O plano já está igual ao currículo.',
      })

    const { criadas, nomes } = await clonarAtividadesFaltantes(pacienteCurriculumId)

    return NextResponse.json({
      success: true,
      criadas,
      nomes,
      mensagem:
        criadas === 1
          ? `"${nomes[0]}" foi adicionada ao plano.`
          : `${criadas} atividades foram adicionadas ao plano.`,
    })
  } catch (error) {
    const { ref, classificacao } = registrarErroApi(
      { rota: '/api/evolucao/sincronizar', acao: 'POST' },
      error
    )
    return NextResponse.json(
      {
        success: false,
        error: classificacao.mensagem ?? 'Erro interno do servidor',
        details: classificacao.detalhe,
        ref,
      },
      { status: classificacao.mensagem && classificacao.categoria !== 'conexao' ? 400 : 500 }
    )
  }
}
