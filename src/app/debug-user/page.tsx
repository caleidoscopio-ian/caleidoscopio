/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel } from "@/components/kit";

export default function DebugUserPage() {
  const { user, isAuthenticated, loading } = useAuth();

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Debug Usuário" },
  ];

  if (loading) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Carregando dados do usuário...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <Panel titulo="❌ Usuário Não Autenticado" className="max-w-2xl mx-auto">

          <p>Nenhum usuário logado encontrado. Faça login primeiro.</p>
        </Panel>
      </MainLayout>
    );
  }

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <PageHeader
          titulo="🔍 Debug - Dados do Usuário"
          subtitulo="Visualize os dados que vêm do Sistema 1 para identificar o tenant correto"
        />

        {/* Informações Básicas */}
        <Panel titulo="👤 Informações do Usuário">
          <div className="space-y-4">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  ID
                </label>
                <p className="font-mono text-sm bg-surface-sunken p-2 rounded">
                  {user.id}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Nome
                </label>
                <p className="text-base">{user.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Email
                </label>
                <p className="font-mono text-sm">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Role
                </label>
                <Badge variant="outline">{user.role}</Badge>
              </div>
            </div>
          </div>
        </Panel>

        {/* Informações do Tenant */}
        {user.tenant && (
          <Panel titulo="🏥 Informações da Clínica/Tenant">
            <div className="space-y-4">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    ID do Tenant
                  </label>
                  <p className="font-mono text-sm bg-brand-soft p-2 rounded border border-brand-soft">
                    {user.tenant.id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Nome da Clínica
                  </label>
                  <p className="text-base font-medium">{user.tenant.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Slug
                  </label>
                  <p className="font-mono text-sm">{user.tenant.slug}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    CNPJ
                  </label>
                  <p className="font-mono text-sm">
                    {user.tenant.cnpj || "Não informado"}
                  </p>
                </div>
              </div>

              {user.tenant.plan && (
                <div className="mt-4 p-4 bg-surface-sunken rounded-lg">
                  <h4 className="font-medium mb-2">📋 Plano</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">
                        ID do Plano
                      </label>
                      <p className="font-mono text-sm">{user.tenant.plan.id}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">
                        Nome do Plano
                      </label>
                      <p className="text-base">{user.tenant.plan.name}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Panel>
        )}

        {/* Configurações */}
        {user.config && (
          <Panel titulo="⚙️ Configurações">

            <pre className="bg-surface-sunken p-4 rounded text-sm overflow-auto">
              {JSON.stringify(user.config, null, 2)}
            </pre>
          </Panel>
        )}

        {/* Dados Brutos */}
        <Panel titulo="📄 Objeto Completo (Debug)">

          <pre className="bg-ink-3 text-success-ink p-4 rounded text-xs overflow-auto max-h-96">
            {JSON.stringify(user, null, 2)}
          </pre>
        </Panel>

        {/* Próximos Passos */}
        <Panel titulo="📋 Próximos Passos" className="bg-brand-soft border-brand-soft">
          <div className="text-brand">

            <ol className="list-decimal list-inside space-y-2">
              <li>
                Copie o <strong>ID do Tenant</strong> mostrado acima:
                <code className="bg-brand-soft px-2 py-1 rounded mx-1">
                  {user.tenant?.id || "N/A"}
                </code>
              </li>
              <li>
                Este será usado para criar pacientes associados à sua clínica
                real
              </li>
              <li>
                Vamos criar um script que use esse tenant ID real ao invés dos
                fictícios
              </li>
            </ol>
          </div>
        </Panel>
      </div>
    </MainLayout>
  );
}
