/**
 * Script de migração: cria InstrucaoPontuacao para instruções existentes
 * Copia as pontuações da atividade pai (AtividadeClonePontuacao) para cada
 * instrução em cada fase.
 *
 * Execução: npx ts-node scripts/migrate-instrucao-pontuacoes.ts
 */

import { PrismaClient, FaseAtividade } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

const FASES: FaseAtividade[] = ['LINHA_BASE', 'INTERVENCAO', 'MANUTENCAO', 'GENERALIZACAO']

async function main() {
  console.log('🔄 Iniciando migração: InstrucaoPontuacao para instruções existentes...')

  // Buscar instruções que ainda não têm InstrucaoPontuacao
  const instrucoesSemPontuacao = await prisma.atividadeCloneInstrucao.findMany({
    where: {
      pontuacoes: { none: {} },
    },
    select: {
      id: true,
      atividadeCloneId: true,
    },
  })

  console.log(`📋 Encontradas ${instrucoesSemPontuacao.length} instruções sem pontuações por fase`)

  if (instrucoesSemPontuacao.length === 0) {
    console.log('✅ Nenhuma instrução para migrar.')
    return
  }

  // Agrupar por atividadeCloneId para buscar pontuações da atividade
  const cloneIds = [...new Set(instrucoesSemPontuacao.map((i) => i.atividadeCloneId))]

  const pontuacoesPorClone = new Map<string, { sigla: string; grau: string; ordem: number }[]>()
  for (const cloneId of cloneIds) {
    const ponts = await prisma.atividadeClonePontuacao.findMany({
      where: { atividadeCloneId: cloneId },
      orderBy: { ordem: 'asc' },
      select: { sigla: true, grau: true, ordem: true },
    })
    pontuacoesPorClone.set(cloneId, ponts)
  }

  let migradas = 0
  const batchData: {
    id: string
    instrucaoId: string
    fase: FaseAtividade
    ordem: number
    sigla: string
    grau: string
  }[] = []

  for (const instrucao of instrucoesSemPontuacao) {
    const pontuacoesClone = pontuacoesPorClone.get(instrucao.atividadeCloneId) || []

    if (pontuacoesClone.length === 0) continue

    for (const fase of FASES) {
      for (const pont of pontuacoesClone) {
        batchData.push({
          id: randomUUID(),
          instrucaoId: instrucao.id,
          fase,
          ordem: pont.ordem,
          sigla: pont.sigla,
          grau: pont.grau,
        })
      }
    }
    migradas++
  }

  if (batchData.length > 0) {
    // Inserir em batches de 500
    for (let i = 0; i < batchData.length; i += 500) {
      const batch = batchData.slice(i, i + 500)
      await prisma.instrucaoPontuacao.createMany({ data: batch })
    }
  }

  console.log(`✅ Migração concluída: ${migradas} instruções receberam pontuações por fase (${batchData.length} registros criados)`)
}

main()
  .catch((e) => {
    console.error('❌ Erro na migração:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
