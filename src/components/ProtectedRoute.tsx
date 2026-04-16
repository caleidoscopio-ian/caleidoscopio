'use client'

import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'

interface RequiredPermission {
  resource: string
  action: string
}

interface ProtectedRouteProps {
  children: ReactNode
  requiredPermission?: RequiredPermission
}

export default function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth()
  const { can, loading: permsLoading } = usePermissions()
  const router = useRouter()

  const loading = authLoading || (!!requiredPermission && permsLoading)

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push('/login')
      return
    }

    // Verificar permissão RBAC
    if (requiredPermission && !can(requiredPermission.resource, requiredPermission.action)) {
      router.push('/sem-permissao')
    }
  }, [user, loading, router, requiredPermission, can])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center mb-4">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  // Aguardar verificação de permissão antes de renderizar
  if (requiredPermission && !can(requiredPermission.resource, requiredPermission.action)) {
    return null
  }

  return <>{children}</>
}
