'use client'

import { useAuth } from '@/hooks/useAuth'
import ProtectedRoute from '@/components/ProtectedRoute'
import { MainLayout } from '@/components/main-layout'
import { AlterarSenhaDialog } from '@/components/alterar-senha-dialog'
import { User, Mail, Building, Shield, CheckCircle } from 'lucide-react'
import { PageHeader, Panel, PersonAvatar, StatusPill } from '@/components/kit'

/** Campo da ficha: rótulo pequeno em `ink-3`, valor em `ink`, hairline embaixo
 *  — medido no clone do v2 (/perfil). */
function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 border-b border-hairline py-4 first:pt-0 last:border-none last:pb-0">
      <p className="text-[0.78rem] text-ink-3">{rotulo}</p>
      <div className="text-[0.95rem] text-ink">{children}</div>
    </div>
  )
}

export default function PerfilPage() {
  const { user, tenant } = useAuth()

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Meu Perfil' }
  ]

  return (
    <ProtectedRoute>
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-7">
          <PageHeader
            titulo="Meu Perfil"
            subtitulo="Visualize suas informações e gerencie sua conta"
          />

          <div className="grid items-start gap-5 md:grid-cols-2">
            <Panel
              icone={<User />}
              titulo="Informações Pessoais"
              subtitulo="Seus dados cadastrados no sistema"
            >
              <div className="mb-5 flex items-center gap-4 rounded-2xl bg-surface-muted p-4">
                <PersonAvatar nome={user?.name || '?'} tamanho={56} />
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-ink">{user?.name || '-'}</p>
                  <p className="truncate text-[0.8rem] text-ink-3">{user?.email || '-'}</p>
                </div>
              </div>

              <Campo rotulo="Nome Completo">{user?.name || '-'}</Campo>
              <Campo rotulo="Email">
                <span className="flex items-center gap-2">
                  <Mail className="size-4 text-ink-3" />
                  {user?.email || '-'}
                </span>
              </Campo>
              <Campo rotulo="Perfil de Acesso">
                <span className="flex items-center gap-2">
                  <Shield className="size-4 text-ink-3" />
                  <StatusPill tom="info">{user?.role || '-'}</StatusPill>
                </span>
              </Campo>
              <div className="pt-4">
                <AlterarSenhaDialog />
              </div>
            </Panel>

            <Panel
              icone={<Building />}
              titulo="Clínica"
              subtitulo="Informações da sua clínica"
            >
              <Campo rotulo="Nome da Clínica">{tenant?.name || '-'}</Campo>
              <Campo rotulo="Status">
                <StatusPill tom="success">
                  <CheckCircle className="size-3.5" />
                  Ativa
                </StatusPill>
              </Campo>
            </Panel>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
