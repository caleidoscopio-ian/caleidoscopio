/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/main-layout";
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
  FileText,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  Clock,
} from "lucide-react";
import { idadeEmAnos } from "@/lib/datas-fuso";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { PageHeader, Panel, StatCard } from "@/components/kit";

interface Anamnese {
  id: string;
  paciente: {
    id: string;
    nome: string;
    nascimento: string;
    foto?: string;
  };
  profissionalId: string; // Referência ao usuário/profissional do Sistema 1
  status: "RASCUNHO" | "FINALIZADA";
  finalizadaEm?: string;
  createdAt: string;
  updatedAt: string;
}

interface AnamnesesResponse {
  success: boolean;
  data: Anamnese[];
  total: number;
  error?: string;
}

export default function AnamnesesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [anamneses, setAnamneses] = useState<Anamnese[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Anamneses" },
  ];

  // Buscar anamneses da API
  const fetchAnamneses = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado");
      }

      console.log("🔍 Frontend - Buscando anamneses...");
      console.log(`   👤 Usuário: ${user.name} (${user.email})`);
      console.log(`   🏥 Clínica: ${user.tenant?.name} (${user.tenant?.id})`);

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/anamneses", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result: AnamnesesResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar anamneses");
      }

      if (result.success) {
        setAnamneses(result.data);
        console.log(`✅ Frontend - Carregadas ${result.data.length} anamneses`);
      } else {
        throw new Error(result.error || "Erro desconhecido");
      }
    } catch (err) {
      console.error("❌ Frontend - Erro ao buscar anamneses:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar anamneses"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchAnamneses();
    }
  }, [isAuthenticated, user]);

  // Filtrar anamneses baseado no termo de busca
  const filteredAnamneses = anamneses.filter((anamnese) =>
    anamnese.paciente.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcular estatísticas
  const totalRascunhos = anamneses.filter(
    (a) => a.status === "RASCUNHO"
  ).length;
  const totalFinalizadas = anamneses.filter(
    (a) => a.status === "FINALIZADA"
  ).length;
  const anamnesesMesAtual = anamneses.filter((a) => {
    const created = new Date(a.createdAt);
    const now = new Date();
    return (
      created.getMonth() === now.getMonth() &&
      created.getFullYear() === now.getFullYear()
    );
  }).length;

  // Formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  // Calcular idade
  const calculateAge = (birthDate: string) => idadeEmAnos(birthDate) ?? 0;

  const handleNovaAnamnese = () => {
    router.push("/anamnese/nova");
  };

  const handleVisualizarAnamnese = (id: string) => {
    router.push(`/anamnese/${id}`);
  };

  const handleEditarAnamnese = (id: string) => {
    router.push(`/anamnese/${id}/editar`);
  };

  const handleDeletarAnamnese = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar esta anamnese?")) {
      return;
    }

    try {
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(`/api/anamneses/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user!.token,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao deletar anamnese");
      }

      toast({
        title: "Sucesso!",
        description: "Anamnese deletada com sucesso",
      });

      fetchAnamneses();
    } catch (error) {
      console.error("Erro ao deletar anamnese:", error);
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao deletar anamnese",
        variant: "destructive",
      });
    }
  };

  return (
    <ProtectedRoute requiredPermission={{ resource: 'prontuarios', action: 'VIEW' }}>
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          {/* Header */}
          <PageHeader
            titulo="Anamneses"
            subtitulo="Avaliações iniciais e históricos clínicos dos pacientes"
            acoes={
              <Button onClick={handleNovaAnamnese}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Anamnese
              </Button>
            }
          />

          {/* Estatísticas */}
          <div className="anim-escalonada grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr]">
            <StatCard
              tom="blue"
              size="hero"
              icone={<FileText />}
              rotulo="Total Anamneses"
              valor={loading ? "..." : anamneses.length}
            />

            <StatCard
              tom="lavender"
              icone={<CheckCircle />}
              rotulo="Finalizadas"
              valor={loading ? "..." : totalFinalizadas}
              hint={<>{anamneses.length > 0 ? Math.round((totalFinalizadas / anamneses.length) * 100) : 0} % do total</>}
            />

            <StatCard
              tom="mint"
              icone={<Clock />}
              rotulo="Rascunhos"
              valor={loading ? "..." : totalRascunhos}
              hint="Aguardando finalização"
            />

            <StatCard
              tom="peach"
              icone={<FileText />}
              rotulo="Este Mês"
              valor={loading ? "..." : anamnesesMesAtual}
            />
          </div>

          {/* Busca */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome do paciente..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Tabela de Anamneses */}
          <Panel
            titulo={<>Lista de Anamneses {!loading && ( <Badge variant="secondary" className="ml-2"> {filteredAnamneses.length} de {anamneses.length} </Badge> )}</>}
          >

            {error && (
              <div className="text-center py-8">
                <div className="text-danger-ink mb-4">{error}</div>
                <Button onClick={fetchAnamneses} variant="outline">
                  Tentar Novamente
                </Button>
              </div>
            )}

            {loading && !error && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Carregando anamneses...
                </p>
              </div>
            )}

            {!loading && !error && anamneses.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhuma anamnese encontrada
                </h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando a primeira anamnese de avaliação.
                </p>
                <Button onClick={handleNovaAnamnese}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Anamnese
                </Button>
              </div>
            )}

            {!loading && !error && filteredAnamneses.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Idade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead>Atualizada em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnamneses.map((anamnese) => (
                    <TableRow key={anamnese.id}>
                      <TableCell className="font-medium">
                        {anamnese.paciente.nome}
                      </TableCell>
                      <TableCell>
                        {calculateAge(anamnese.paciente.nascimento)} anos
                      </TableCell>
                      <TableCell>
                        {anamnese.status === "FINALIZADA" ? (
                          <Badge variant="outline" className="bg-success-soft text-success-ink">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Finalizada
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-warning text-warning-ink"
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            Rascunho
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(anamnese.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(anamnese.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleVisualizarAnamnese(anamnese.id)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleEditarAnamnese(anamnese.id)
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-danger-ink hover:bg-danger-soft"
                            onClick={() => handleDeletarAnamnese(anamnese.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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
              anamneses.length > 0 &&
              filteredAnamneses.length === 0 && (
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
    </ProtectedRoute>
  );
}
