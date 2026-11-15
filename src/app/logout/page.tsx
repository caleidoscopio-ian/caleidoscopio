'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LogoutPage() {
  const { logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Limpar TODOS os dados do localStorage
    const keysToRemove = [
      'edu_auth_user',
      'edu_auth_token',
      'caleidoscopio_user',
      'caleidoscopio_token',
      'caleidoscopio_session_token'
    ]

    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      console.log(`🗑️ Removido: ${key}`)
    })

    // Fazer logout pelo useAuth também
    logout()

    console.log('🚪 Logout completo realizado, todos os dados limpos')
    console.log('🔧 Agora usando Sistema 1 real (localhost:3000)')

    // Redirecionar para login após um delay
    setTimeout(() => {
      window.location.href = '/login' // Usar window.location para forçar refresh
    }, 1500)
  }, [logout, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-danger-soft to-warning-soft flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 rounded-lg bg-danger flex items-center justify-center mb-4">
          <span className="text-white font-bold text-xl">👋</span>
        </div>
        <h1 className="text-ink mb-2">
          Limpando Dados Mock...
        </h1>
        <div className="animate-spin h-4 w-4 border-2 border-danger border-t-transparent rounded-full mx-auto mb-2"></div>
        <p className="text-ink mb-2">Removendo todos os dados mockados</p>
        <p className="text-sm text-ink-3">Configurando para usar Sistema 1 real (porta 3000)</p>
      </div>
    </div>
  )
}