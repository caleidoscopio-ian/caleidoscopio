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

interface EvolucaoResultado {
  atividadeCloneId: string
  nomeAtividade: string
  avancou: boolean
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

/**
 * Determina se uma tentativa é "correta" (acerto/independente).
 * A nota é o índice do botão de pontuação clicado.
 * O último botão da escala ("+"/Independente) é sempre o correto.
 * Ou seja: nota === qtdPontuacoes - 1
 */
function isTentativaCorreta(nota: number, qtdPontuacoes: number): boolean {
  if (qtdPontuacoes <= 0) return false
  return nota === qtdPontuacoes - 1
}

/**
 * Calcula a evolução de fase para todas as atividades clonadas
 * após uma sessão ser finalizada.
 */
export async function calcularEvolucaoAposFinalizacao(
  sessaoCurriculumId: string,
  pacienteCurriculumId: string,
  avaliacoes: AvaliacaoData[]
): Promise<EvolucaoResultado[]> {
  const resultados: EvolucaoResultado[] = []

  // Buscar os clones ativos com fases, critérios e pontuações
  const clones = await prisma.pacienteAtividadeClone.findMany({
    where: {
      pacienteCurriculumId,
      ativo: true,
    },
    include: {
      fases: true,
      pontuacoes: { orderBy: { ordem: 'asc' } },
    },
  })

  for (const clone of clones) {
    // Filtrar avaliações desta atividade na sessão atual
    const avaliacoesClone = avaliacoes.filter(
      (a) => a.atividadeCloneId === clone.id
    )

    if (avaliacoesClone.length === 0) continue

    const qtdPontuacoes = clone.pontuacoes.length

    // Calcular stats da sessão atual
    const totalTentativas = avaliacoesClone.length
    const tentativasCorretas = avaliacoesClone.filter(
      (a) => isTentativaCorreta(a.nota, qtdPontuacoes)
    ).length
    const porcentagemAcerto =
      totalTentativas > 0
        ? Math.round((tentativasCorretas / totalTentativas) * 100)
        : 0

    // Buscar critérios da fase atual
    const criterioFaseAtual = clone.fases.find(
      (f) => f.fase === clone.faseAtual
    )

    if (!criterioFaseAtual) {
      resultados.push({
        atividadeCloneId: clone.id,
        nomeAtividade: clone.nome,
        avancou: false,
        faseAnterior: clone.faseAtual,
        faseNova: clone.faseAtual,
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

    // Verificar se atingiu critério na sessão atual (porcentagem)
    const atingiuNaSessao =
      totalTentativas > 0 &&
      porcentagemAcerto >= criterioFaseAtual.porcentagem_acerto

    // Verificar sessões consecutivas
    let atingiuCriterioGeral = false
    if (atingiuNaSessao) {
      if (criterioFaseAtual.qtd_sessoes_consecutivas <= 1) {
        atingiuCriterioGeral = true
      } else {
        // Buscar as últimas N-1 sessões finalizadas para verificar consecutivas
        const sessoesAnteriores = await buscarSessoesConsecutivas(
          clone.id,
          sessaoCurriculumId,
          criterioFaseAtual.qtd_sessoes_consecutivas - 1
        )
        atingiuCriterioGeral = sessoesAnteriores.todasAtingiram
      }
    }

    let faseNova = clone.faseAtual
    let avancou = false

    if (atingiuCriterioGeral && criterioFaseAtual.fase_se_atingir) {
      // Avançar para próxima fase
      faseNova = criterioFaseAtual.fase_se_atingir
      avancou = true

      await prisma.$transaction([
        // Atualizar fase do clone
        prisma.pacienteAtividadeClone.update({
          where: { id: clone.id },
          data: { faseAtual: faseNova },
        }),
        // Registrar no histórico
        prisma.atividadeFaseHistorico.create({
          data: {
            id: randomUUID(),
            atividadeCloneId: clone.id,
            faseAnterior: clone.faseAtual,
            faseNova,
            motivo: 'CRITERIO_ATINGIDO',
            sessaoCurriculumId,
          },
        }),
      ])
    } else if (!atingiuNaSessao && criterioFaseAtual.fase_se_nao_atingir) {
      // Verificar se deve voltar de fase
      const deveVoltar = criterioFaseAtual.fase_se_nao_atingir !== clone.faseAtual
      if (deveVoltar) {
        faseNova = criterioFaseAtual.fase_se_nao_atingir
        avancou = false

        await prisma.$transaction([
          prisma.pacienteAtividadeClone.update({
            where: { id: clone.id },
            data: { faseAtual: faseNova },
          }),
          prisma.atividadeFaseHistorico.create({
            data: {
              id: randomUUID(),
              atividadeCloneId: clone.id,
              faseAnterior: clone.faseAtual,
              faseNova,
              motivo: 'CRITERIO_NAO_ATINGIDO',
              sessaoCurriculumId,
            },
          }),
        ])
      }
    }

    resultados.push({
      atividadeCloneId: clone.id,
      nomeAtividade: clone.nome,
      avancou,
      faseAnterior: clone.faseAtual,
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

  return resultados
}

/**
 * Busca sessões anteriores finalizadas para verificar se as últimas N
 * consecutivas atingiram o critério para uma atividade clone.
 */
async function buscarSessoesConsecutivas(
  atividadeCloneId: string,
  sessaoAtualId: string,
  quantidadeNecessaria: number
): Promise<{ todasAtingiram: boolean }> {
  // Buscar as últimas N sessões finalizadas que avaliaram esta atividade clone
  const sessoesComAvaliacoes = await prisma.sessaoCurriculum.findMany({
    where: {
      id: { not: sessaoAtualId },
      status: 'FINALIZADA',
      avaliacoes: {
        some: {
          atividadeCloneId,
        },
      },
    },
    include: {
      avaliacoes: {
        where: { atividadeCloneId },
      },
    },
    orderBy: { finalizada_em: 'desc' },
    take: quantidadeNecessaria,
  })

  if (sessoesComAvaliacoes.length < quantidadeNecessaria) {
    return { todasAtingiram: false }
  }

  // Buscar critérios da fase atual do clone e pontuações
  const clone = await prisma.pacienteAtividadeClone.findUnique({
    where: { id: atividadeCloneId },
    include: {
      fases: true,
      pontuacoes: { orderBy: { ordem: 'asc' } },
    },
  })

  if (!clone) return { todasAtingiram: false }

  const criterio = clone.fases.find((f) => f.fase === clone.faseAtual)
  if (!criterio) return { todasAtingiram: false }

  const qtdPontuacoes = clone.pontuacoes.length

  // Verificar cada sessão anterior
  for (const sessao of sessoesComAvaliacoes) {
    const totalTentativas = sessao.avaliacoes.length
    const tentativasCorretas = sessao.avaliacoes.filter(
      (a) => isTentativaCorreta(a.nota, qtdPontuacoes)
    ).length

    const porcentagemSessao =
      totalTentativas > 0
        ? Math.round((tentativasCorretas / totalTentativas) * 100)
        : 0
    const atingiu =
      totalTentativas > 0 &&
      porcentagemSessao >= criterio.porcentagem_acerto

    if (!atingiu) return { todasAtingiram: false }
  }

  return { todasAtingiram: true }
}
