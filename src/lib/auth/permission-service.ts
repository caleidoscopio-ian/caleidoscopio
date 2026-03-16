/**
 * Permission Service — RBAC Módulo 19
 *
 * Resolve permissões dinamicamente do banco de dados com cache em memória.
 * MANAGE em um recurso implica todas as ações naquele recurso.
 */

import { prisma } from '@/lib/prisma'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface PermissionSet {
  /** Map: recurso → Set de ações permitidas */
  permissions: Map<string, Set<string>>
  roleName: string
  roleId: string
}

interface CacheEntry {
  data: PermissionSet
  expiresAt: number
}

// ─── Cache in-memory (TTL 5 min) ─────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000
const permissionCache = new Map<string, CacheEntry>()

function getCacheKey(userId: string, tenantId: string): string {
  return `${userId}:${tenantId}`
}

function getCached(userId: string, tenantId: string): PermissionSet | null {
  const entry = permissionCache.get(getCacheKey(userId, tenantId))
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    permissionCache.delete(getCacheKey(userId, tenantId))
    return null
  }
  return entry.data
}

function setCache(userId: string, tenantId: string, data: PermissionSet): void {
  permissionCache.set(getCacheKey(userId, tenantId), {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

/**
 * Invalida o cache de permissões de um usuário.
 * Chamar quando a role ou permissões do usuário forem alteradas.
 */
export function invalidatePermissionCache(userId: string, tenantId: string): void {
  permissionCache.delete(getCacheKey(userId, tenantId))
}

/**
 * Invalida cache de todos os usuários com uma determinada role.
 * Chamar quando as permissões de uma role forem alteradas.
 */
export function invalidateRoleCache(roleId: string): void {
  for (const [key, entry] of permissionCache.entries()) {
    if (entry.data.roleId === roleId) {
      permissionCache.delete(key)
    }
  }
}

// ─── Resolução de Permissões ─────────────────────────────────────────────────

/**
 * Busca as permissões efetivas de um usuário no banco.
 * Retorna null se o usuário não tiver UsuarioRole cadastrado.
 */
export async function getEffectivePermissions(
  userId: string,
  tenantId: string
): Promise<PermissionSet | null> {
  // Verificar cache
  const cached = getCached(userId, tenantId)
  if (cached) return cached

  // Buscar UsuarioRole no banco
  const usuarioRole = await prisma.usuarioRole.findUnique({
    where: { usuarioId_tenantId: { usuarioId: userId, tenantId } },
    include: {
      role: {
        include: {
          permissoes: {
            include: {
              recurso: true,
              acao: true,
            },
          },
        },
      },
    },
  })

  if (!usuarioRole || !usuarioRole.ativo) return null

  // Montar mapa de permissões
  const permissions = new Map<string, Set<string>>()

  for (const perm of usuarioRole.role.permissoes) {
    const recursoSlug = perm.recurso.slug
    const acaoSlug = perm.acao.slug

    if (!permissions.has(recursoSlug)) {
      permissions.set(recursoSlug, new Set())
    }
    permissions.get(recursoSlug)!.add(acaoSlug)
  }

  const result: PermissionSet = {
    permissions,
    roleName: usuarioRole.role.nome,
    roleId: usuarioRole.role.id,
  }

  setCache(userId, tenantId, result)
  return result
}

/**
 * Verifica se um usuário tem permissão para uma ação em um recurso.
 * MANAGE em qualquer recurso implica todas as ações naquele recurso.
 *
 * Retorna null se não houver registro RBAC (usar fallback legado).
 */
export async function checkPermission(
  userId: string,
  tenantId: string,
  resource: string,
  action: string
): Promise<boolean | null> {
  const permSet = await getEffectivePermissions(userId, tenantId)

  // null = sem registro RBAC → usar fallback legado
  if (permSet === null) return null

  const acoes = permSet.permissions.get(resource)
  if (!acoes) return false

  // MANAGE implica todas as ações
  if (acoes.has('MANAGE')) return true

  return acoes.has(action)
}

/**
 * Verifica múltiplas permissões de uma vez.
 * Retorna null se não houver registro RBAC.
 */
export async function checkAnyPermission(
  userId: string,
  tenantId: string,
  checks: { resource: string; action: string }[]
): Promise<boolean | null> {
  const permSet = await getEffectivePermissions(userId, tenantId)
  if (permSet === null) return null

  return checks.some(({ resource, action }) => {
    const acoes = permSet.permissions.get(resource)
    if (!acoes) return false
    return acoes.has('MANAGE') || acoes.has(action)
  })
}
