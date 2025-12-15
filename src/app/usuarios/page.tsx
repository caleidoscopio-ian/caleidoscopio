/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
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
import { Users, Plus, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NovoUsuarioProfissionalForm } from "@/components/forms/novo-usuario-profissional-form";

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

export default function UsuariosPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNovoUsuarioDialog, setShowNovoUsuarioDialog] = useState(false);

  useEffect(() => {
    if (user && isAdmin) {
      loadUsuarios();
    }
  }, [user, isAdmin]);

  const loadUsuarios = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      const userDataEncoded = btoa(JSON.stringify(user));
      const response = await fetch("/api/usuarios-sistema1", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao carregar usuários");
      }

      const data = await response.json();
      setUsuarios(data.usuarios || []);
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
    <ProtectedRoute requiredRole="ADMIN">
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
                        <TableCell className="text-right">
                          {!usuario.vinculado && usuario.role === "PENDING" && (
                            <span className="text-xs text-muted-foreground">
                              Criar usuário para ativar
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

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
