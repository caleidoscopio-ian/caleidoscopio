/**
 * Bootstrap Roles — RBAC Módulo 19
 *
 * Garante que as roles de sistema existam para um tenant (lazy seeding).
 * Chamado durante o login para mapear SSO role → role local.
 */

import { prisma } from '@/lib/prisma'

// ─── Mapa SSO role → role local ──────────────────────────────────────────────

const SSO_ROLE_MAP: Record<string, string> = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN:       'ADMIN',
  USER:        'USER',
  TERAPEUTA:   'USER', // alias
}

// ─── Permissões padrão por role (igual ao seed-rbac.ts) ──────────────────────

const ALL_RESOURCES = [
  'dashboard', 'pacientes', 'agenda', 'prontuarios', 'anamneses',
  'sessoes', 'atividades', 'curriculums', 'avaliacoes', 'evolucao',
  'relatorios', 'terapeutas', 'salas', 'procedimentos', 'usuarios',
  'permissoes', 'configuracoes', 'convenios', 'filiais',
]

type PermissaoMap = Record<string, string[]>

// SUPER_ADMIN e ADMIN: MANAGE em tudo
const PERMISSOES_ADMIN: PermissaoMap = Object.fromEntries(
  ALL_RESOURCES.map(r => [r, ['MANAGE']])
)

// USER (Terapeuta): acesso clínico e educacional, sem admin
const PERMISSOES_USER: PermissaoMap = {
  dashboard:      ['VIEW'],
  pacientes:      ['VIEW', 'CREATE', 'UPDATE'],
  agenda:         ['VIEW', 'CREATE', 'UPDATE'],
  prontuarios:    ['VIEW', 'CREATE', 'UPDATE'],
  anamneses:      ['VIEW', 'CREATE', 'UPDATE'],
  sessoes:        ['VIEW', 'CREATE', 'UPDATE'],
  atividades:     ['VIEW', 'CREATE', 'UPDATE'],
  curriculums:    ['VIEW', 'CREATE', 'UPDATE'],
  avaliacoes:     ['VIEW', 'CREATE', 'UPDATE'],
  evolucao:       ['VIEW', 'CREATE', 'UPDATE'],
  relatorios:     ['VIEW', 'CREATE'],
  terapeutas:     ['VIEW'],
  salas:          ['VIEW'],
  procedimentos:  ['VIEW'],
  permissoes:     ['VIEW'],
  convenios:      ['VIEW'],
  filiais:        ['VIEW'],
}

const SYSTEM_ROLES_DEF = [
  { nome: 'SUPER_ADMIN', descricao: 'Super Administrador — acesso total ao sistema', permissoes: PERMISSOES_ADMIN },
  { nome: 'ADMIN',       descricao: 'Administrador — gerencia a clínica e usuários',  permissoes: PERMISSOES_ADMIN },
  { nome: 'USER',        descricao: 'Terapeuta — acesso clínico e educacional',        permissoes: PERMISSOES_USER  },
]

// ─── Recursos e Ações globais esperados ──────────────────────────────────────
// Espelho do seed-rbac.ts — mantidos aqui para auto-seed no bootstrap.

const RECURSOS_GLOBAIS = [
  { slug: 'dashboard',     nome: 'Dashboard',           modulo: 'Geral',          ordem: 1  },
  { slug: 'pacientes',     nome: 'Pacientes',            modulo: 'Clínico',        ordem: 2  },
  { slug: 'agenda',        nome: 'Agenda',               modulo: 'Clínico',        ordem: 3  },
  { slug: 'prontuarios',   nome: 'Prontuários',          modulo: 'Clínico',        ordem: 4  },
  { slug: 'anamneses',     nome: 'Anamneses',            modulo: 'Clínico',        ordem: 5  },
  { slug: 'sessoes',       nome: 'Sessões',              modulo: 'Clínico',        ordem: 6  },
  { slug: 'atividades',    nome: 'Atividades',           modulo: 'Educacional',    ordem: 7  },
  { slug: 'curriculums',   nome: 'Plano Terapêutico',    modulo: 'Educacional',    ordem: 8  },
  { slug: 'avaliacoes',    nome: 'Avaliações ABA+',      modulo: 'Educacional',    ordem: 9  },
  { slug: 'evolucao',      nome: 'Evolução por Fases',   modulo: 'Educacional',    ordem: 10 },
  { slug: 'relatorios',    nome: 'Relatórios',           modulo: 'Administrativo', ordem: 11 },
  { slug: 'terapeutas',    nome: 'Profissionais',        modulo: 'Administrativo', ordem: 12 },
  { slug: 'salas',         nome: 'Salas',                modulo: 'Administrativo', ordem: 13 },
  { slug: 'convenios',     nome: 'Convênios',            modulo: 'Administrativo', ordem: 14 },
  { slug: 'procedimentos', nome: 'Procedimentos',        modulo: 'Administrativo', ordem: 15 },
  { slug: 'usuarios',      nome: 'Usuários',             modulo: 'Administrativo', ordem: 16 },
  { slug: 'permissoes',    nome: 'Gestão de Permissões', modulo: 'Administrativo', ordem: 17 },
  { slug: 'configuracoes', nome: 'Configurações',        modulo: 'Administrativo', ordem: 18 },
  { slug: 'filiais',       nome: 'Filiais',              modulo: 'Administrativo', ordem: 19 },
]

