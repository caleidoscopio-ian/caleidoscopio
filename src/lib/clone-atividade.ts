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

      // 2. Clonar instruções — gerar IDs antecipadamente para criar InstrucaoFase
      if (atividadeOriginal.instrucoes.length > 0) {
        const instrucaoDataComIds = atividadeOriginal.instrucoes.map((instrucao) => ({
          id: randomUUID(),
          atividadeCloneId: cloneId,
          ordem: instrucao.ordem,
          texto: instrucao.texto,
          como_aplicar: instrucao.como_aplicar,
          observacao: instrucao.observacao,
          procedimento_correcao: instrucao.procedimento_correcao,
          materiais_utilizados: instrucao.materiais_utilizados,
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
  })
}
