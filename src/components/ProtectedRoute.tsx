'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: 'ADMIN' | 'SUPER_ADMIN' | 'USER'
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  console.log('🛡️ ProtectedRoute - Estado atual:', {
    loading,
    user: !!user,
    userEmail: user?.email,
    userName: user?.name,
    role: user?.role,
    requiredRole
  })

  useEffect(() => {
    if (!loading && !user) {
      console.log('❌ ProtectedRoute - Usuário não encontrado, redirecionando para login')
      router.push('/login')
    } else if (!loading && user) {
      console.log('✅ ProtectedRoute - Usuário encontrado:', user.email)

      // Verificar permissão de role se especificada
      if (requiredRole) {
        const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user.role)
        const hasPermission = requiredRole === 'ADMIN' ? isAdmin : user.role === requiredRole

        if (!hasPermission) {
          console.log('❌ ProtectedRoute - Sem permissão, redirecionando para dashboard')
          router.push('/dashboard')
        }
      }
    }
  }, [user, loading, router, requiredRole])

  if (loading) {
    console.log('⏳ ProtectedRoute - Ainda carregando...')
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

  if (!user) {
    console.log('❌ ProtectedRoute - Sem usuário, aguardando redirecionamento...')
    return null
  }

  console.log('✅ ProtectedRoute - Usuário autenticado, exibindo conteúdo')
  return <>{children}</>
}