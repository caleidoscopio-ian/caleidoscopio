/**
 * Script de migração: cria InstrucaoFase para instruções existentes
 * que ainda não possuem critérios de evolução por instrução.
 *
 * Execução: npx ts-node scripts/migrate-instrucao-fases.ts
 */

import { PrismaClient, FaseAtividade } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

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

async function main() {
  console.log('🔄 Iniciando migração: InstrucaoFase para instruções existentes...')

  // Buscar todas as instruções que ainda não têm InstrucaoFase
  const instrucoesSemFase = await prisma.atividadeCloneInstrucao.findMany({
    where: {
      fases: { none: {} },
    },
    include: {
      atividadeClone: {
        select: {
          faseAtual: true,
          fases: {
            select: {
              fase: true,
              porcentagem_acerto: true,
              qtd_sessoes_consecutivas: true,
              fase_se_atingir: true,
              fase_se_nao_atingir: true,
            },
          },
        },
      },
    },
  })

  console.log(`📋 Encontradas ${instrucoesSemFase.length} instruções sem critérios de fase`)

  if (instrucoesSemFase.length === 0) {
    console.log('✅ Nenhuma instrução para migrar.')
    return
  }

  let migradas = 0

  for (const instrucao of instrucoesSemFase) {
    const faseAtualClone = instrucao.atividadeClone.faseAtual
    const fasesClone = instrucao.atividadeClone.fases

    // Usar critérios da atividade pai se existirem, senão usar defaults
    const fasesParaCriar = FASES_PADRAO.map((padrao) => {
      const faseClone = fasesClone.find((f) => f.fase === padrao.fase)
      return {
        id: randomUUID(),
        instrucaoId: instrucao.id,
        fase: padrao.fase,
        porcentagem_acerto: faseClone?.porcentagem_acerto ?? padrao.porcentagem_acerto,
        qtd_sessoes_consecutivas: faseClone?.qtd_sessoes_consecutivas ?? padrao.qtd_sessoes_consecutivas,
        fase_se_atingir: faseClone?.fase_se_atingir ?? padrao.fase_se_atingir,
        fase_se_nao_atingir: faseClone?.fase_se_nao_atingir ?? padrao.fase_se_nao_atingir,
      }
    })

    // Atualizar faseAtual da instrução para herdar da atividade pai
    await prisma.$transaction([
      prisma.atividadeCloneInstrucao.update({
        where: { id: instrucao.id },
        data: { faseAtual: faseAtualClone },
      }),
      prisma.instrucaoFase.createMany({ data: fasesParaCriar }),
    ])

    migradas++
  }

  console.log(`✅ Migração concluída: ${migradas} instruções atualizadas com critérios de fase`)
}

main()
  .catch((e) => {
    console.error('❌ Erro na migração:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