const ACOES_GLOBAIS = [
  { slug: 'VIEW',    nome: 'Visualizar', ordem: 1 },
  { slug: 'CREATE',  nome: 'Criar',      ordem: 2 },
  { slug: 'UPDATE',  nome: 'Editar',     ordem: 3 },
  { slug: 'DELETE',  nome: 'Deletar',    ordem: 4 },
  { slug: 'EXPORT',  nome: 'Exportar',   ordem: 5 },
  { slug: 'APPROVE', nome: 'Aprovar',    ordem: 6 },
  { slug: 'MANAGE',  nome: 'Gerenciar',  ordem: 7 },
]

// ─── Bootstrap de roles de sistema ───────────────────────────────────────────

/**
 * Garante que as roles de sistema (SUPER_ADMIN, ADMIN, USER) existam
 * para o tenant COM permissões populadas. Idempotente — usa skipDuplicates
 * para adicionar apenas as permissões que faltam (incluindo novos recursos).
 */
export async function ensureTenantRoles(tenantId: string): Promise<void> {
  console.log(`[RBAC Bootstrap] ensureTenantRoles chamado para tenant: ${tenantId}`)

  // Garantir que todos os Recursos e Ações globais existam no banco
  await Promise.all([
    ...RECURSOS_GLOBAIS.map(r =>
      prisma.recurso.upsert({
        where: { slug: r.slug },
        update: {},
        create: r,
      })
    ),
    ...ACOES_GLOBAIS.map(a =>
      prisma.acao.upsert({
        where: { slug: a.slug },
        update: {},
        create: a,
      })
    ),
  ])

  // Buscar todos os recursos e ações (agora garantidamente existentes)
  const [recursos, acoes] = await Promise.all([
    prisma.recurso.findMany(),
    prisma.acao.findMany(),
  ])

  const recursoMap = new Map(recursos.map(r => [r.slug, r.id]))
  const acaoMap = new Map(acoes.map(a => [a.slug, a.id]))

  for (const roleDef of SYSTEM_ROLES_DEF) {
    // Garantir que a role existe
    let roleId: string
    const existing = await prisma.role.findUnique({
      where: { tenantId_nome: { tenantId, nome: roleDef.nome } },
    })

    if (existing) {
      roleId = existing.id
    } else {
      const created = await prisma.role.create({
        data: {
          tenantId,
          nome: roleDef.nome,
          descricao: roleDef.descricao,
          isSystem: true,
          ativo: true,
        },
      })
      roleId = created.id
    }

    // Sempre tentar adicionar permissões — skipDuplicates garante idempotência
    // Isso permite que novos recursos adicionados ao sistema sejam propagados
    const permissoesToCreate: { roleId: string; recursoId: string; acaoId: string }[] = []

    for (const [recursoSlug, acaoSlugs] of Object.entries(roleDef.permissoes)) {
      const recursoId = recursoMap.get(recursoSlug)
      if (!recursoId) continue

      for (const acaoSlug of acaoSlugs) {
        const acaoId = acaoMap.get(acaoSlug)
        if (!acaoId) continue
        permissoesToCreate.push({ roleId, recursoId, acaoId })
      }
    }

    if (permissoesToCreate.length > 0) {
      await prisma.rolePermissao.createMany({
        data: permissoesToCreate,
        skipDuplicates: true,
      })
    }

    console.log(`[RBAC Bootstrap] Role "${roleDef.nome}" para tenant ${tenantId}: verificada (${permissoesToCreate.length} permissões garantidas)`)
  }
}

// ─── Atribuição automática de role no primeiro login ─────────────────────────

/** Dados opcionais do usuário para criação automática de profissional */
interface UserInfo {
  name?: string
  email?: string
}

/**
 * Garante que o usuário tenha uma UsuarioRole local E um registro profissional.
 * - Se não existir UsuarioRole → cria com base na SSO role (primeiro login)
 * - Se existir → mantém a role atribuída (manual tem prioridade sobre SSO)
 * - Se a role não tiver permissões → re-popula via ensureTenantRoles
 * - Se não existir profissional → cria automaticamente
 * Chamado em TODO login — idempotente e auto-corretivo.
 */
