'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Shield, ShieldCheck, Users, Pencil, PowerOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { RoleFormDialog } from '@/components/rbac/role-form-dialog'
import { apiGet, apiDelete, handleApiResponse } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

interface Role {
  id: string
  nome: string
  descricao: string | null
  isSystem: boolean
  ativo: boolean
  _count: { usuarios: number }
}

interface RoleListProps {
  onSelectRole?: (role: Role) => void
  selectedRoleId?: string
}

export function RoleList({ onSelectRole, selectedRoleId }: RoleListProps) {
  const { user } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [deletingRole, setDeletingRole] = useState<Role | null>(null)

  const fetchRoles = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const params = busca ? `?busca=${encodeURIComponent(busca)}` : ''
      const response = await apiGet(`/api/roles${params}`)
      if (!response) throw new Error('Sem resposta')
      const data = await handleApiResponse<Role[]>(response)
      setRoles(data)
    } catch {
      toast.error('Erro ao carregar perfis')
    } finally {
      setLoading(false)
    }
  }, [user, busca])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  async function handleDeactivate(role: Role) {
    if (!user) return
    try {
      const response = await apiDelete(`/api/roles/${role.id}`)
      if (!response) throw new Error('Sem resposta')
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao desativar perfil')
      }
      toast.success('Perfil desativado')
      setDeletingRole(null)
      fetchRoles()
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao desativar perfil'
      toast.error(msg)
    }
  }

  function handleEdit(role: Role) {
    setEditingRole(role)
    setFormOpen(true)
  }

  function handleNew() {
    setEditingRole(null)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar perfis..."
            className="pl-9"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Perfil
        </Button>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Perfil</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-center">Usuários</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Carregando perfis...
                </TableCell>
              </TableRow>
            ) : roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum perfil encontrado
                </TableCell>
              </TableRow>
            ) : (
              roles.map(role => (
                <TableRow
                  key={role.id}
                  className={`cursor-pointer hover:bg-muted/50 ${selectedRoleId === role.id ? 'bg-muted' : ''}`}
                  onClick={() => onSelectRole?.(role)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {role.isSystem
                        ? <ShieldCheck className="h-4 w-4 text-primary" />
                        : <Shield className="h-4 w-4 text-muted-foreground" />
                      }
                      <div>
                        <p className="font-medium">{role.nome}</p>
                        {role.descricao && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{role.descricao}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={role.isSystem ? 'default' : 'secondary'}>
                      {role.isSystem ? 'Sistema' : 'Customizado'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{role._count.usuarios}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={role.ativo ? 'default' : 'outline'}>
                      {role.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={role.isSystem}
                        onClick={() => handleEdit(role)}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={role.isSystem || !role.ativo}
                        onClick={() => setDeletingRole(role)}
                        title="Desativar"
                      >
                        <PowerOff className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      <RoleFormDialog
        open={formOpen}
        onOpenChange={open => {
          setFormOpen(open)
          if (!open) setEditingRole(null)
        }}
        role={editingRole}
        onSuccess={fetchRoles}
      />

      <AlertDialog open={!!deletingRole} onOpenChange={open => !open && setDeletingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar perfil</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar o perfil <strong>{deletingRole?.nome}</strong>?
              Usuários com este perfil perderão acesso até receberem um novo perfil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deletingRole && handleDeactivate(deletingRole)}
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
