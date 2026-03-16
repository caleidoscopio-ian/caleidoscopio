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
  'permissoes', 'configuracoes',
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
}

const SYSTEM_ROLES_DEF = [
  { nome: 'SUPER_ADMIN', descricao: 'Super Administrador — acesso total ao sistema', permissoes: PERMISSOES_ADMIN },
  { nome: 'ADMIN',       descricao: 'Administrador — gerencia a clínica e usuários',  permissoes: PERMISSOES_ADMIN },
  { nome: 'USER',        descricao: 'Terapeuta — acesso clínico e educacional',        permissoes: PERMISSOES_USER  },
]

// ─── Bootstrap de roles de sistema ───────────────────────────────────────────

/**
 * Garante que as roles de sistema (SUPER_ADMIN, ADMIN, USER) existam
 * para o tenant COM permissões populadas. Idempotente — não duplica.
 */
export async function ensureTenantRoles(tenantId: string): Promise<void> {
  console.log(`[RBAC Bootstrap] ensureTenantRoles chamado para tenant: ${tenantId}`)

  // Buscar todos os recursos e ações do banco (globais, já seed-ados)
  const [recursos, acoes] = await Promise.all([
    prisma.recurso.findMany(),
    prisma.acao.findMany(),
  ])

  console.log(`[RBAC Bootstrap] Encontrados ${recursos.length} recursos e ${acoes.length} ações no banco`)

  const recursoMap = new Map(recursos.map(r => [r.slug, r.id]))
  const acaoMap = new Map(acoes.map(a => [a.slug, a.id]))

  // Se não há recursos/ações no banco, não faz sentido continuar
  if (recursos.length === 0 || acoes.length === 0) {
    console.error('[RBAC Bootstrap] ⚠️ TABELAS RECURSO/ACAO VAZIAS! Execute: npx ts-node prisma/seed-rbac.ts')
    return
  }

  for (const roleDef of SYSTEM_ROLES_DEF) {
    // Verificar se a role já existe
    const existing = await prisma.role.findUnique({
      where: { tenantId_nome: { tenantId, nome: roleDef.nome } },
      include: { _count: { select: { permissoes: true } } },
    })

    if (existing && existing._count.permissoes > 0) {
      // Role já existe COM permissões — nada a fazer
      continue
    }

    let roleId: string

    if (existing) {
      // Role existe mas SEM permissões — precisamos popular
      roleId = existing.id
    } else {
      // Criar a role
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

    // Montar permissões a partir da definição inline (NÃO depende de template)
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

    console.log(`[RBAC Bootstrap] Role "${roleDef.nome}" para tenant ${tenantId}: ${permissoesToCreate.length} permissões`)
  }
}

// ─── Atribuição automática de role no primeiro login ─────────────────────────

/**
 * Garante que o usuário tenha uma UsuarioRole local.
 * Se não existir, cria mapeando a SSO role para a role local correspondente.
 * Chamado no login — idempotente.
 */
export async function ensureDefaultRole(
  userId: string,
  tenantId: string,
  ssoRole: string
): Promise<void> {
  console.log(`[RBAC Bootstrap] ensureDefaultRole: user=${userId}, tenant=${tenantId}, ssoRole=${ssoRole}`)

  // SEMPRE garantir que as roles de sistema existam com permissões populadas
  // (idempotente — pula roles que já têm permissões)
  await ensureTenantRoles(tenantId)

  // Verificar se já tem role atribuída
  const existing = await prisma.usuarioRole.findUnique({
    where: { usuarioId_tenantId: { usuarioId: userId, tenantId } },
    include: { role: { include: { _count: { select: { permissoes: true } } } } },
  })

  if (existing) {
    console.log(`[RBAC Bootstrap] UsuarioRole já existe: role=${existing.role.nome}, permissões=${existing.role._count.permissoes}`)
    return
  }

  // Mapear SSO role → nome da role local
  const localRoleName = SSO_ROLE_MAP[ssoRole] ?? 'USER'
  console.log(`[RBAC Bootstrap] Mapeamento SSO: "${ssoRole}" → "${localRoleName}"`)


  // Buscar a role local
  const role = await prisma.role.findUnique({
    where: { tenantId_nome: { tenantId, nome: localRoleName } },
  })

  if (!role) {
    console.error(`[RBAC Bootstrap] Role "${localRoleName}" não encontrada para tenant ${tenantId}`)
    return
  }

  // Criar UsuarioRole (sistema faz a atribuição inicial)
  await prisma.usuarioRole.create({
    data: {
      usuarioId: userId,
      tenantId,
      roleId: role.id,
      atribuido_por: 'system',
      justificativa: `Atribuição automática baseada em role SSO: ${ssoRole}`,
      ativo: true,
    },
  })

  // Registrar histórico
  await prisma.usuarioRoleHistorico.create({
    data: {
      usuarioId: userId,
      tenantId,
      roleAnteriorId: null,
      roleNovoId: role.id,
      acao: 'ATRIBUICAO',
      alterado_por: 'system',
      justificativa: `Atribuição automática no primeiro login (SSO role: ${ssoRole})`,
    },
  })

  console.log(`[RBAC Bootstrap] UsuarioRole criada: user=${userId}, role=${localRoleName}, tenant=${tenantId}`)
}
