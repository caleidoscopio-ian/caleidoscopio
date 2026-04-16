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

export function usePermissions(): UsePermissionsReturn {
  const { user } = useAuth()
  const [perms, setPerms] = useState<PermissionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchedFor = useRef<string | null>(null)

  const fetchPermissions = useCallback(async (userId: string) => {
    // Limpar cache legado do sessionStorage (migração)
    try { sessionStorage.removeItem(`rbac_perms_${userId}`) } catch { /* ignore */ }

    try {
      const response = await apiGet(`/api/usuario-roles/${userId}/permissoes`)
      if (!response) throw new Error('Sem resposta')
      const data = await handleApiResponse<PermissionsResponse>(response)
      setPerms(data)
    } catch {
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

    // SSO-fallback: RBAC não configurado para este usuário.
    // O bootstrap (ensureDefaultRole) deveria ter criado a UsuarioRole no login.
    // Se chegou aqui, negar tudo — indica erro de configuração.
    if (perms.source === 'sso-fallback') {
      console.warn('[usePermissions] SSO-fallback ativo — UsuarioRole não encontrada. Execute o seed ou faça re-login.')
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
