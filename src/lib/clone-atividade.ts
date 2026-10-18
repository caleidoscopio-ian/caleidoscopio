// Clonagem de atividade do currículo para o plano do paciente.
//
// O plano atribuído é um SNAPSHOT, de propósito: o clone é editável por
// paciente (fase atual, critérios por instrução, pontuações), e é isso que a
// tela de evolução manipula. Propagar edição do currículo por cima arriscaria
// sobrescrever o trabalho do terapeuta.
//
// A consequência é que atividade adicionada ao currículo DEPOIS da atribuição
// não aparece no plano — medido: 4 dos 9 planos do banco estavam nessa
// situação. Daí `clonarAtividadesFaltantes`, que é **aditiva**: cria só o que
// falta e nunca toca em clone existente.

import { prisma } from '@/lib/prisma'
import { FaseAtividade, Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'

const FASES_PADRAO = [
  {
    fase: FaseAtividade.LINHA_BASE,
    porcentagem_acerto: 80,
    qtd_sessoes_consecutivas: 1,
    fase_se_atingir: FaseAtividade.INTERVENCAO,
    fase_se_nao_atingir: null,
  },
  {
    fase: FaseAtividade.INTERVENCAO,
    porcentagem_acerto: 80,
    qtd_sessoes_consecutivas: 1,
    fase_se_atingir: FaseAtividade.MANUTENCAO,
    fase_se_nao_atingir: FaseAtividade.LINHA_BASE,
  },
  {
    fase: FaseAtividade.MANUTENCAO,
    porcentagem_acerto: 80,
    qtd_sessoes_consecutivas: 1,
    fase_se_atingir: FaseAtividade.GENERALIZACAO,
    fase_se_nao_atingir: FaseAtividade.INTERVENCAO,
  },
  {
    fase: FaseAtividade.GENERALIZACAO,
    porcentagem_acerto: 80,
    qtd_sessoes_consecutivas: 1,
    fase_se_atingir: null,
    fase_se_nao_atingir: FaseAtividade.MANUTENCAO,
  },
]

/**
 * Clona todas as atividades de um curriculum para um PacienteCurriculum.
 * Cria cópias independentes de atividades, instruções, pontuações e
 * configura os critérios padrão de evolução por fase (por instrução).
 */
export async function clonarAtividadesParaPaciente(
  pacienteCurriculumId: string,
  curriculumId: string
): Promise<void> {
  const curriculum = await prisma.curriculum.findUnique({
    where: { id: curriculumId },
    include: {
      atividades: {
        orderBy: { ordem: 'asc' },
        include: {
          atividade: {
            include: {
              instrucoes: { orderBy: { ordem: 'asc' } },
              pontuacoes: { orderBy: { ordem: 'asc' } },
            },
          },
        },
      },
    },
  })

  if (!curriculum || !curriculum.atividades.length) {
    return
  }

  await prisma.$transaction(async (tx) => {
    for (const currAtividade of curriculum.atividades) {
      await clonarUma(tx, pacienteCurriculumId, currAtividade.atividade, currAtividade.ordem)
    }
  })
}

/**
 * Atividades do currículo que ainda não existem no plano do paciente.
 *
 * Compara por `atividadeOriginalId` — é o elo entre o clone e a atividade de
 * origem. Clone inativo conta como existente: ele foi desativado de propósito,
 * e recriar passaria por cima dessa decisão.
 */
export async function atividadesFaltantesDoPlano(pacienteCurriculumId: string) {
  const plano = await prisma.pacienteCurriculum.findUnique({
    where: { id: pacienteCurriculumId },
    select: {
      curriculum: {
        select: {
          atividades: {
            orderBy: { ordem: 'asc' },
            select: { ordem: true, atividade: { select: { id: true, nome: true } } },
          },
        },
      },
      atividadesClone: { select: { atividadeOriginalId: true } },
    },
  })
  if (!plano) return []

  // `atividadeOriginalId` nulo = atividade de origem apagada; o clone existe,
  // mas não corresponde a nenhuma atividade do currículo atual
  const jaClonadas = new Set(
    plano.atividadesClone
      .map((c) => c.atividadeOriginalId)
      .filter((id): id is string => id !== null)
  )
  return plano.curriculum.atividades
    .filter((a) => !jaClonadas.has(a.atividade.id))
    .map((a) => ({ id: a.atividade.id, nome: a.atividade.nome, ordem: a.ordem }))
}

/**
 * Clona para o plano as atividades do currículo que ainda não estão nele.
 *
 * **Aditiva**: não atualiza nem remove clone existente. Devolve quantas foram
 * criadas, para a tela dizer o que aconteceu.
 */
export async function clonarAtividadesFaltantes(
  pacienteCurriculumId: string
): Promise<{ criadas: number; nomes: string[] }> {
  const faltantes = await atividadesFaltantesDoPlano(pacienteCurriculumId)
  if (faltantes.length === 0) return { criadas: 0, nomes: [] }

  const atividades = await prisma.atividade.findMany({
    where: { id: { in: faltantes.map((f) => f.id) } },
    include: {
      instrucoes: { orderBy: { ordem: 'asc' } },
      pontuacoes: { orderBy: { ordem: 'asc' } },
    },
  })
  const porId = new Map(atividades.map((a) => [a.id, a]))

  await prisma.$transaction(async (tx) => {
    for (const faltante of faltantes) {
      const atividade = porId.get(faltante.id)
      if (!atividade) continue
      await clonarUma(tx, pacienteCurriculumId, atividade, faltante.ordem)
    }
  })

  return {
    criadas: faltantes.filter((f) => porId.has(f.id)).length,
    nomes: faltantes.filter((f) => porId.has(f.id)).map((f) => f.nome),
  }
}

type AtividadeParaClonar = Prisma.atividadeGetPayload<{
  include: { instrucoes: true; pontuacoes: true }
}>

/** Uma atividade e tudo que pende dela: instruções, critérios e pontuações. */
async function clonarUma(
  tx: Prisma.TransactionClient,
  pacienteCurriculumId: string,
  atividadeOriginal: AtividadeParaClonar,
  ordem: number
) {
  const cloneId = randomUUID()

  // 1. Criar clone da atividade
  await tx.pacienteAtividadeClone.create({
    data: {
      id: cloneId,
      pacienteCurriculumId,
      atividadeOriginalId: atividadeOriginal.id,
      ordem,
      nome: atividadeOriginal.nome,
      protocolo: atividadeOriginal.protocolo,
      habilidade: atividadeOriginal.habilidade,
      marco_codificacao: atividadeOriginal.marco_codificacao,
      tipo_ensino: atividadeOriginal.tipo_ensino,
      qtd_alvos_sessao: atividadeOriginal.qtd_alvos_sessao,
      qtd_tentativas_alvo: atividadeOriginal.qtd_tentativas_alvo,
      // Aplicação no nível da atividade (igual ao cadastro)
      como_aplicar: atividadeOriginal.como_aplicar,
      observacao: atividadeOriginal.observacao,
      procedimento_correcao: atividadeOriginal.procedimento_correcao,
      materiais_utilizados: atividadeOriginal.materiais_utilizados,
      faseAtual: FaseAtividade.LINHA_BASE,
    },
  })

  // 2. Clonar instruções — gerar IDs antecipadamente para criar InstrucaoFase
  if (atividadeOriginal.instrucoes.length > 0) {
    const instrucaoDataComIds = atividadeOriginal.instrucoes.map((instrucao) => ({
      id: randomUUID(),
      atividadeCloneId: cloneId,
      ordem: instrucao.ordem,
      texto: instrucao.texto,
      // Campos de aplicação ficam no nível da atividade (PacienteAtividadeClone)
      faseAtual: FaseAtividade.LINHA_BASE,
      ativo: true,
      qtd_tentativas_alvo: atividadeOriginal.qtd_tentativas_alvo || 1,
    }))

    await tx.atividadeCloneInstrucao.createMany({ data: instrucaoDataComIds })

    // 3. Criar critérios de evolução para cada instrução (4 fases por instrução)
    const instrucaoFasesData: Prisma.InstrucaoFaseCreateManyInput[] =
      instrucaoDataComIds.flatMap((instrucao) =>
        FASES_PADRAO.map((f) => ({
          id: randomUUID(),
          instrucaoId: instrucao.id,
          fase: f.fase,
          porcentagem_acerto: f.porcentagem_acerto,
          qtd_sessoes_consecutivas: f.qtd_sessoes_consecutivas,
          fase_se_atingir: f.fase_se_atingir,
          fase_se_nao_atingir: f.fase_se_nao_atingir,
        }))
      )

    await tx.instrucaoFase.createMany({ data: instrucaoFasesData })

    // 3b. Criar pontuações por instrução por fase
    if (atividadeOriginal.pontuacoes.length > 0) {
      const instrucaoPontuacoesData: Prisma.InstrucaoPontuacaoCreateManyInput[] =
        instrucaoDataComIds.flatMap((instrucao) =>
          FASES_PADRAO.flatMap((f) =>
            atividadeOriginal.pontuacoes.map((pont) => ({
              id: randomUUID(),
              instrucaoId: instrucao.id,
              fase: f.fase,
              ordem: pont.ordem,
              sigla: pont.sigla,
              grau: pont.grau,
            }))
          )
        )

      await tx.instrucaoPontuacao.createMany({ data: instrucaoPontuacoesData })
    }
  }

  // 4. Clonar pontuações (legado — nível atividade)
  if (atividadeOriginal.pontuacoes.length > 0) {
    const pontuacaoData: Prisma.AtividadeClonePontuacaoCreateManyInput[] =
      atividadeOriginal.pontuacoes.map((pontuacao) => ({
        id: randomUUID(),
        atividadeCloneId: cloneId,
        ordem: pontuacao.ordem,
        sigla: pontuacao.sigla,
        grau: pontuacao.grau,
      }))

    await tx.atividadeClonePontuacao.createMany({ data: pontuacaoData })
  }

  // 5. Manter AtividadeFase por retrocompatibilidade
  const fasesData: Prisma.AtividadeFaseCreateManyInput[] = FASES_PADRAO.map((f) => ({
    id: randomUUID(),
    atividadeCloneId: cloneId,
    fase: f.fase,
    porcentagem_acerto: f.porcentagem_acerto,
    qtd_sessoes_consecutivas: f.qtd_sessoes_consecutivas,
    fase_se_atingir: f.fase_se_atingir,
    fase_se_nao_atingir: f.fase_se_nao_atingir,
  }))

  await tx.atividadeFase.createMany({ data: fasesData })
}
