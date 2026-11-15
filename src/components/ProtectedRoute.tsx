'use client'

import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import { PageLoader } from '@/components/page-loader'

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

  // Mesma tela de espera do resto do sistema, com a marca de verdade. O
  // desenho que estava aqui (quadrado azul com um ponto branco) não era o
  // logotipo de lugar nenhum — e é a tela que aparece em TODA navegação,
  // enquanto a sessão e as permissões carregam.
  if (loading) {
    return <PageLoader telaCheia />
  }

  if (!user) return null

  // Aguardar verificação de permissão antes de renderizar
  if (requiredPermission && !can(requiredPermission.resource, requiredPermission.action)) {
    return null
  }

  return <>{children}</>
}
