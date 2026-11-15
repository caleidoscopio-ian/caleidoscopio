"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Shield,
  ShieldCheck,
  Users,
  Pencil,
  Ban,
} from "lucide-react";
import { ActionButton, IconButton, SearchField, StatusPill } from "@/components/kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RoleFormDialog } from "@/components/rbac/role-form-dialog";
import { apiGet, apiDelete, handleApiResponse } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Role {
  id: string;
  nome: string;
  descricao: string | null;
  isSystem: boolean;
  ativo: boolean;
  _count: { usuarios: number };
}

interface RoleListProps {
  onSelectRole?: (role: Role) => void;
  selectedRoleId?: string;
}

export function RoleList({ onSelectRole, selectedRoleId }: RoleListProps) {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  const fetchRoles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = busca ? `?busca=${encodeURIComponent(busca)}` : "";
      const response = await apiGet(`/api/roles${params}`);
      if (!response) throw new Error("Sem resposta");
      const data = await handleApiResponse<Role[]>(response);
      setRoles(data);
    } catch {
      toast.error("Erro ao carregar perfis");
    } finally {
      setLoading(false);
    }
  }, [user, busca]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  async function handleDeactivate(role: Role) {
    if (!user) return;
    try {
      const response = await apiDelete(`/api/roles/${role.id}`);
      if (!response) throw new Error("Sem resposta");
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao desativar perfil");
      }
      toast.success("Perfil desativado");
      setDeletingRole(null);
      fetchRoles();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Erro ao desativar perfil";
      toast.error(msg);
    }
  }

  function handleEdit(role: Role) {
    setEditingRole(role);
    setFormOpen(true);
  }

  function handleNew() {
    setEditingRole(null);
    setFormOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <SearchField
          placeholder="Buscar perfis..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 max-w-sm"
        />
        <ActionButton onClick={handleNew}>
          <Plus />
          Novo Perfil
        </ActionButton>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Perfil</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-center">Usuários</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-ink-3">
                  Carregando perfis...
                </TableCell>
              </TableRow>
            ) : roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-ink-3">
                  Nenhum perfil encontrado
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow
                  key={role.id}
                  className={`cursor-pointer transition-colors hover:bg-brand-soft/60 ${selectedRoleId === role.id ? "bg-brand-soft/60" : ""}`}
                  onClick={() => onSelectRole?.(role)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {/* Chip sobre a faixa: perfil de sistema leva o escudo
                          com check na cor da marca */}
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                          role.isSystem ? "bg-brand-soft text-brand" : "bg-surface text-ink-2"
                        }`}
                      >
                        {role.isSystem ? (
                          <ShieldCheck className="size-[18px]" />
                        ) : (
                          <Shield className="size-[18px]" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{role.nome}</p>
                        {role.descricao && (
                          <p className="line-clamp-1 text-[0.75rem] text-ink-3">
                            {role.descricao}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusPill tom={role.isSystem ? "info" : "violet"}>
                      {role.isSystem ? "Sistema" : "Customizado"}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="size-3.5 text-ink-3" />
                      <span className="tabular text-sm text-ink">{role._count.usuarios}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusPill tom={role.ativo ? "success" : "neutral"}>
                      {role.ativo ? "Ativo" : "Inativo"}
                    </StatusPill>
                  </TableCell>
                  <TableCell>
                    <div
                      className="flex justify-end gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconButton
                        aria-label={`Editar ${role.nome}`}
                        className="size-9"
                        disabled={role.isSystem}
                        onClick={() => handleEdit(role)}
                        title="Editar"
                      >
                        <Pencil className="size-4" />
                      </IconButton>
                      <IconButton
                        aria-label={`Desativar ${role.nome}`}
                        className="size-9 hover:text-danger-ink"
                        disabled={role.isSystem || !role.ativo}
                        onClick={() => setDeletingRole(role)}
                        title="Desativar"
                      >
                        <Ban className="size-4" />
                      </IconButton>
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
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingRole(null);
        }}
        role={editingRole}
        onSuccess={fetchRoles}
      />

      <AlertDialog
        open={!!deletingRole}
        onOpenChange={(open) => !open && setDeletingRole(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar perfil</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar o perfil{" "}
              <strong>{deletingRole?.nome}</strong>? Usuários com este perfil
              perderão acesso até receberem um novo perfil.
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
  );
}
