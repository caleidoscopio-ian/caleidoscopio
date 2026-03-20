import { prisma } from '@/lib/prisma'
import { FaseAtividade } from '@prisma/client'
import { randomUUID } from 'crypto'

interface AvaliacaoData {
  id: string
  atividadeId: string
  atividadeCloneId: string | null
  instrucaoId: string
  tentativa: number
  nota: number
}

export interface InstrucaoEvolucaoResultado {
  instrucaoId: string
  textoInstrucao: string
  avancou: boolean
  regrediu: boolean
  faseAnterior: FaseAtividade
  faseNova: FaseAtividade
  stats: {
    totalTentativas: number
    tentativasCorretas: number
    porcentagemAcerto: number
    porcentagemCriterio: number
    qtdSessoesConsecutivas: number
    atingiuCriterio: boolean
  }
}

export interface EvolucaoResultado {
  atividadeCloneId: string
  nomeAtividade: string
  progressoAtividade: number // 0–100 (% de instruções concluídas)
  instrucoes: InstrucaoEvolucaoResultado[]
}

/**
 * Determina se uma tentativa é "correta" (acerto/independente).
 * O último botão da escala ("+"/Independente) é sempre o correto.
 */
function isTentativaCorreta(nota: number, qtdPontuacoes: number): boolean {
  if (qtdPontuacoes <= 0) return false
  return nota === qtdPontuacoes - 1
}

/**
 * Calcula progresso de uma atividade como % de instruções que atingiram
 * GENERALIZACAO ou cuja fase_se_atingir em GENERALIZACAO é null (concluída).
 */
function calcularProgressoAtividade(instrucoes: { faseAtual: FaseAtividade }[]): number {
  if (instrucoes.length === 0) return 0
  const concluidas = instrucoes.filter((i) => i.faseAtual === FaseAtividade.GENERALIZACAO).length
  return Math.round((concluidas / instrucoes.length) * 100)
}

/**
 * Calcula a evolução de fase por INSTRUÇÃO após uma sessão ser finalizada.
 */
