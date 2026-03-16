'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, UserCog, Shield, ShieldOff } from 'lucide-react'
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
import { ChangeRoleDialog } from '@/components/rbac/change-role-dialog'
import { apiGet, handleApiResponse } from '@/lib/api'
import { toast } from 'sonner'

interface Role {
  id: string
  nome: string
  isSystem: boolean
}

interface UsuarioComRole {
  id: string
  nome: string
  email: string
  ssoRole: string
  roleAtual: { id: string; nome: string; isSystem: boolean } | null
  usuarioRoleId: string | null
  ativo: boolean
}

interface UserRoleAssignmentProps {
  availableRoles: Role[]
}

export function UserRoleAssignment({ availableRoles }: UserRoleAssignmentProps) {
  const [usuarios, setUsuarios] = useState<UsuarioComRole[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [editingUser, setEditingUser] = useState<UsuarioComRole | null>(null)

  const fetchUsuarios = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiGet('/api/usuario-roles')
      if (!response) throw new Error('Sem resposta')
      const data = await handleApiResponse<UsuarioComRole[]>(response)
      setUsuarios(data)
    } catch {
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsuarios()
  }, [fetchUsuarios])

  const filteredUsuarios = usuarios.filter(u => {
    if (!busca) return true
    const q = busca.toLowerCase()
    return u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar usuários..."
          className="pl-9"
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Role SSO</TableHead>
              <TableHead>Perfil RBAC</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Carregando usuários...
                </TableCell>
              </TableRow>
            ) : filteredUsuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredUsuarios.map(u => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{u.nome}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {u.ssoRole}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.roleAtual ? (
                      <div className="flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-primary" />
                        <span className="text-sm">{u.roleAtual.nome}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <ShieldOff className="h-3.5 w-3.5" />
                        <span className="text-sm italic">Sem perfil</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingUser(u)}
                    >
                      <UserCog className="h-3.5 w-3.5 mr-1" />
                      {u.roleAtual ? 'Alterar' : 'Atribuir'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingUser && (
        <ChangeRoleDialog
          open={!!editingUser}
          onOpenChange={open => !open && setEditingUser(null)}
          usuarioId={editingUser.id}
          usuarioNome={editingUser.nome}
          currentRoleId={editingUser.roleAtual?.id ?? null}
          roles={availableRoles}
          onSuccess={() => {
            setEditingUser(null)
            fetchUsuarios()
          }}
        />
      )}
    </div>
  )
}
