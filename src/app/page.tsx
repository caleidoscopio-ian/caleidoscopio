'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        console.log('🏠 Home - Usuário autenticado, redirecionando para dashboard')
        router.push('/dashboard')
      } else {
        console.log('🏠 Home - Usuário não autenticado, redirecionando para login')
        router.push('/login')
      }
    }
  }, [isAuthenticated, loading, router])

  // Página de loading enquanto redireciona
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center mb-4">
          <span className="text-white font-bold text-xl">C</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Caleidoscópio Educacional
        </h1>
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-gray-600">Carregando...</span>
        </div>
      </div>
    </div>
  )
}