export async function calcularEvolucaoAposFinalizacao(
  sessaoCurriculumId: string,
  pacienteCurriculumId: string,
  avaliacoes: AvaliacaoData[]
): Promise<EvolucaoResultado[]> {
  const resultados: EvolucaoResultado[] = []

  // Buscar os clones ativos com instruções (fases + pontuações por instrução)
  const clones = await prisma.pacienteAtividadeClone.findMany({
    where: { pacienteCurriculumId, ativo: true },
    include: {
      instrucoes: {
        where: { ativo: true },
        orderBy: { ordem: 'asc' },
        include: {
          fases: true,
          pontuacoes: true,
        },
      },
    },
  })

  for (const clone of clones) {
    const instrucaoResultados: InstrucaoEvolucaoResultado[] = []

    // Processar cada instrução individualmente
    for (const instrucao of clone.instrucoes) {
      // Avalições desta instrução nesta sessão
      const avaliacoesInstrucao = avaliacoes.filter(
        (a) => a.instrucaoId === instrucao.id && a.atividadeCloneId === clone.id
      )

      if (avaliacoesInstrucao.length === 0) continue

      // Pontuações desta instrução na fase atual
      const pontuacoesFase = instrucao.pontuacoes.filter(
        (p) => p.fase === instrucao.faseAtual
      )
      const qtdPontuacoes = pontuacoesFase.length

      const totalTentativas = avaliacoesInstrucao.length
      const tentativasCorretas = avaliacoesInstrucao.filter(
        (a) => isTentativaCorreta(a.nota, qtdPontuacoes)
      ).length
      const porcentagemAcerto =
        totalTentativas > 0
          ? Math.round((tentativasCorretas / totalTentativas) * 100)
          : 0

      // Buscar critério da fase atual desta instrução
      const criterioFaseAtual = instrucao.fases.find(
        (f) => f.fase === instrucao.faseAtual
      )

      if (!criterioFaseAtual) {
        instrucaoResultados.push({
          instrucaoId: instrucao.id,
          textoInstrucao: instrucao.texto,
          avancou: false,
          regrediu: false,
          faseAnterior: instrucao.faseAtual,
          faseNova: instrucao.faseAtual,
          stats: {
            totalTentativas,
            tentativasCorretas,
            porcentagemAcerto,
            porcentagemCriterio: 80,
            qtdSessoesConsecutivas: 1,
            atingiuCriterio: false,
          },
        })
        continue
      }

      const atingiuNaSessao =
        totalTentativas > 0 &&
        porcentagemAcerto >= criterioFaseAtual.porcentagem_acerto

      // Verificar sessões consecutivas
      let atingiuCriterioGeral = false
      if (atingiuNaSessao) {
        if (criterioFaseAtual.qtd_sessoes_consecutivas <= 1) {
          atingiuCriterioGeral = true
        } else {
          const sessoesConsec = await buscarSessoesConsecutivasPorInstrucao(
            instrucao.id,
            clone.id,
            sessaoCurriculumId,
            criterioFaseAtual.porcentagem_acerto,
            qtdPontuacoes,
            criterioFaseAtual.qtd_sessoes_consecutivas - 1
          )
          atingiuCriterioGeral = sessoesConsec.todasAtingiram
        }
      }

      let faseNova = instrucao.faseAtual
      let avancou = false
      let regrediu = false

      if (atingiuCriterioGeral && criterioFaseAtual.fase_se_atingir) {
        faseNova = criterioFaseAtual.fase_se_atingir
        avancou = true

        await prisma.$transaction([
          prisma.atividadeCloneInstrucao.update({
            where: { id: instrucao.id },
            data: { faseAtual: faseNova },
          }),
          prisma.instrucaoFaseHistorico.create({
            data: {
              id: randomUUID(),
              instrucaoId: instrucao.id,
              faseAnterior: instrucao.faseAtual,
              faseNova,
              motivo: 'CRITERIO_ATINGIDO',
              sessaoCurriculumId,
            },
          }),
        ])
      } else if (!atingiuNaSessao && criterioFaseAtual.fase_se_nao_atingir) {
        const deveVoltar = criterioFaseAtual.fase_se_nao_atingir !== instrucao.faseAtual
        if (deveVoltar) {
          faseNova = criterioFaseAtual.fase_se_nao_atingir
          regrediu = true

          await prisma.$transaction([
            prisma.atividadeCloneInstrucao.update({
              where: { id: instrucao.id },
              data: { faseAtual: faseNova },
            }),
            prisma.instrucaoFaseHistorico.create({
              data: {
                id: randomUUID(),
                instrucaoId: instrucao.id,
                faseAnterior: instrucao.faseAtual,
                faseNova,
                motivo: 'CRITERIO_NAO_ATINGIDO',
                sessaoCurriculumId,
              },
            }),
          ])
        }
      }

      instrucaoResultados.push({
        instrucaoId: instrucao.id,
        textoInstrucao: instrucao.texto,
        avancou,
        regrediu,
        faseAnterior: instrucao.faseAtual,
        faseNova,
        stats: {
          totalTentativas,
          tentativasCorretas,
          porcentagemAcerto,
          porcentagemCriterio: criterioFaseAtual.porcentagem_acerto,
          qtdSessoesConsecutivas: criterioFaseAtual.qtd_sessoes_consecutivas,
          atingiuCriterio: atingiuCriterioGeral,
        },
      })
    }

    if (instrucaoResultados.length === 0) continue

    // Recalcular progresso da atividade com fases atualizadas
    const instrucoesFaseAtualizada = clone.instrucoes.map((instr) => {
      const resultado = instrucaoResultados.find((r) => r.instrucaoId === instr.id)
      return { faseAtual: resultado ? resultado.faseNova : instr.faseAtual }
    })
    const progressoAtividade = calcularProgressoAtividade(instrucoesFaseAtualizada)

    resultados.push({
      atividadeCloneId: clone.id,
      nomeAtividade: clone.nome,
      progressoAtividade,
      instrucoes: instrucaoResultados,
    })
  }

  return resultados
}

/**
 * Verifica se as últimas N sessões finalizadas para uma instrução específica
 * atingiram o critério de porcentagem.
 */
async function buscarSessoesConsecutivasPorInstrucao(
  instrucaoId: string,
  atividadeCloneId: string,
  sessaoAtualId: string,
  porcentagemCriterio: number,
  qtdPontuacoes: number,
  quantidadeNecessaria: number
): Promise<{ todasAtingiram: boolean }> {
  const sessoesComAvaliacoes = await prisma.sessaoCurriculum.findMany({
    where: {
      id: { not: sessaoAtualId },
      status: 'FINALIZADA',
      avaliacoes: {
        some: { instrucaoId, atividadeCloneId },
      },
    },
    include: {
      avaliacoes: {
        where: { instrucaoId, atividadeCloneId },
      },
    },
    orderBy: { finalizada_em: 'desc' },
    take: quantidadeNecessaria,
  })

  if (sessoesComAvaliacoes.length < quantidadeNecessaria) {
    return { todasAtingiram: false }
  }

  for (const sessao of sessoesComAvaliacoes) {
    const total = sessao.avaliacoes.length
    const corretas = sessao.avaliacoes.filter(
      (a) => isTentativaCorreta(a.nota, qtdPontuacoes)
    ).length
    const porcentagem = total > 0 ? Math.round((corretas / total) * 100) : 0

    if (porcentagem < porcentagemCriterio) return { todasAtingiram: false }
  }

  return { todasAtingiram: true }
}
