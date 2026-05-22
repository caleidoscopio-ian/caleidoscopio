/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Plus, CheckCircle, XCircle, Landmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFilial } from "@/hooks/useFilial";
import { NovoUsuarioProfissionalForm } from "@/components/forms/novo-usuario-profissional-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Usuario {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  vinculado: boolean;
  profissional?: {
    id: string;
    nome: string;
    especialidade: string;
  } | null;
}

interface UsuarioRoleInfo {
  usuarioRoleId: string | null;
  roleId: string | null;
  roleNome: string | null;
  filialId: string | null;
  filial: { id: string; nome: string; cor: string | null } | null;
}

interface RoleOption {
  id: string;
  nome: string;
}

export default function UsuariosPage() {
  const { user } = useAuth();
  const { can, loading: permsLoading } = usePermissions();
  const { toast } = useToast();
  const { filiais } = useFilial();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNovoUsuarioDialog, setShowNovoUsuarioDialog] = useState(false);
  const [roleInfoMap, setRoleInfoMap] = useState<Map<string, UsuarioRoleInfo>>(new Map());
  const [updatingFilial, setUpdatingFilial] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [managingUser, setManagingUser] = useState<Usuario | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [pendingFilial, setPendingFilial] = useState<{ usuarioId: string; filialId: string | null; filialNome: string } | null>(null);

  useEffect(() => {
    if (user && !permsLoading && can("usuarios", "VIEW")) {
      loadUsuarios();
    }
  }, [user, permsLoading]);

  const loadUsuarios = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      const userDataEncoded = btoa(JSON.stringify(user));
      const headers = {
        "Content-Type": "application/json",
        "X-User-Data": userDataEncoded,
        "X-Auth-Token": user.token,
      };

      const [usuariosRes, rolesRes, rolesListRes] = await Promise.all([
        fetch("/api/usuarios-sistema1", { headers }),
        fetch("/api/usuario-roles", { headers }),
        fetch("/api/roles", { headers }),
      ]);

      if (!usuariosRes.ok) throw new Error("Erro ao carregar usuários");

      const data = await usuariosRes.json();
      setUsuarios(data.usuarios || []);

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        const map = new Map<string, UsuarioRoleInfo>();
        for (const ur of rolesData) {
          map.set(ur.id, {
            usuarioRoleId: ur.usuarioRoleId,
            roleId: ur.roleAtual?.id ?? null,
            roleNome: ur.roleAtual?.nome ?? null,
            filialId: ur.filialId,
            filial: ur.filial,
          });
        }
        setRoleInfoMap(map);
      }

      if (rolesListRes.ok) {
        const rolesListData = await rolesListRes.json();
        setAvailableRoles(rolesListData.map((r: { id: string; nome: string }) => ({ id: r.id, nome: r.nome })));
      }
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmFilialChange = async () => {
    if (!user || !pendingFilial) return;
    const { usuarioId, filialId } = pendingFilial;
    setUpdatingFilial(usuarioId);
    setPendingFilial(null);
    try {
      const res = await fetch("/api/usuario-roles", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": btoa(JSON.stringify(user)),
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({ usuarioId, filialId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao atualizar filial");
      }
      const updated = await res.json();
      setRoleInfoMap(prev => {
        const next = new Map(prev);
        const existing = next.get(usuarioId);
        next.set(usuarioId, {
          usuarioRoleId: existing?.usuarioRoleId ?? updated.id,
          roleId: existing?.roleId ?? null,
          roleNome: existing?.roleNome ?? null,
          filialId: updated.filialId,
          filial: updated.filial,
        });
        return next;
      });
      toast({ title: "Filial atualizada com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setUpdatingFilial(null);
    }
  };

  const handleOpenManage = (usuario: Usuario) => {
    const ri = roleInfoMap.get(usuario.id);
    setManagingUser(usuario);
    setSelectedRoleId(ri?.roleId ?? "");
  };

  const handleRoleChange = async () => {
    if (!user || !managingUser || !selectedRoleId) return;
    const ri = roleInfoMap.get(managingUser.id);
    const headers = {
      "Content-Type": "application/json",
      "X-User-Data": btoa(JSON.stringify(user)),
      "X-Auth-Token": user.token,
    };
    try {
      const method = ri?.usuarioRoleId ? "PUT" : "POST";
      const res = await fetch("/api/usuario-roles", {
        method,
        headers,
        body: JSON.stringify({ usuarioId: managingUser.id, roleId: selectedRoleId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao salvar perfil");
      }
      const roleName = availableRoles.find(r => r.id === selectedRoleId)?.nome ?? null;
      setRoleInfoMap(prev => {
        const next = new Map(prev);
        const existing = next.get(managingUser.id);
        next.set(managingUser.id, {
          usuarioRoleId: selectedRoleId,
          roleId: selectedRoleId,
          roleNome: roleName,
          filialId: existing?.filialId ?? null,
          filial: existing?.filial ?? null,
        });
        return next;
      });
      toast({ title: "Perfil atualizado com sucesso!" });
      setManagingUser(null);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleNovoUsuario = async (formData: any) => {
    if (!user) return;

    try {
      const userDataEncoded = btoa(JSON.stringify(user));
      const response = await fetch("/api/usuarios-sistema1/criar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({
          ...formData,
          role: "USER", // Sempre cria como USER (terapeuta)
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar usuário");
      }

      toast({
        title: "Sucesso!",
        description: "Usuário e profissional criados com sucesso",
      });

      setShowNovoUsuarioDialog(false);
      await loadUsuarios();
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o usuário",
        variant: "destructive",
      });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <Badge variant="destructive">Super Admin</Badge>;
      case "ADMIN":
        return <Badge variant="default">Admin</Badge>;
      case "USER":
        return <Badge variant="secondary">Usuário</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <ProtectedRoute requiredPermission={{ resource: 'usuarios', action: 'VIEW' }}>
      <MainLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Gestão de Usuários
              </h1>
              <p className="text-muted-foreground">
                Gerencie usuários e vincule profissionais ao sistema
              </p>
            </div>
            <Button onClick={() => setShowNovoUsuarioDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </div>

          {/* Estatísticas */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Usuários
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usuarios.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Vinculados
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {usuarios.filter((u) => u.vinculado).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <XCircle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {
                    usuarios.filter((u) => !u.vinculado && u.role !== "ADMIN")
                      .length
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Usuários */}
          <Card>
            <CardHeader>
              <CardTitle>Usuários da Clínica</CardTitle>
              <CardDescription>
                Lista de todos os usuários cadastrados no Sistema 1
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando usuários...
                </div>
              ) : usuarios.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Vínculo</TableHead>
                      <TableHead>Profissional</TableHead>
                      {filiais.length > 0 && <TableHead>Filial</TableHead>}
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usuarios.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell className="font-medium">
                          {usuario.name}
                        </TableCell>
                        <TableCell>{usuario.email}</TableCell>
                        <TableCell>{getRoleBadge(usuario.role)}</TableCell>
                        <TableCell>
                          {usuario.isActive ? (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200"
                            >
                              Ativo
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-red-50 text-red-700 border-red-200"
                            >
                              Inativo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {usuario.vinculado ? (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Vinculado
                            </Badge>
                          ) : usuario.role === "ADMIN" ? (
                            <Badge
                              variant="outline"
                              className="bg-gray-50 text-gray-700 border-gray-200"
                            >
                              Admin (não requer)
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-orange-50 text-orange-700 border-orange-200"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {usuario.profissional ? (
                            <div className="text-sm">
                              <div className="font-medium">
                                {usuario.profissional.nome}
                              </div>
                              <div className="text-muted-foreground">
                                {usuario.profissional.especialidade}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              -
                            </span>
                          )}
                        </TableCell>
                        {filiais.length > 0 && (() => {
                          const ri = roleInfoMap.get(usuario.id);
                          const currentFilialId = ri?.filialId ?? null;
                          const isUpdating = updatingFilial === usuario.id;
                          return (
                            <TableCell>
                              <Select
                                value={currentFilialId ?? "_todas"}
                                onValueChange={(v) => {
                                  const newFilialId = v === "_todas" ? null : v;
                                  const filialNome = newFilialId ? (filiais.find(f => f.id === newFilialId)?.nome ?? newFilialId) : "Todas as filiais";
                                  setPendingFilial({ usuarioId: usuario.id, filialId: newFilialId, filialNome });
                                }}
                                disabled={isUpdating || !can("usuarios", "EDIT")}
                              >
                                <SelectTrigger className="w-36 h-8 text-xs">
                                  <SelectValue>
                                    {ri?.filial ? (
                                      <span className="flex items-center gap-1.5">
                                        <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ri.filial.cor ?? '#6b7280' }} />
                                        {ri.filial.nome}
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1.5 text-muted-foreground">
                                        <Landmark className="h-3 w-3" />
                                        Todas
                                      </span>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_todas">
                                    <span className="flex items-center gap-1.5">
                                      <Landmark className="h-3 w-3" />
                                      Todas as filiais
                                    </span>
                                  </SelectItem>
                                  {filiais.map((f) => (
                                    <SelectItem key={f.id} value={f.id}>
                                      <span className="flex items-center gap-1.5">
                                        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: f.cor ?? '#6b7280' }} />
                                        {f.nome}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          );
                        })()}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {can("usuarios", "EDIT") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenManage(usuario)}
                              >
                                Perfil
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dialog Confirmação Filial */}
        <Dialog open={!!pendingFilial} onOpenChange={(o) => !o && setPendingFilial(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Confirmar alteração de filial</DialogTitle>
              <DialogDescription>
                Alterar a filial deste usuário para <strong>{pendingFilial?.filialNome}</strong>?
                <br />
                Isso define quais dados ele poderá acessar no sistema.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPendingFilial(null)}>Cancelar</Button>
              <Button onClick={confirmFilialChange}>Confirmar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Gerenciar Perfil */}
        <Dialog open={!!managingUser} onOpenChange={(o) => !o && setManagingUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Gerenciar Perfil</DialogTitle>
              <DialogDescription>
                {managingUser?.name} — altere o perfil de acesso deste usuário
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Perfil de Acesso</label>
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar perfil..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {managingUser && roleInfoMap.get(managingUser.id)?.roleNome && (
                  <p className="text-xs text-muted-foreground">
                    Atual: {roleInfoMap.get(managingUser.id)?.roleNome}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setManagingUser(null)}>Cancelar</Button>
                <Button onClick={handleRoleChange} disabled={!selectedRoleId}>Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Novo Usuário */}
        <Dialog
          open={showNovoUsuarioDialog}
          onOpenChange={setShowNovoUsuarioDialog}
        >
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário e Profissional</DialogTitle>
              <DialogDescription>
                Crie um novo usuário no Sistema 1 e vincule automaticamente a um
                profissional no Sistema 2
              </DialogDescription>
            </DialogHeader>
            <NovoUsuarioProfissionalForm
              onSubmit={handleNovoUsuario}
              onCancel={() => setShowNovoUsuarioDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  );
}
