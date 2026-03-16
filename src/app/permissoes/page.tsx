'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield } from 'lucide-react'
import { MainLayout } from '@/components/main-layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RoleList } from '@/components/rbac/role-list'
import { PermissionMatrix } from '@/components/rbac/permission-matrix'
import { UserRoleAssignment } from '@/components/rbac/user-role-assignment'
import { AuditLog } from '@/components/rbac/audit-log'
import { apiGet, handleApiResponse } from '@/lib/api'

interface Role {
  id: string
  nome: string
  isSystem: boolean
  ativo: boolean
  descricao: string | null
  _count: { usuarios: number }
}

export default function PermissoesPage() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [activeTab, setActiveTab] = useState('perfis')

  const fetchAllRoles = useCallback(async () => {
    try {
      const response = await apiGet('/api/roles?ativo=true')
      if (!response) return
      const data = await handleApiResponse<Role[]>(response)
      setAllRoles(data)
    } catch {
      // silencioso — RoleList já exibe o erro
    }
  }, [])

  useEffect(() => {
    fetchAllRoles()
  }, [fetchAllRoles])

  function handleSelectRole(role: Role) {
    setSelectedRole(role)
    setActiveTab('permissoes')
  }

  return (
    <ProtectedRoute requiredPermission={{ resource: 'permissoes', action: 'VIEW' }}>
      <MainLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Gestão de Permissões</h1>
              <p className="text-muted-foreground">
                Gerencie perfis de acesso e permissões dos usuários
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-lg grid-cols-4">
              <TabsTrigger value="perfis">Perfis</TabsTrigger>
              <TabsTrigger value="permissoes" disabled={!selectedRole}>
                Permissões
              </TabsTrigger>
              <TabsTrigger value="usuarios">Usuários</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            {/* Tab: Perfis */}
            <TabsContent value="perfis" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Perfis de Acesso</CardTitle>
                  <CardDescription>
                    Crie e gerencie perfis customizados. Clique em um perfil para configurar suas permissões.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RoleList
                    onSelectRole={handleSelectRole}
                    selectedRoleId={selectedRole?.id}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Permissões */}
            <TabsContent value="permissoes" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Matriz de Permissões</CardTitle>
                  <CardDescription>
                    Configure quais ações cada perfil pode realizar em cada módulo.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedRole ? (
                    <PermissionMatrix
                      roleId={selectedRole.id}
                      roleName={selectedRole.nome}
                      isSystem={selectedRole.isSystem}
                      allRoles={allRoles}
                    />
                  ) : (
                    <p className="text-center py-12 text-muted-foreground">
                      Selecione um perfil na aba &quot;Perfis&quot; para configurar as permissões.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Usuários */}
            <TabsContent value="usuarios" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Atribuição de Perfis</CardTitle>
                  <CardDescription>
                    Atribua perfis aos usuários da clínica. A justificativa é obrigatória para auditoria.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UserRoleAssignment
                    availableRoles={allRoles.filter(r => r.ativo)}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Histórico */}
            <TabsContent value="historico" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Log de Auditoria</CardTitle>
                  <CardDescription>
                    Registro completo de todas as alterações de perfis. Exportável em CSV.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AuditLog />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
