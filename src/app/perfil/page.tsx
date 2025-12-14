'use client'

import { useAuth } from '@/hooks/useAuth'
import ProtectedRoute from '@/components/ProtectedRoute'
import { MainLayout } from '@/components/main-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Mail,
  Building,
  Shield,
  CheckCircle,
} from 'lucide-react'

export default function PerfilPage() {
  const { user, tenant } = useAuth()

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Meu Perfil' }
  ]

  return (
    <ProtectedRoute>
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
            <p className="text-muted-foreground">
              Visualize suas informações e gerencie sua conta
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Informações Pessoais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações Pessoais
                </CardTitle>
                <CardDescription>Seus dados cadastrados no sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Nome Completo</Label>
                  <p className="text-base font-medium mt-1">{user?.name || '-'}</p>
                </div>

                <Separator />

                <div>
                  <Label className="text-muted-foreground text-sm">Email</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-base">{user?.email || '-'}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-muted-foreground text-sm">Perfil de Acesso</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline">{user?.role || '-'}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informações da Clínica */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Clínica
                </CardTitle>
                <CardDescription>Informações da sua clínica</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Nome da Clínica</Label>
                  <p className="text-base font-medium mt-1">{tenant?.name || '-'}</p>
                </div>

                <Separator />

                <div>
                  <Label className="text-muted-foreground text-sm">ID da Clínica</Label>
                  <p className="text-base text-muted-foreground mt-1 font-mono text-xs">
                    {tenant?.id || '-'}
                  </p>
                </div>

                <Separator />

                <div>
                  <Label className="text-muted-foreground text-sm">Status</Label>
                  <div className="mt-1">
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Ativa
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
