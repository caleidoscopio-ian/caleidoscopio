'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import ProtectedRoute from '@/components/ProtectedRoute'
import { MainLayout } from '@/components/main-layout'
import { NovaAnamneseForm } from '@/components/forms/nova-anamnese-form'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function EditarAnamnese() {
  const router = useRouter()
  const params = useParams()
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const [anamnese, setAnamnese] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const anamneseId = params.id as string

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Anamneses', href: '/anamnese' },
    { label: 'Editar Anamnese' }
  ]

  useEffect(() => {
    const fetchAnamnese = async () => {
      if (!isAuthenticated || !user) return

      try {
        const userDataEncoded = btoa(JSON.stringify(user))

        const response = await fetch(`/api/anamneses/${anamneseId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Data': userDataEncoded,
            'X-Auth-Token': user.token,
          }
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao buscar anamnese')
        }

        if (result.success) {
          setAnamnese(result.data)
        }
      } catch (error) {
        console.error('Erro ao buscar anamnese:', error)
        toast({
          title: 'Erro',
          description: error instanceof Error ? error.message : 'Erro ao carregar anamnese',
          variant: 'destructive'
        })
        router.push('/anamnese')
      } finally {
        setLoading(false)
      }
    }

    fetchAnamnese()
  }, [anamneseId, isAuthenticated, user])

  const handleSuccess = () => {
    router.push('/anamnese')
  }

  const handleCancel = () => {
    router.push('/anamnese')
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout breadcrumbs={breadcrumbs}>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Carregando anamnese...</p>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    )
  }

  if (!anamnese) {
    return null
  }

  return (
    <ProtectedRoute>
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="max-w-5xl mx-auto">
          <NovaAnamneseForm
            anamneseId={anamneseId}
            initialData={anamnese}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
