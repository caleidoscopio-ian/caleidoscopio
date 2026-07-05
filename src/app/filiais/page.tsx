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
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Landmark, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { NovaFilialDialog } from "@/components/filiais/nova-filial-dialog";
import { EditarFilialDialog } from "@/components/filiais/editar-filial-dialog";
import { ExcluirFilialDialog } from "@/components/filiais/excluir-filial-dialog";
import { useFilial } from "@/hooks/useFilial";
import { formatCNPJ } from "@/lib/masks";
import type { Filial } from "@/types/filial";

export default function FiliaisPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { refreshFiliais } = useFilial();
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Filiais" },
  ];

  const fetchFiliais = async () => {
    if (!isAuthenticated || !user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/filiais", {
        headers: {
          "X-User-Data": btoa(JSON.stringify(user)),
          "X-Auth-Token": user.token,
        },
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Erro ao buscar filiais");
      setFiliais(result.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar filiais";
      setError(msg);
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchFiliais();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  // Atualiza a listagem local desta página E o seletor global (sidebar) — corrige o
  // bug de a filial nova só aparecer no dropdown depois de um F5.
  const handleSuccess = () => {
    fetchFiliais();
    refreshFiliais();
  };

  const filtered = filiais.filter((f) => {
    const term = searchTerm.toLowerCase();
    return (
      f.nome.toLowerCase().includes(term) ||
      (f.cidade ?? "").toLowerCase().includes(term) ||
      (f.endereco ?? "").toLowerCase().includes(term)
    );
  });

  const total = filiais.length;
  const ativas = filiais.filter((f) => f.ativo).length;
  const inativas = filiais.filter((f) => !f.ativo).length;

  return (
    <ProtectedRoute requiredPermission={{ resource: "filiais", action: "VIEW" }}>
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Filiais</h1>
              <p className="text-muted-foreground">Gerencie as unidades da clínica</p>
            </div>
            <NovaFilialDialog onSuccess={handleSuccess} />
          </div>

          {/* Estatísticas */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Filiais</CardTitle>
                <Landmark className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? "..." : total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Filiais Ativas</CardTitle>
                <Landmark className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{loading ? "..." : ativas}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Filiais Inativas</CardTitle>
                <Landmark className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{loading ? "..." : inativas}</div>
              </CardContent>
            </Card>
          </div>

          {/* Busca */}
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, cidade ou endereço..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Tabela */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                Filiais Cadastradas
                {!loading && (
                  <Badge variant="secondary" className="ml-2">
                    {filtered.length} de {total}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="text-center py-8">
                  <p className="text-red-600 mb-4">{error}</p>
                  <Button variant="outline" onClick={fetchFiliais}>Tentar Novamente</Button>
                </div>
              )}

              {loading && !error && (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Carregando filiais...</p>
                </div>
              )}

              {!loading && !error && filiais.length === 0 && (
                <div className="text-center py-8">
                  <Landmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma filial cadastrada</h3>
                  <p className="text-muted-foreground mb-4">Comece criando a primeira unidade da clínica.</p>
                  <NovaFilialDialog onSuccess={handleSuccess} />
                </div>
              )}

              {!loading && !error && filiais.length > 0 && filtered.length === 0 && (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
                  <p className="text-muted-foreground">Tente ajustar os termos da sua busca.</p>
                </div>
              )}

              {!loading && !error && filtered.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Endereço</TableHead>
                      <TableHead>Salas</TableHead>
                      <TableHead>Pacientes</TableHead>
                      <TableHead>Profissionais</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((filial) => {
                      const enderecoEstruturado = [
                        filial.logradouro && filial.numero ? `${filial.logradouro}, ${filial.numero}` : filial.logradouro,
                        filial.bairro,
                        filial.cep,
                      ].filter(Boolean).join(" - ");
                      const enderecoExibicao = enderecoEstruturado || filial.endereco;
                      return (
                      <TableRow key={filial.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: filial.cor ?? "#3b82f6" }}
                            />
                            {filial.nome}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {filial.cnpj ? formatCNPJ(filial.cnpj) : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {filial.cidade ? (filial.estado ? `${filial.cidade}/${filial.estado}` : filial.cidade) : "-"}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="truncate text-sm text-muted-foreground">
                            {enderecoExibicao || "-"}
                          </div>
                        </TableCell>
                        <TableCell>{filial._count?.salas ?? 0}</TableCell>
                        <TableCell>{filial._count?.pacientes ?? 0}</TableCell>
                        <TableCell>{filial._count?.profissionais ?? 0}</TableCell>
                        <TableCell>
                          {filial.ativo ? (
                            <Badge variant="default" className="bg-green-600">Ativa</Badge>
                          ) : (
                            <Badge variant="secondary">Inativa</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <EditarFilialDialog filial={filial} onSuccess={handleSuccess} />
                            <ExcluirFilialDialog filial={filial} onSuccess={handleSuccess} />
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
