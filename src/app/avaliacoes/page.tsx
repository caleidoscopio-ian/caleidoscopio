/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { AtribuirAvaliacaoDialog } from "@/components/forms/atribuir-avaliacao-dialog";
import {
  ClipboardCheck,
  Search,
  Plus,
  Loader2,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";

interface Avaliacao {
  id: string;
  tipo: string;
  nome: string;
  observacao?: string;
  createdAt: string;
  _count?: {
    niveis: number;
    habilidades: number;
    tarefas: number;
    atribuicoes: number;
  };
}

export default function AvaliacoesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Avaliações" },
  ];

  // Buscar avaliações
  const fetchAvaliacoes = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/avaliacoes", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar avaliações");
      }

      if (result.success) {
        setAvaliacoes(result.data);
      }
    } catch (err) {
      console.error("❌ Erro ao buscar avaliações:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar avaliações"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchAvaliacoes();
    }
  }, [isAuthenticated, user]);

  // Filtrar avaliações
  const filteredAvaliacoes = avaliacoes.filter(
    (avaliacao) =>
      avaliacao.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (avaliacao.observacao &&
        avaliacao.observacao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Traduzir tipo
  const traduzirTipo = (tipo: string) => {
    const tipos: Record<string, string> = {
      AQUISICAO_HABILIDADES: "Aquisição de Habilidades",
      REDUCAO_COMPORTAMENTOS: "Redução de Comportamentos",
    };
    return tipos[tipo] || tipo;
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  // Excluir avaliação
  const handleExcluir = async () => {
    try {
      if (!deleteId || !user) return;

      setDeleting(true);
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(`/api/avaliacoes?id=${deleteId}`, {
        method: "DELETE",
        headers: {
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (result.success) {
        setAvaliacoes(avaliacoes.filter((a) => a.id !== deleteId));
        setDeleteId(null);
      } else {
        alert(result.error || "Erro ao excluir avaliação");
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert("Erro ao excluir avaliação");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Avaliações</h1>
            <p className="text-muted-foreground">
              Gerencie protocolos de avaliação para pacientes
            </p>
          </div>
          <Button onClick={() => router.push("/avaliacoes/nova")}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Avaliação
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Avaliações
              </CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : avaliacoes.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Aquisição de Habilidades
              </CardTitle>
              <ClipboardCheck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {loading
                  ? "..."
                  : avaliacoes.filter((a) => a.tipo === "AQUISICAO_HABILIDADES")
                      .length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Redução de Comportamentos
              </CardTitle>
              <ClipboardCheck className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {loading
                  ? "..."
                  : avaliacoes.filter(
                      (a) => a.tipo === "REDUCAO_COMPORTAMENTOS"
                    ).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atribuídas</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {loading
                  ? "..."
                  : avaliacoes.filter(
                      (a) => a._count && a._count.atribuicoes > 0
                    ).length}
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
                placeholder="Buscar por nome ou observação..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>
              Lista de Avaliações
              {!loading && (
                <Badge variant="secondary" className="ml-2">
                  {filteredAvaliacoes.length} de {avaliacoes.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Protocolos de avaliação cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-center py-8">
                <div className="text-red-600 mb-4">{error}</div>
                <Button onClick={fetchAvaliacoes} variant="outline">
                  Tentar Novamente
                </Button>
              </div>
            )}

            {loading && !error && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Carregando avaliações...
                </p>
              </div>
            )}

            {!loading && !error && avaliacoes.length === 0 && (
              <div className="text-center py-8">
                <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhuma avaliação encontrada
                </h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando a primeira avaliação.
                </p>
                <Button onClick={() => router.push("/avaliacoes/nova")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Avaliação
                </Button>
              </div>
            )}

            {!loading && !error && filteredAvaliacoes.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Tarefas</TableHead>
                    <TableHead>Atribuída</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAvaliacoes.map((avaliacao) => (
                    <TableRow key={avaliacao.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{avaliacao.nome}</div>
                          {avaliacao.observacao && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {avaliacao.observacao}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            avaliacao.tipo === "AQUISICAO_HABILIDADES"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {traduzirTipo(avaliacao.tipo)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {avaliacao._count?.tarefas || 0} tarefas
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {avaliacao._count?.atribuicoes || 0} pacientes
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(avaliacao.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              router.push(`/avaliacoes/${avaliacao.id}`)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <AtribuirAvaliacaoDialog
                            avaliacao={avaliacao}
                            onSuccess={fetchAvaliacoes}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              router.push(`/avaliacoes/${avaliacao.id}/editar`)
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteId(avaliacao.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!loading &&
              !error &&
              avaliacoes.length > 0 &&
              filteredAvaliacoes.length === 0 && (
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

        {/* AlertDialog para confirmação de exclusão */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta avaliação? Esta ação não
                pode ser desfeita e todos os níveis, habilidades, pontuações e
                tarefas associadas serão removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleExcluir}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
