"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Loader2 } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PageHeader, Panel } from "@/components/kit";

interface Nivel {
  id: string;
  ordem: number;
  descricao: string;
  faixa_etaria?: string;
}

interface Habilidade {
  id: string;
  ordem: number;
  habilidade: string;
}

interface Pontuacao {
  id: string;
  ordem: number;
  tipo: string;
  valor: number;
}

interface Tarefa {
  id: string;
  pergunta: string;
  descricao?: string;
  criterios_pontuacao?: string;
  numero?: number | null;
  nivel?: { descricao: string };
  habilidade?: { habilidade: string };
}

interface Avaliacao {
  id: string;
  tipo: string;
  nome: string;
  observacao?: string;
  createdAt: string;
  niveis: Nivel[];
  habilidades: Habilidade[];
  pontuacoes: Pontuacao[];
  tarefas: Tarefa[];
}

const TIPOS_PONTUACAO: Record<string, string> = {
  SEMPRE_100: "Sempre (100%)",
  FREQUENTEMENTE_75: "Frequentemente (75%)",
  AS_VEZES_50: "Às Vezes (50%)",
  RARAMENTE_25: "Raramente (25%)",
  NUNCA_0: "Nunca (0%)",
  NAO_SE_APLICA: "Não se Aplica",
};

function VisualizarAvaliacaoPageContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const avaliacaoId = params.id as string;

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Avaliações", href: "/avaliacoes" },
    { label: "Visualizar" },
  ];

  useEffect(() => {
    const fetchAvaliacao = async () => {
      try {
        setLoading(true);
        if (!user) return;

        const userDataEncoded = btoa(JSON.stringify(user));
        const response = await fetch(`/api/avaliacoes?id=${avaliacaoId}`, {
          headers: {
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
        });

        const result = await response.json();

        if (result.success) {
          setAvaliacao(result.data);
        } else {
          setError(result.error || "Erro ao carregar avaliação");
        }
      } catch (error) {
        console.error("Erro:", error);
        setError("Erro ao carregar avaliação");
      } finally {
        setLoading(false);
      }
    };

    fetchAvaliacao();
  }, [avaliacaoId, user]);

  const traduzirTipo = (tipo: string) => {
    const tipos: Record<string, string> = {
      AQUISICAO_HABILIDADES: "Aquisição de Habilidades",
      REDUCAO_COMPORTAMENTOS: "Redução de Comportamentos",
    };
    return tipos[tipo] || tipo;
  };

  if (loading) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (error || !avaliacao) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-danger-ink mb-4">{error || "Avaliação não encontrada"}</p>
              <Button onClick={() => router.push("/avaliacoes")}>
                Voltar para Avaliações
              </Button>
            </div>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <PageHeader
          voltar={{ onClick: () => router.push("/avaliacoes") }}
          titulo={avaliacao.nome}
          meta={
            <Badge
              variant={
                avaliacao.tipo === "AQUISICAO_HABILIDADES" ? "default" : "secondary"
              }
            >
              {traduzirTipo(avaliacao.tipo)}
            </Badge>
          }
          acoes={
            <Button onClick={() => router.push(`/avaliacoes/${avaliacaoId}/editar`)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          }
        />

        {/* Informações Gerais */}
        <Panel titulo="Informações Gerais">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Tipo de Avaliação
              </label>
              <p className="mt-1">{traduzirTipo(avaliacao.tipo)}</p>
            </div>
            {avaliacao.observacao && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Observação
                </label>
                <p className="mt-1">{avaliacao.observacao}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Criada em
              </label>
              <p className="mt-1">
                {new Date(avaliacao.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
        </Panel>

        {/* Tabs */}
        <Tabs defaultValue="niveis">
          <TabsList>
            <TabsTrigger value="niveis">
              Níveis ({avaliacao.niveis.length})
            </TabsTrigger>
            <TabsTrigger value="habilidades">
              Habilidades ({avaliacao.habilidades.length})
            </TabsTrigger>
            <TabsTrigger value="pontuacao">
              Pontuação ({avaliacao.pontuacoes.length})
            </TabsTrigger>
            <TabsTrigger value="tarefas">
              Tarefas ({avaliacao.tarefas.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="niveis">
            <Panel
              titulo="Níveis da Avaliação"
              subtitulo="Níveis de desenvolvimento cadastrados"
            >
              {avaliacao.niveis.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum nível cadastrado
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Ordem</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Faixa Etária</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {avaliacao.niveis.map((nivel) => (
                      <TableRow key={nivel.id}>
                        <TableCell className="font-medium">
                          {nivel.ordem}
                        </TableCell>
                        <TableCell>{nivel.descricao}</TableCell>
                        <TableCell>{nivel.faixa_etaria || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Panel>
          </TabsContent>

          <TabsContent value="habilidades">
            <Panel
              titulo="Habilidades da Avaliação"
              subtitulo="Habilidades a serem avaliadas"
            >
              {avaliacao.habilidades.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma habilidade cadastrada
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Ordem</TableHead>
                      <TableHead>Habilidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {avaliacao.habilidades.map((habilidade) => (
                      <TableRow key={habilidade.id}>
                        <TableCell className="font-medium">
                          {habilidade.ordem}
                        </TableCell>
                        <TableCell>{habilidade.habilidade}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Panel>
          </TabsContent>

          <TabsContent value="pontuacao">
            <Panel titulo="Sistema de Pontuação" subtitulo="Escala de pontuação da avaliação">
              {avaliacao.pontuacoes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma pontuação cadastrada
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Ordem</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {avaliacao.pontuacoes.map((pontuacao) => (
                      <TableRow key={pontuacao.id}>
                        <TableCell className="font-medium">
                          {pontuacao.ordem}
                        </TableCell>
                        <TableCell>
                          {TIPOS_PONTUACAO[pontuacao.tipo] || pontuacao.tipo}
                        </TableCell>
                        <TableCell>
                          {pontuacao.valor === -1
                            ? "N/A"
                            : `${pontuacao.valor}%`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Panel>
          </TabsContent>

          <TabsContent value="tarefas">
            <Panel
              titulo="Tarefas da Avaliação"
              subtitulo="Perguntas e critérios de avaliação"
            >
              {avaliacao.tarefas.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma tarefa cadastrada
                </p>
              ) : (
                <div className="space-y-4">
                  {avaliacao.tarefas.map((tarefa, index) => (
                    <Panel key={tarefa.id} titulo={<>{index + 1}. {tarefa.pergunta}</>}>
                      <div className="space-y-2">
                        {tarefa.nivel && (
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">
                              Nível:
                            </span>{" "}
                            <Badge variant="outline">
                              {tarefa.nivel.descricao}
                            </Badge>
                          </div>
                        )}
                        {tarefa.habilidade && (
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">
                              Habilidade:
                            </span>{" "}
                            <Badge variant="outline">
                              {tarefa.habilidade.habilidade}
                            </Badge>
                            {tarefa.numero != null && (
                              <>
                                {" "}
                                <span className="text-sm font-medium text-muted-foreground">
                                  Número:
                                </span>{" "}
                                <Badge variant="outline">{tarefa.numero}</Badge>
                              </>
                            )}
                          </div>
                        )}
                        {tarefa.descricao && (
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">
                              Descrição:
                            </span>
                            <p className="text-sm mt-1">{tarefa.descricao}</p>
                          </div>
                        )}
                        {tarefa.criterios_pontuacao && (
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">
                              Critérios de Pontuação:
                            </span>
                            <p className="text-sm mt-1">
                              {tarefa.criterios_pontuacao}
                            </p>
                          </div>
                        )}
                      </div>
                    </Panel>
                  ))}
                </div>
              )}
            </Panel>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

export default function VisualizarAvaliacaoPage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: 'avaliacoes', action: 'VIEW' }}>
      <VisualizarAvaliacaoPageContent />
    </ProtectedRoute>
  );
}
