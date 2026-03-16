'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { apiGet, handleApiResponse } from '@/lib/api'

interface PermissionsResponse {
  roleName: string
  roleId: string | null
  permissions: Record<string, string[]>
  source: 'rbac' | 'sso-fallback'
}

interface UsePermissionsReturn {
  loading: boolean
  roleName: string | null
  source: 'rbac' | 'sso-fallback' | null
  can: (resource: string, action: string) => boolean
  canAny: (checks: { resource: string; action: string }[]) => boolean
  canAll: (checks: { resource: string; action: string }[]) => boolean
}

const CACHE_TTL = 5 * 60 * 1000 // 5 min

function getCacheKey(userId: string) {
  return `rbac_perms_${userId}`
}

function readCache(userId: string): PermissionsResponse | null {
  try {
    const raw = sessionStorage.getItem(getCacheKey(userId))
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) {
      sessionStorage.removeItem(getCacheKey(userId))
      return null
    }
    return data as PermissionsResponse
  } catch {
    return null
  }
}

function writeCache(userId: string, data: PermissionsResponse) {
  try {
    sessionStorage.setItem(getCacheKey(userId), JSON.stringify({ data, ts: Date.now() }))
  } catch {
    // sessionStorage indisponível (SSR, modo incógnito cheio, etc.)
  }
}

export function usePermissions(): UsePermissionsReturn {
  const { user } = useAuth()
  const [perms, setPerms] = useState<PermissionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchedFor = useRef<string | null>(null)

  const fetchPermissions = useCallback(async (userId: string) => {
    const cached = readCache(userId)
    if (cached) {
      setPerms(cached)
      setLoading(false)
      return
    }

    try {
      const response = await apiGet(`/api/usuario-roles/${userId}/permissoes`)
      if (!response) throw new Error('Sem resposta')
      const data = await handleApiResponse<PermissionsResponse>(response)
      writeCache(userId, data)
      setPerms(data)
    } catch {
      // Em caso de erro, permitir acesso baseado apenas na role SSO
      setPerms(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    // Evitar fetch duplicado quando o componente re-renderiza
    if (fetchedFor.current === user.id) return
    fetchedFor.current = user.id
    fetchPermissions(user.id)
  }, [user, fetchPermissions])

  function can(resource: string, action: string): boolean {
    if (!perms) return false

    // SSO-fallback: RBAC não está configurado — usar role SSO como substituto
    if (perms.source === 'sso-fallback') {
      const adminRoles = ['ADMIN', 'SUPER_ADMIN']
      // Admin tem acesso total; USER tem acesso limitado
      if (adminRoles.includes(perms.roleName)) return true
      // USER no fallback: permitir VIEW em tudo exceto recursos admin
      const adminOnlyResources = ['usuarios', 'configuracoes']
      if (action === 'VIEW' && !adminOnlyResources.includes(resource)) return true
      return false
    }

    const acoes = perms.permissions[resource]
    if (!acoes) return false
    return acoes.includes('MANAGE') || acoes.includes(action)
  }

  function canAny(checks: { resource: string; action: string }[]): boolean {
    return checks.some(c => can(c.resource, c.action))
  }

  function canAll(checks: { resource: string; action: string }[]): boolean {
    return checks.every(c => can(c.resource, c.action))
  }

  return {
    loading,
    roleName: perms?.roleName ?? null,
    source: perms?.source ?? null,
    can,
    canAny,
    canAll,
  }
}
