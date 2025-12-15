/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
import { NovaAtividadeForm } from "@/components/forms/nova-atividade-form";
import { VisualizarAtividadeDialog } from "@/components/forms/visualizar-atividade-dialog";
import { EditarAtividadeForm } from "@/components/forms/editar-atividade-form";
import { ExcluirAtividadeDialog } from "@/components/forms/excluir-atividade-dialog";
import { AtribuirAtividadeDialog } from "@/components/forms/atribuir-atividade-dialog";
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
import { ClipboardList, Search, Plus, Loader2 } from "lucide-react";

interface Instrucao {
  id: string;
  ordem: number;
  texto: string;
  observacao?: string;
}

interface Atividade {
  id: string;
  nome: string;
  descricao?: string;
  tipo: string;
  metodologia?: string;
  objetivo?: string;
  createdAt: string;
  instrucoes: Instrucao[];
  _count?: {
    atribuicoes: number;
    sessoes: number;
  };
}

export default function AtividadesClinicasPage() {
  const { user, isAuthenticated } = useAuth();
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Atividades Clínicas" },
  ];

  // Buscar atividades da API
  const fetchAtividades = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado");
      }

      console.log("🔍 Buscando atividades clínicas...");

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/atividades", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar atividades");
      }

      if (result.success) {
        setAtividades(result.data);
        console.log(`✅ Carregadas ${result.data.length} atividades`);
      } else {
        throw new Error(result.error || "Erro desconhecido");
      }
    } catch (err) {
      console.error("❌ Erro ao buscar atividades:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar atividades"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchAtividades();
    }
  }, [isAuthenticated, user]);

  // Filtrar atividades baseado no termo de busca
  const filteredAtividades = atividades.filter(
    (atividade) =>
      atividade.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (atividade.descricao &&
        atividade.descricao.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (atividade.metodologia &&
        atividade.metodologia.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  // Traduzir tipo de atividade
  const traduzirTipo = (tipo: string) => {
    const tipos: Record<string, string> = {
      PROTOCOLO_ABA: "Protocolo ABA",
      AVALIACAO_CLINICA: "Avaliação Clínica",
      JOGO_MEMORIA: "Jogo de Memória",
      CUSTOM: "Personalizada",
    };
    return tipos[tipo] || tipo;
  };

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Atividades Clínicas
            </h1>
            <p className="text-muted-foreground">
              Gerencie protocolos e atividades terapêuticas
            </p>
          </div>
          <NovaAtividadeForm onSuccess={fetchAtividades} />
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Atividades
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : atividades.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Protocolos ABA
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {loading
                  ? "..."
                  : atividades.filter((a) => a.tipo === "PROTOCOLO_ABA").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atribuídas</CardTitle>
              <ClipboardList className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {loading
                  ? "..."
                  : atividades.filter(
                      (a) => a._count && a._count.atribuicoes > 0
                    ).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Sessões Realizadas
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {loading
                  ? "..."
                  : atividades.reduce(
                      (acc, a) => acc + (a._count?.sessoes || 0),
                      0
                    )}
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
                placeholder="Buscar por nome, descrição ou metodologia..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Tabela de Atividades */}
        <Card>
          <CardHeader>
            <CardTitle>
              Lista de Atividades
              {!loading && (
                <Badge variant="secondary" className="ml-2">
                  {filteredAtividades.length} de {atividades.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Atividades e protocolos cadastrados na clínica
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-center py-8">
                <div className="text-red-600 mb-4">{error}</div>
                <Button onClick={fetchAtividades} variant="outline">
                  Tentar Novamente
                </Button>
              </div>
            )}

            {loading && !error && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Carregando atividades...
                </p>
              </div>
            )}

            {!loading && !error && atividades.length === 0 && (
              <div className="text-center py-8">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhuma atividade encontrada
                </h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando a primeira atividade clínica.
                </p>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Atividade
                </Button>
              </div>
            )}

            {!loading && !error && filteredAtividades.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Metodologia</TableHead>
                    <TableHead>Instruções</TableHead>
                    <TableHead>Atribuída</TableHead>
                    <TableHead>Sessões</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAtividades.map((atividade) => (
                    <TableRow key={atividade.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{atividade.nome}</div>
                          {atividade.descricao && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {atividade.descricao}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {traduzirTipo(atividade.tipo)}
                        </Badge>
                      </TableCell>
                      <TableCell>{atividade.metodologia || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {atividade.instrucoes.length} itens
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {atividade._count?.atribuicoes || 0} pacientes
                      </TableCell>
                      <TableCell>
                        {atividade._count?.sessoes || 0} sessões
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(atividade.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <VisualizarAtividadeDialog atividade={atividade} />
                          <AtribuirAtividadeDialog
                            atividade={atividade}
                            onSuccess={fetchAtividades}
                          />
                          <EditarAtividadeForm
                            atividade={atividade}
                            onSuccess={fetchAtividades}
                          />
                          <ExcluirAtividadeDialog
                            atividade={atividade}
                            onSuccess={fetchAtividades}
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
              atividades.length > 0 &&
              filteredAtividades.length === 0 && (
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
  );
}
