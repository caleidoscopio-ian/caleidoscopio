'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { Filial } from '@/types/filial'

const STORAGE_KEY = 'caleidoscopio_filial_ativa'

interface FilialContextValue {
  filiais: Filial[]
  filialAtiva: Filial | null  // null = todas as filiais
  setFilialAtiva: (f: Filial | null) => void
  loading: boolean
  isAdmin: boolean
}

const FilialContext = createContext<FilialContextValue | undefined>(undefined)

export function FilialProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [filiais, setFiliais] = useState<Filial[]>([])
  const [filialAtiva, setFilialAtivaState] = useState<Filial | null>(null)
  const [loading, setLoading] = useState(true)
  // isAdmin vem do PERFIL RBAC (página de permissões), não do role do SSO
  const [isAdmin, setIsAdmin] = useState(false)

  const setFilialAtiva = useCallback((f: Filial | null) => {
    setFilialAtivaState(f)
    if (f) {
      localStorage.setItem(STORAGE_KEY, f.id)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLoading(false)
      return
    }

    const headers = {
      'X-User-Data': btoa(JSON.stringify(user)),
      'X-Auth-Token': user.token,
    }

    // 1. Determinar perfil RBAC (fonte de verdade) + filial vinculada
    fetch('/api/me/filial', { headers })
      .then(r => r.json())
      .then(async (me) => {
        const admin = !!me?.isAdmin // RBAC
        setIsAdmin(admin)

        if (!admin) {
          // Não-admin: trava na própria filial vinculada
          if (me?.filial) setFilialAtivaState(me.filial as Filial)
          return
        }

        // Admin: carregar lista completa de filiais para o seletor
        const d = await fetch('/api/filiais?ativas=true', { headers }).then(r => r.json())
        if (d?.success) {
          const lista: Filial[] = d.data
          setFiliais(lista)
          const savedId = localStorage.getItem(STORAGE_KEY)
          if (savedId) {
            const found = lista.find(f => f.id === savedId)
            if (found) setFilialAtivaState(found)
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id])

  return (
    <FilialContext.Provider value={{ filiais, filialAtiva, setFilialAtiva, loading, isAdmin }}>
      {children}
    </FilialContext.Provider>
  )
}

export function useFilialContext(): FilialContextValue {
  const ctx = useContext(FilialContext)
  if (!ctx) throw new Error('useFilialContext deve ser usado dentro de FilialProvider')
  return ctx
}
