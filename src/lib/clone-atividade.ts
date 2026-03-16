import { prisma } from '@/lib/prisma'
import { FaseAtividade, Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'

/**
 * Clona todas as atividades de um curriculum para um PacienteCurriculum.
 * Cria cópias independentes de atividades, instruções, pontuações e
 * configura os critérios padrão de evolução por fase.
 */
export async function clonarAtividadesParaPaciente(
  pacienteCurriculumId: string,
  curriculumId: string
): Promise<void> {
  // Buscar curriculum com todas as atividades, instruções e pontuações
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

  // Criar todos os clones dentro de uma transaction
  await prisma.$transaction(async (tx) => {
    for (const currAtividade of curriculum.atividades) {
      const atividadeOriginal = currAtividade.atividade
      const cloneId = randomUUID()

      // 1. Criar clone da atividade
      await tx.pacienteAtividadeClone.create({
        data: {
          id: cloneId,
          pacienteCurriculumId,
          atividadeOriginalId: atividadeOriginal.id,
          ordem: currAtividade.ordem,
          nome: atividadeOriginal.nome,
          protocolo: atividadeOriginal.protocolo,
          habilidade: atividadeOriginal.habilidade,
          marco_codificacao: atividadeOriginal.marco_codificacao,
          tipo_ensino: atividadeOriginal.tipo_ensino,
          qtd_alvos_sessao: atividadeOriginal.qtd_alvos_sessao,
          qtd_tentativas_alvo: atividadeOriginal.qtd_tentativas_alvo,
          faseAtual: FaseAtividade.LINHA_BASE,
        },
      })

      // 2. Clonar instruções
      if (atividadeOriginal.instrucoes.length > 0) {
        const instrucaoData: Prisma.AtividadeCloneInstrucaoCreateManyInput[] =
          atividadeOriginal.instrucoes.map((instrucao) => ({
            id: randomUUID(),
            atividadeCloneId: cloneId,
            ordem: instrucao.ordem,
            texto: instrucao.texto,
            como_aplicar: instrucao.como_aplicar,
            observacao: instrucao.observacao,
            procedimento_correcao: instrucao.procedimento_correcao,
            materiais_utilizados: instrucao.materiais_utilizados,
          }))

        await tx.atividadeCloneInstrucao.createMany({ data: instrucaoData })
      }

      // 3. Clonar pontuações
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

      // 4. Criar critérios padrão para as 4 fases
      const fasesData: Prisma.AtividadeFaseCreateManyInput[] = [
        {
          id: randomUUID(),
          atividadeCloneId: cloneId,
          fase: FaseAtividade.LINHA_BASE,
          porcentagem_acerto: 80,
          qtd_sessoes_consecutivas: 1,
          fase_se_atingir: FaseAtividade.INTERVENCAO,
          fase_se_nao_atingir: null, // Permanecer
        },
        {
          id: randomUUID(),
          atividadeCloneId: cloneId,
          fase: FaseAtividade.INTERVENCAO,
          porcentagem_acerto: 80,
          qtd_sessoes_consecutivas: 1,
          fase_se_atingir: FaseAtividade.MANUTENCAO,
          fase_se_nao_atingir: FaseAtividade.LINHA_BASE,
        },
        {
          id: randomUUID(),
          atividadeCloneId: cloneId,
          fase: FaseAtividade.MANUTENCAO,
          porcentagem_acerto: 80,
          qtd_sessoes_consecutivas: 1,
          fase_se_atingir: FaseAtividade.GENERALIZACAO,
          fase_se_nao_atingir: FaseAtividade.INTERVENCAO,
        },
        {
          id: randomUUID(),
          atividadeCloneId: cloneId,
          fase: FaseAtividade.GENERALIZACAO,
          porcentagem_acerto: 80,
          qtd_sessoes_consecutivas: 1,
          fase_se_atingir: null, // Concluída
          fase_se_nao_atingir: FaseAtividade.MANUTENCAO,
        },
      ]

      await tx.atividadeFase.createMany({ data: fasesData })
    }
  })
}
