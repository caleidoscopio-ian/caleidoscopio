/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BookMarked, Search, Plus, Loader2, Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { VisualizarCurriculumDialog } from "@/components/curriculum/visualizar-curriculum-dialog";
import { ExcluirCurriculumDialog } from "@/components/curriculum/excluir-curriculum-dialog";
import { AtribuirCurriculumDialog } from "@/components/curriculum/atribuir-curriculum-dialog";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PageHeader, Panel, StatCard } from "@/components/kit";

interface Curriculum {
  id: string;
  nome: string;
  descricao?: string;
  observacao?: string;
  createdAt: string;
  atividades: Array<{
    id: string;
    ordem: number;
    atividade: {
      id: string;
      nome: string;
    };
  }>;
  _count?: {
    atividades: number;
  };
}

function CurriculumPageContent() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Plano Terapêutico" },
  ];

  const fetchCurriculums = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/curriculum", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar planos terapêuticos");
      }

      if (result.success) {
        setCurriculums(result.data);
      } else {
        throw new Error(result.error || "Erro desconhecido");
      }
    } catch (err) {
      console.error("❌ Erro ao buscar planos terapêuticos:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar planos terapêuticos"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchCurriculums();
    }
  }, [isAuthenticated, user]);

  const filteredCurriculums = curriculums.filter(
    (curriculum) =>
      curriculum.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (curriculum.descricao &&
        curriculum.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          titulo="Plano Terapêutico"
          subtitulo="Gerencie conjuntos de atividades organizadas"
          acoes={
            <Button onClick={() => router.push("/curriculum/novo")}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Plano Terapêutico
            </Button>
          }
        />

        {/* Estatísticas */}
        <div className="anim-escalonada grid gap-4 sm:grid-cols-3">
          <StatCard
            tom="blue"
            icone={<BookMarked />}
            rotulo="Total de Planos"
            valor={loading ? "..." : curriculums.length}
          />

          <StatCard
            tom="mint"
            icone={<BookMarked className="text-brand" />}
            rotulo="Total de Atividades"
            valor={<span className="text-brand">{loading ? "..." : curriculums.reduce( (acc, c) => acc + (c._count?.atividades || 0), 0 )}</span>}
          />

          <StatCard
            tom="peach"
            icone={<BookMarked />}
            rotulo="Média de Atividades"
            valor={<span className="text-success-ink">{loading ? "..." : curriculums.length > 0 ? Math.round( curriculums.reduce( (acc, c) => acc + (c._count?.atividades || 0), 0 ) / curriculums.length ) : 0}</span>}
          />
        </div>

        {/* Busca */}
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou descrição..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Tabela */}
        <Panel
          titulo={<>Lista de Planos Terapêuticos {!loading && ( <Badge variant="secondary" className="ml-2"> {filteredCurriculums.length} de {curriculums.length} </Badge> )}</>}
          subtitulo="Planos Terapêuticos cadastrados na clínica"
        >

          {error && (
            <div className="text-center py-8">
              <div className="text-danger-ink mb-4">{error}</div>
              <Button onClick={fetchCurriculums} variant="outline">
                Tentar Novamente
              </Button>
            </div>
          )}

          {loading && !error && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">
                Carregando planos...
              </p>
            </div>
          )}

          {!loading && !error && curriculums.length === 0 && (
            <div className="text-center py-8">
              <BookMarked className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Nenhum plano terapêutico encontrado
              </h3>
              <p className="text-muted-foreground mb-4">
                Comece criando o primeiro plano terapêutico.
              </p>
              <Button onClick={() => router.push("/curriculum/novo")}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Plano Terapêutico
              </Button>
            </div>
          )}

          {!loading && !error && filteredCurriculums.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Atividades</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCurriculums.map((curriculum) => (
                  <TableRow key={curriculum.id}>
                    <TableCell className="font-medium">
                      {curriculum.nome}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-md">
                      {curriculum.descricao
                        ? curriculum.descricao.length > 100
                          ? `${curriculum.descricao.substring(0, 100)}...`
                          : curriculum.descricao
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {curriculum._count?.atividades || 0} atividades
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(curriculum.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <VisualizarCurriculumDialog curriculum={curriculum} />
                        <AtribuirCurriculumDialog
                          curriculum={curriculum}
                          onSuccess={fetchCurriculums}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/curriculum/editar/${curriculum.id}`)
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <ExcluirCurriculumDialog
                          curriculum={curriculum}
                          onSuccess={fetchCurriculums}
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
            curriculums.length > 0 &&
            filteredCurriculums.length === 0 && (
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
        </Panel>
      </div>
    </MainLayout>
  );
}

export default function CurriculumPage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: 'curriculums', action: 'VIEW' }}>
      <CurriculumPageContent />
    </ProtectedRoute>
  );
}
