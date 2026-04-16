/**
 * Seed RBAC — Módulo 19
 * Popula recursos, ações e roles de sistema.
 * Idempotente: pode ser executado múltiplas vezes sem duplicar dados.
 *
 * Executar: npx ts-node prisma/seed-rbac.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Recursos do Sistema ────────────────────────────────────────────────────

const RECURSOS = [
  { slug: 'dashboard',      nome: 'Dashboard',            modulo: 'Geral',           ordem: 1  },
  { slug: 'pacientes',      nome: 'Pacientes',             modulo: 'Clínico',         ordem: 2  },
  { slug: 'agenda',         nome: 'Agenda',                modulo: 'Clínico',         ordem: 3  },
  { slug: 'prontuarios',    nome: 'Prontuários',           modulo: 'Clínico',         ordem: 4  },
  { slug: 'anamneses',      nome: 'Anamneses',             modulo: 'Clínico',         ordem: 5  },
  { slug: 'sessoes',        nome: 'Sessões',               modulo: 'Clínico',         ordem: 6  },
  { slug: 'atividades',     nome: 'Atividades',            modulo: 'Educacional',     ordem: 7  },
  { slug: 'curriculums',    nome: 'Plano Terapêutico',     modulo: 'Educacional',     ordem: 8  },
  { slug: 'avaliacoes',     nome: 'Avaliações ABA+',       modulo: 'Educacional',     ordem: 9  },
  { slug: 'evolucao',       nome: 'Evolução por Fases',    modulo: 'Educacional',     ordem: 10 },
  { slug: 'relatorios',     nome: 'Relatórios',            modulo: 'Administrativo',  ordem: 11 },
  { slug: 'terapeutas',     nome: 'Profissionais',         modulo: 'Administrativo',  ordem: 12 },
  { slug: 'salas',          nome: 'Salas',                 modulo: 'Administrativo',  ordem: 13 },
  { slug: 'convenios',      nome: 'Convênios',             modulo: 'Administrativo',  ordem: 14 },
  { slug: 'procedimentos',  nome: 'Procedimentos',         modulo: 'Administrativo',  ordem: 15 },
  { slug: 'usuarios',       nome: 'Usuários',              modulo: 'Administrativo',  ordem: 16 },
  { slug: 'permissoes',     nome: 'Gestão de Permissões',  modulo: 'Administrativo',  ordem: 17 },
  { slug: 'configuracoes',  nome: 'Configurações',         modulo: 'Administrativo',  ordem: 18 },
]

// ─── Ações ──────────────────────────────────────────────────────────────────

const ACOES = [
  { slug: 'VIEW',    nome: 'Visualizar', ordem: 1 },
  { slug: 'CREATE',  nome: 'Criar',      ordem: 2 },
  { slug: 'UPDATE',  nome: 'Editar',     ordem: 3 },
  { slug: 'DELETE',  nome: 'Deletar',    ordem: 4 },
  { slug: 'EXPORT',  nome: 'Exportar',   ordem: 5 },
  { slug: 'APPROVE', nome: 'Aprovar',    ordem: 6 },
  { slug: 'MANAGE',  nome: 'Gerenciar',  ordem: 7 }, // MANAGE = todas as ações
]

// ─── Permissões por Role ────────────────────────────────────────────────────

type PermissaoMap = Record<string, string[]>

// SUPER_ADMIN e ADMIN: MANAGE em tudo (implica todas as ações)
const PERMISSOES_ADMIN: PermissaoMap = Object.fromEntries(
  RECURSOS.map(r => [r.slug, ['MANAGE']])
)

// USER (Terapeuta): acesso clínico e educacional, sem admin
const PERMISSOES_USER: PermissaoMap = {
  dashboard:     ['VIEW'],
  pacientes:     ['VIEW', 'CREATE', 'UPDATE'],
  agenda:        ['VIEW', 'CREATE', 'UPDATE'],
  prontuarios:   ['VIEW', 'CREATE', 'UPDATE'],
  anamneses:     ['VIEW', 'CREATE', 'UPDATE'],
  sessoes:       ['VIEW', 'CREATE', 'UPDATE'],
  atividades:    ['VIEW', 'CREATE', 'UPDATE'],
  curriculums:   ['VIEW', 'CREATE', 'UPDATE'],
  avaliacoes:    ['VIEW', 'CREATE', 'UPDATE'],
  evolucao:      ['VIEW', 'CREATE', 'UPDATE'],
  relatorios:    ['VIEW', 'CREATE'],
  terapeutas:    ['VIEW'],
  salas:         ['VIEW'],
  convenios:     ['VIEW'],
  procedimentos: ['VIEW'],
  usuarios:      [],
  permissoes:    ['VIEW'],
}

// ─── Roles de Sistema (por tenant) ──────────────────────────────────────────

const SYSTEM_ROLES = [
  { nome: 'SUPER_ADMIN', descricao: 'Super Administrador — acesso total ao sistema', permissoes: PERMISSOES_ADMIN },
  { nome: 'ADMIN',       descricao: 'Administrador — gerencia a clínica e usuários',  permissoes: PERMISSOES_ADMIN },
  { nome: 'USER',        descricao: 'Terapeuta — acesso clínico e educacional',       permissoes: PERMISSOES_USER  },
]

// ─── Funções de Seed ─────────────────────────────────────────────────────────

async function seedRecursos() {
  console.log('📦 Seeding recursos...')
  for (const recurso of RECURSOS) {
    await prisma.recurso.upsert({
      where: { slug: recurso.slug },
      update: { nome: recurso.nome, modulo: recurso.modulo, ordem: recurso.ordem },
      create: recurso,
    })
  }
  console.log(`   ✅ ${RECURSOS.length} recursos`)
}

async function seedAcoes() {
  console.log('⚡ Seeding ações...')
  for (const acao of ACOES) {
    await prisma.acao.upsert({
      where: { slug: acao.slug },
      update: { nome: acao.nome, ordem: acao.ordem },
      create: acao,
    })
  }
  console.log(`   ✅ ${ACOES.length} ações`)
}

async function seedRolesForTenant(tenantId: string) {
  console.log(`🏥 Seeding roles para tenant: ${tenantId}`)

  // Buscar todos os recursos e ações para mapear IDs
  const recursos = await prisma.recurso.findMany()
  const acoes = await prisma.acao.findMany()

  const recursoMap = new Map(recursos.map(r => [r.slug, r.id]))
  const acaoMap = new Map(acoes.map(a => [a.slug, a.id]))

  for (const roleDef of SYSTEM_ROLES) {
    // Criar ou atualizar a role
    const role = await prisma.role.upsert({
      where: { tenantId_nome: { tenantId, nome: roleDef.nome } },
      update: { descricao: roleDef.descricao, isSystem: true, ativo: true },
      create: {
        tenantId,
        nome: roleDef.nome,
        descricao: roleDef.descricao,
        isSystem: true,
        ativo: true,
      },
    })

    // Montar permissões da role
    const permissoesParaCriar: { roleId: string; recursoId: string; acaoId: string }[] = []

    for (const [recursoSlug, acaoSlugs] of Object.entries(roleDef.permissoes)) {
      const recursoId = recursoMap.get(recursoSlug)
      if (!recursoId) continue

      for (const acaoSlug of acaoSlugs) {
        const acaoId = acaoMap.get(acaoSlug)
        if (!acaoId) continue
        permissoesParaCriar.push({ roleId: role.id, recursoId, acaoId })
      }
    }

    // Upsert permissões (não duplicar)
    for (const perm of permissoesParaCriar) {
      await prisma.rolePermissao.upsert({
        where: {
          roleId_recursoId_acaoId: {
            roleId: perm.roleId,
            recursoId: perm.recursoId,
            acaoId: perm.acaoId,
          },
        },
        update: {},
        create: perm,
      })
    }

    console.log(`   ✅ Role "${roleDef.nome}" com ${permissoesParaCriar.length} permissões`)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Iniciando seed RBAC...\n')

  // 1. Seed de dados globais (recursos e ações)
  await seedRecursos()
  await seedAcoes()

  // 2. Seed de roles para tenants específicos (se passado como argumento)
  const tenantId = process.argv[2]
  if (tenantId) {
    console.log('')
    await seedRolesForTenant(tenantId)
  } else {
    console.log('\n💡 Para criar roles de sistema em um tenant específico:')
    console.log('   npx ts-node prisma/seed-rbac.ts <tenantId>')
    console.log('\n   As roles são criadas automaticamente no primeiro login do usuário.')
  }

  console.log('\n✅ Seed RBAC concluído!')
}

main()
  .catch(e => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
