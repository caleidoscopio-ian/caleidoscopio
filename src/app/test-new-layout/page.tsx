'use client'

import { MainLayout } from '@/components/main-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function TestNewLayoutPage() {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Teste do Novo Layout' }
  ]

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">🎉 Novo Layout do Caleidoscópio</h1>
            <p className="text-muted-foreground">
              Teste do sistema moderno com shadcn/ui sidebar
            </p>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700">
            ✅ Sistema Moderno
          </Badge>
        </div>

        {/* Comparação de Features */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">✅ Sistema Antigo</CardTitle>
              <CardDescription>Funcionalidades já implementadas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <span>✅</span> <span>Sidebar custom manual</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✅</span> <span>Role-based navigation</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✅</span> <span>User info simples</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✅</span> <span>Logo no sidebar</span>
              </div>
              <div className="flex items-center gap-2">
                <span>✅</span> <span>Breadcrumbs no header</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-blue-600">🚀 Sistema Novo</CardTitle>
              <CardDescription>Melhorias com shadcn/ui moderno</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <span>🆕</span> <span>Sidebar shadcn/ui moderna</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🆕</span> <span>Navegação hierárquica por grupos</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🆕</span> <span>NavUser com dropdown menu</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🆕</span> <span>Logo integrado no header</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🆕</span> <span>SidebarTrigger para collapse</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🆕</span> <span>Tooltips quando collapsed</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🆕</span> <span>Responsividade automática</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle>🧪 Como Testar</CardTitle>
            <CardDescription>
              Experimente as novas funcionalidades do sidebar moderno
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">🔍 Navegação por Grupos</h4>
                <p className="text-sm text-muted-foreground">
                  O sidebar agora agrupa os itens por categoria (Aprendizado, Gestão Clínica, etc)
                  baseado no seu role de usuário.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">👤 Dropdown do Usuário</h4>
                <p className="text-sm text-muted-foreground">
                  Clique no seu avatar no rodapé do sidebar para acessar Sistema Manager,
                  Suporte e Logout.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">📱 Responsividade</h4>
                <p className="text-sm text-muted-foreground">
                  Em mobile, o sidebar se transforma em um drawer.
                  No desktop, use o botão de toggle para expandir/colapsar.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">🖼️ Logo no Header</h4>
                <p className="text-sm text-muted-foreground">
                  O logo agora fica no header principal junto com o botão de toggle
                  e breadcrumbs, seguindo padrões modernos.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button asChild>
                <a href="/dashboard">
                  ← Voltar para Dashboard (Sistema Antigo)
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}