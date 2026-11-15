'use client'

import { useState, useEffect, useCallback } from 'react'
import { History as HistoryIcon, KeyRound, Shield, Users } from 'lucide-react'
import { MainLayout } from '@/components/main-layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RoleList } from '@/components/rbac/role-list'
import { PermissionMatrix } from '@/components/rbac/permission-matrix'
import { UserRoleAssignment } from '@/components/rbac/user-role-assignment'
import { AuditLog } from '@/components/rbac/audit-log'
import { apiGet, handleApiResponse } from '@/lib/api'
import { EstadoVazio, PageHeader, Panel } from '@/components/kit'

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
        <div className="space-y-7">
          <PageHeader
            icone={<Shield />}
            titulo="Gestão de Permissões"
            subtitulo="Gerencie perfis de acesso e permissões dos usuários"
          />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="perfis">Perfis</TabsTrigger>
              <TabsTrigger value="permissoes" disabled={!selectedRole}>
                Permissões
              </TabsTrigger>
              <TabsTrigger value="usuarios">Usuários</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>

            {/* Tab: Perfis */}
            <TabsContent value="perfis" className="mt-5">
              <Panel
                icone={<Shield />}
                titulo="Perfis de Acesso"
                subtitulo="Crie e gerencie perfis customizados. Clique em um perfil para configurar suas permissões."
              >
                <RoleList
                  onSelectRole={handleSelectRole}
                  selectedRoleId={selectedRole?.id}
                />
              </Panel>
            </TabsContent>

            {/* Tab: Permissões */}
            <TabsContent value="permissoes" className="mt-5">
              <Panel
                icone={<KeyRound />}
                titulo="Matriz de Permissões"
                subtitulo="Configure quais ações cada perfil pode realizar em cada módulo."
              >
                {selectedRole ? (
                  <PermissionMatrix
                    roleId={selectedRole.id}
                    roleName={selectedRole.nome}
                    isSystem={selectedRole.isSystem}
                    allRoles={allRoles}
                  />
                ) : (
                  <EstadoVazio
                    icone={<KeyRound />}
                    titulo="Nenhum perfil selecionado"
                    texto="Selecione um perfil na aba “Perfis” para configurar as permissões."
                  />
                )}
              </Panel>
            </TabsContent>

            {/* Tab: Usuários */}
            <TabsContent value="usuarios" className="mt-5">
              <Panel
                icone={<Users />}
                titulo="Atribuição de Perfis"
                subtitulo="Atribua perfis aos usuários da clínica. A justificativa é obrigatória para auditoria."
              >
                <UserRoleAssignment
                  availableRoles={allRoles.filter(r => r.ativo)}
                />
              </Panel>
            </TabsContent>

            {/* Tab: Histórico */}
            <TabsContent value="historico" className="mt-5">
              <Panel
                icone={<HistoryIcon />}
                titulo="Log de Auditoria"
                subtitulo="Registro completo de todas as alterações de perfis. Exportável em CSV."
              >
                <AuditLog />
              </Panel>
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
