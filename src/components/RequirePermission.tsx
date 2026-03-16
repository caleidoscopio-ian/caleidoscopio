'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { ShieldOff } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { Button } from '@/components/ui/button'

interface RequirePermissionProps {
  resource: string
  action: string
  children: ReactNode
  /** Se true, exibe página de "Sem permissão" em vez de ocultar */
  showForbidden?: boolean
  /** Fallback customizado quando sem permissão (sem showForbidden) */
  fallback?: ReactNode
}

export function RequirePermission({
  resource,
  action,
  children,
  showForbidden = false,
  fallback = null,
}: RequirePermissionProps) {
  const { can, loading } = usePermissions()

  if (loading) return null

  if (!can(resource, action)) {
    if (showForbidden) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
          <div className="p-4 rounded-full bg-destructive/10">
            <ShieldOff className="h-12 w-12 text-destructive" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Acesso não autorizado</h2>
            <p className="text-muted-foreground mt-1">
              Você não tem permissão para acessar este recurso.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard">Voltar ao Dashboard</Link>
          </Button>
        </div>
      )
    }
    return <>{fallback}</>
  }

  return <>{children}</>
}
