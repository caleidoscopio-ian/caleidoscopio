'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import ProtectedRoute from '@/components/ProtectedRoute'
import { MainLayout } from '@/components/main-layout'
import { NovaAnamneseForm } from '@/components/forms/nova-anamnese-form'

export default function NovaAnamnese() {
  const router = useRouter()
  const { user } = useAuth()

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Anamneses', href: '/anamnese' },
    { label: 'Nova Anamnese' }
  ]

  const handleSuccess = () => {
    router.push('/anamnese')
  }

  const handleCancel = () => {
    router.push('/anamnese')
  }

  return (
    <ProtectedRoute>
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="max-w-5xl mx-auto">
          <NovaAnamneseForm
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