export async function ensureDefaultRole(
  userId: string,
  tenantId: string,
  ssoRole: string,
  userInfo?: UserInfo
): Promise<void> {
  // Normalizar SSO role para maiúscula (S1 pode retornar "admin", "ADMIN", etc.)
  const normalizedRole = ssoRole.toUpperCase()
  const localRoleName = SSO_ROLE_MAP[normalizedRole] ?? 'USER'

  console.log(`[RBAC Bootstrap] ensureDefaultRole: user=${userId}, tenant=${tenantId}, ssoRole="${ssoRole}" → "${localRoleName}"`)

  // SEMPRE garantir que as roles de sistema existam com permissões populadas
  await ensureTenantRoles(tenantId)

  // Buscar a role local correspondente à SSO role
  const targetRole = await prisma.role.findUnique({
    where: { tenantId_nome: { tenantId, nome: localRoleName } },
  })

  if (!targetRole) {
    console.error(`[RBAC Bootstrap] Role "${localRoleName}" não encontrada para tenant ${tenantId}`)
    return
  }

  // Verificar se já tem role atribuída
  const existing = await prisma.usuarioRole.findUnique({
    where: { usuarioId_tenantId: { usuarioId: userId, tenantId } },
    include: { role: true },
  })

  if (!existing) {
    // Primeira vez — criar UsuarioRole
    await prisma.usuarioRole.create({
      data: {
        usuarioId: userId,
        tenantId,
        roleId: targetRole.id,
        atribuido_por: 'system',
        justificativa: `Atribuição automática baseada em role SSO: ${ssoRole}`,
        ativo: true,
      },
    })

    await prisma.usuarioRoleHistorico.create({
      data: {
        usuarioId: userId,
        tenantId,
        roleAnteriorId: null,
        roleNovoId: targetRole.id,
        acao: 'ATRIBUICAO',
        alterado_por: 'system',
        justificativa: `Atribuição automática no primeiro login (SSO role: ${ssoRole})`,
      },
    })

    console.log(`[RBAC Bootstrap] UsuarioRole CRIADA: user=${userId}, role=${localRoleName}`)

  } else {
    // Já tem role atribuída — respeitar a atribuição manual, não sobrescrever
    console.log(`[RBAC Bootstrap] UsuarioRole OK (mantida): user=${userId}, role=${existing.role.nome}`)
  }

  // Garantir que exista um profissional vinculado a este usuário no tenant
  await ensureProfissional(userId, tenantId, normalizedRole, userInfo)

  // Garantir que o tenant tenha ao menos uma filial ("Única")
  await ensureFilialPadrao(tenantId)
}

/**
 * Garante que exista um registro profissional vinculado ao usuário.
 * Sem profissional, o usuário não aparece na página /usuarios do Sistema 2.
 * Idempotente — não duplica se já existe.
 */
async function ensureProfissional(
  userId: string,
  tenantId: string,
  ssoRole: string,
  userInfo?: UserInfo
): Promise<void> {
  // Verificar se já existe profissional com este usuarioId
  const existingProf = await prisma.profissional.findFirst({
    where: { usuarioId: userId, tenantId },
  })

  if (existingProf) {
    return
  }

  // Mapear SSO role para especialidade descritiva
  const especialidadeMap: Record<string, string> = {
    SUPER_ADMIN: 'Administrador Geral',
    ADMIN: 'Administrador',
    USER: 'Profissional',
    TERAPEUTA: 'Terapeuta',
  }

  const nome = userInfo?.name || 'Usuário'
  const email = userInfo?.email || undefined
  const normalizedRole = ssoRole.toUpperCase()
  const especialidade = especialidadeMap[normalizedRole] || 'Profissional'

  await prisma.profissional.create({
    data: {
      tenantId,
      usuarioId: userId,
      nome,
      email,
      especialidade,
      ativo: true,
    },
  })

  console.log(`[RBAC Bootstrap] Profissional criado automaticamente: user=${userId}, nome="${nome}", tenant=${tenantId}`)
}

/**
 * Garante que o tenant tenha ao menos uma filial.
 * Cria a filial "Única" se nenhuma existir — ponto de partida para clínicas novas.
 * Idempotente.
 */
async function ensureFilialPadrao(tenantId: string): Promise<void> {
  const count = await prisma.filial.count({ where: { tenantId } })
  if (count > 0) return

  await prisma.filial.create({
    data: { tenantId, nome: 'Única', ativo: true },
  })

  console.log(`[RBAC Bootstrap] Filial "Única" criada automaticamente para tenant ${tenantId}`)
}
