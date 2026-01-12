/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Search, Loader2, Users, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NovaSalaDialog } from "@/components/salas/nova-sala-dialog";
import { EditarSalaDialog } from "@/components/salas/editar-sala-dialog";
import { ExcluirSalaDialog } from "@/components/salas/excluir-sala-dialog";

interface Sala {
  id: string;
  nome: string;
  descricao?: string;
  capacidade?: number;
  recursos: string[];
  cor?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SalasPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [salas, setSalas] = useState<Sala[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Salas" },
  ];

  // Buscar salas da API
  const fetchSalas = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/salas", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar salas");
      }

      if (result.success) {
        setSalas(result.data);
      } else {
        throw new Error(result.error || "Erro desconhecido");
      }
    } catch (err) {
      console.error("❌ Erro ao buscar salas:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar salas");
      toast({
        title: "Erro",
        description:
          err instanceof Error ? err.message : "Erro ao carregar salas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchSalas();
    }
  }, [isAuthenticated, user]);

  // Filtrar salas baseado na busca
  const filteredSalas = salas.filter((sala) => {
    const matchesSearch =
      sala.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sala.descricao &&
        sala.descricao.toLowerCase().includes(searchTerm.toLowerCase())) ||
      sala.recursos.some((recurso) =>
        recurso.toLowerCase().includes(searchTerm.toLowerCase())
      );

    return matchesSearch;
  });

  // Estatísticas
  const totalSalas = salas.length;
  const salasAtivas = salas.filter((s) => s.ativo).length;
  const salasInativas = salas.filter((s) => !s.ativo).length;

  return (
    <ProtectedRoute>
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Gestão de Salas
              </h1>
              <p className="text-muted-foreground">
                Cadastre e gerencie as salas da clínica
              </p>
            </div>
            <NovaSalaDialog onSuccess={fetchSalas} />
          </div>

          {/* Estatísticas */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Salas
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : totalSalas}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Salas Ativas
                </CardTitle>
                <Building2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {loading ? "..." : salasAtivas}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Salas Inativas
                </CardTitle>
                <Building2 className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {loading ? "..." : salasInativas}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Busca */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, descrição ou recursos..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Tabela de Salas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Salas Cadastradas
                {!loading && (
                  <Badge variant="secondary" className="ml-2">
                    {filteredSalas.length} de {salas.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="text-center py-8">
                  <div className="text-red-600 mb-4">{error}</div>
                  <Button onClick={fetchSalas} variant="outline">
                    Tentar Novamente
                  </Button>
                </div>
              )}

              {loading && !error && (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Carregando salas...</p>
                </div>
              )}

              {!loading && !error && salas.length === 0 && (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Nenhuma sala cadastrada
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Comece cadastrando a primeira sala da clínica.
                  </p>
                  <NovaSalaDialog onSuccess={fetchSalas} />
                </div>
              )}

              {!loading && !error && filteredSalas.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Capacidade</TableHead>
                      <TableHead>Recursos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSalas.map((sala) => (
                      <TableRow key={sala.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: sala.cor || "#94a3b8",
                              }}
                            />
                            {sala.nome}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="truncate text-sm text-muted-foreground">
                            {sala.descricao || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {sala.capacidade ? (
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{sala.capacidade}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {sala.recursos.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <Wrench className="h-4 w-4 text-muted-foreground" />
                              <Badge variant="outline" className="text-xs">
                                {sala.recursos.length} recurso(s)
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {sala.ativo ? (
                            <Badge variant="default" className="bg-green-600">
                              Ativa
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inativa</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <EditarSalaDialog
                              sala={sala}
                              onSuccess={fetchSalas}
                            />
                            <ExcluirSalaDialog
                              sala={sala}
                              onSuccess={fetchSalas}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {!loading &&
                !error &&
                salas.length > 0 &&
                filteredSalas.length === 0 && (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      Nenhum resultado encontrado
                    </h3>
                    <p className="text-muted-foreground">
                      Tente ajustar os termos da sua busca.
                    </p>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
