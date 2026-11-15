'use client'

import { useAuth } from '@/hooks/useAuth'
import ProtectedRoute from '@/components/ProtectedRoute'
import { MainLayout } from '@/components/main-layout'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { AlterarSenhaDialog } from '@/components/alterar-senha-dialog'
import {
  User,
  Mail,
  Building,
  Shield,
  CheckCircle,
} from 'lucide-react'
import { PageHeader, Panel } from '@/components/kit'

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
          <PageHeader
            titulo="Meu Perfil"
            subtitulo="Visualize suas informações e gerencie sua conta"
          />

          <div className="grid gap-6 md:grid-cols-2">
            {/* Informações Pessoais */}
            <Panel
              icone={<User />}
              titulo="Informações Pessoais"
              subtitulo="Seus dados cadastrados no sistema"
            >
              <div className="space-y-4">

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

                <Separator />

                <div>
                  <AlterarSenhaDialog />
                </div>
              </div>
            </Panel>

            {/* Informações da Clínica */}
            <Panel
              icone={<Building />}
              titulo="Clínica"
              subtitulo="Informações da sua clínica"
            >
              <div className="space-y-4">

                <div>
                  <Label className="text-muted-foreground text-sm">Nome da Clínica</Label>
                  <p className="text-base font-medium mt-1">{tenant?.name || '-'}</p>
                </div>

                <Separator />

                <div>
                  <Label className="text-muted-foreground text-sm">Status</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className="bg-success-soft text-success-ink">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Ativa
                    </Badge>
                  </div>
                </div>
              </div>
            </Panel>
          </div>

        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
