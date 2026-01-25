/* eslint-disable @typescript-eslint/no-explicit-any */
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
  Play,
  Search,
  Loader2,
  User,
  ClipboardList,
  ClipboardCheck,
  AlertCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Paciente {
  id: string;
  name: string;
  cpf?: string;
  birthDate: string;
  profissional?: {
    nome: string;
  };
}

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
  instrucoes: Instrucao[];
}

interface CurriculumAtividade {
  id: string;
  ordem: number;
  atividade: Atividade;
}

interface Curriculum {
  id: string;
  nome: string;
  descricao?: string;
  atividades: CurriculumAtividade[];
}

interface CurriculumAtribuido {
  id: string;
  atribuida_em: string;
  curriculum: Curriculum;
}

interface Avaliacao {
  id: string;
  nome: string;
  tipo: string;
  tarefas: any[];
}

interface AvaliacaoAtribuida {
  id: string;
  atribuida_em: string;
  avaliacao: Avaliacao;
}

export default function IniciarSessaoPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState<string | null>(
    null
  );
  const [curriculums, setCurriculums] = useState<CurriculumAtribuido[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoAtribuida[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCurriculums, setLoadingCurriculums] = useState(false);
  const [loadingAvaliacoes, setLoadingAvaliacoes] = useState(false);
  const [iniciandoSessao, setIniciandoSessao] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sessaoExistenteDialog, setSessaoExistenteDialog] = useState(false);
  const [sessaoExistenteId, setSessaoExistenteId] = useState<string | null>(null);
  const [sessaoExistenteMensagem, setSessaoExistenteMensagem] = useState("");

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Iniciar Sessão" },
  ];

  // Buscar pacientes
  const fetchPacientes = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/pacientes", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar pacientes");
      }

      if (result.success) {
        setPacientes(result.data);
      }
    } catch (err) {
      console.error("❌ Erro ao buscar pacientes:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar pacientes"
      );
    } finally {
      setLoading(false);
    }
  };

  // Buscar curriculums atribuídos ao paciente selecionado
  const fetchCurriculums = async (pacienteId: string) => {
    try {
      setLoadingCurriculums(true);
      setError(null);

      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(
        `/api/curriculum/atribuir?pacienteId=${pacienteId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar planos terapêuticos");
      }

      if (result.success) {
        setCurriculums(result.data);
      }
    } catch (err) {
      console.error("❌ Erro ao buscar planos terapêuticos:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar planos terapêuticos"
      );
    } finally {
      setLoadingCurriculums(false);
    }
  };

  // Buscar avaliações atribuídas ao paciente selecionado
  const fetchAvaliacoes = async (pacienteId: string) => {
    try {
      setLoadingAvaliacoes(true);
      setError(null);

      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(
        `/api/avaliacoes/atribuir?pacienteId=${pacienteId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
        }
      );

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
      setLoadingAvaliacoes(false);
    }
  };

  // Iniciar sessão de curriculum
  const iniciarSessaoCurriculum = async (curriculumId: string) => {
    if (!pacienteSelecionado) {
      setError("Selecione um paciente primeiro");
      return;
    }

    try {
      setIniciandoSessao(true);
      setError(null);

      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/sessoes-curriculum", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({
          pacienteId: pacienteSelecionado,
          curriculumId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao iniciar sessão");
      }

      if (result.success) {
        // Se já existia uma sessão, mostrar dialog
        if (result.existente) {
          setSessaoExistenteId(result.data.id);
          setSessaoExistenteMensagem(result.message || "Já existe uma sessão em andamento para este paciente.");
          setSessaoExistenteDialog(true);
        } else {
          // Sessão nova criada, redirecionar diretamente
          router.push(`/aplicar-curriculum/${result.data.id}`);
        }
      }
    } catch (err) {
      console.error("❌ Erro ao iniciar sessão:", err);
      setError(err instanceof Error ? err.message : "Erro ao iniciar sessão");
    } finally {
      setIniciandoSessao(false);
    }
  };

  // Iniciar sessão de avaliação
  const iniciarAvaliacao = async (avaliacaoId: string) => {
    if (!pacienteSelecionado) {
      setError("Selecione um paciente primeiro");
      return;
    }

    try {
      setIniciandoSessao(true);
      setError(null);

      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/sessoes-avaliacao", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({
          pacienteId: pacienteSelecionado,
          avaliacaoId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao iniciar avaliação");
      }

      if (result.success) {
        // Redirecionar para página de aplicar avaliação
        router.push(`/aplicar-avaliacao/${result.data.id}`);
      }
    } catch (err) {
      console.error("❌ Erro ao iniciar avaliação:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao iniciar avaliação"
      );
    } finally {
      setIniciandoSessao(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchPacientes();
    }
  }, [isAuthenticated, user]);

  // Quando seleciona paciente, buscar planos terapêuticos e avaliações
  useEffect(() => {
    if (pacienteSelecionado) {
      fetchCurriculums(pacienteSelecionado);
      fetchAvaliacoes(pacienteSelecionado);
    } else {
      setCurriculums([]);
      setAvaliacoes([]);
    }
  }, [pacienteSelecionado]);

  // Filtrar pacientes
  const filteredPacientes = pacientes.filter(
    (paciente) =>
      (paciente.name &&
        paciente.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (paciente.cpf && paciente.cpf.includes(searchTerm))
  );

  // Traduzir tipo de avaliação
  const traduzirTipoAvaliacao = (tipo: string) => {
    const tipos: Record<string, string> = {
      AQUISICAO_HABILIDADES: "Aquisição de Habilidades",
      REDUCAO_COMPORTAMENTOS: "Redução de Comportamentos",
    };
    return tipos[tipo] || tipo;
  };

  const pacienteAtual = pacientes.find((p) => p.id === pacienteSelecionado);

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Iniciar Sessão</h1>
          <p className="text-muted-foreground">
            Selecione o paciente e a atividade para iniciar a sessão terapêutica
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Seleção de Paciente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Selecionar Paciente
            </CardTitle>
            <CardDescription>
              Escolha o paciente que participará da sessão
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CPF..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Paciente Selecionado */}
              {pacienteAtual && (
                <div className="p-5 border-2 rounded-lg bg-primary/5 border-primary shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg">
                          {pacienteAtual.name}
                        </span>
                        <Badge className="bg-primary">✓ Selecionado</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-3">
                        {pacienteAtual.cpf && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium">CPF:</span>{" "}
                            {pacienteAtual.cpf}
                          </span>
                        )}
                        {pacienteAtual.profissional && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium">Terapeuta:</span>{" "}
                            {pacienteAtual.profissional.nome}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPacienteSelecionado(null)}
                      className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                    >
                      Alterar
                    </Button>
                  </div>
                </div>
              )}

              {/* Tabela de Pacientes */}
              {loading && (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Carregando pacientes...
                  </p>
                </div>
              )}

              {!loading && filteredPacientes.length === 0 && (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Nenhum paciente encontrado
                  </h3>
                  <p className="text-muted-foreground">
                    {searchTerm
                      ? "Tente ajustar os termos da sua busca."
                      : "Não há pacientes cadastrados no momento."}
                  </p>
                </div>
              )}

              {!loading && filteredPacientes.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">
                          Nome do Paciente
                        </TableHead>
                        <TableHead className="font-semibold">CPF</TableHead>
                        <TableHead className="font-semibold">
                          Terapeuta Responsável
                        </TableHead>
                        <TableHead className="text-right font-semibold">
                          Ação
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPacientes.map((paciente) => (
                        <TableRow
                          key={paciente.id}
                          className={`cursor-pointer transition-colors ${
                            pacienteSelecionado === paciente.id
                              ? "bg-primary/10 hover:bg-primary/15 border-l-4 border-l-primary"
                              : "hover:bg-muted/30"
                          }`}
                          onClick={() => setPacienteSelecionado(paciente.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <span className="font-medium">
                                {paciente.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">
                              {paciente.cpf || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {paciente.profissional?.nome ? (
                              <Badge variant="outline" className="font-normal">
                                {paciente.profissional.nome}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {pacienteSelecionado === paciente.id ? (
                              <Badge className="bg-primary">
                                ✓ Selecionado
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="hover:bg-primary/10 hover:text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPacienteSelecionado(paciente.id);
                                }}
                              >
                                Selecionar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lista de Curriculums */}
        {pacienteSelecionado && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Planos Terapêuticos Atribuídos
              </CardTitle>
              <CardDescription>
                Escolha o plano terapêutico que será aplicado nesta sessão
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCurriculums && (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Carregando planos...
                  </p>
                </div>
              )}

              {!loadingCurriculums && curriculums.length === 0 && (
                <div className="text-center py-8">
                  <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Nenhum plano terapêutico atribuído
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Este paciente ainda não possui planos terapêuticos atribuídos.
                  </p>
                  <Button onClick={() => router.push("/curriculum")}>
                    Gerenciar Planos Terapêuticos
                  </Button>
                </div>
              )}

              {!loadingCurriculums && curriculums.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Atividades</TableHead>
                      <TableHead>Atribuído em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {curriculums.map((atribuicao) => (
                      <TableRow key={atribuicao.id}>
                        <TableCell className="font-medium">
                          {atribuicao.curriculum.nome}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-md">
                          {atribuicao.curriculum.descricao
                            ? atribuicao.curriculum.descricao.length > 80
                              ? `${atribuicao.curriculum.descricao.substring(0, 80)}...`
                              : atribuicao.curriculum.descricao
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {atribuicao.curriculum.atividades.length} atividade(s)
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(atribuicao.atribuida_em).toLocaleDateString(
                            "pt-BR"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            onClick={() =>
                              iniciarSessaoCurriculum(atribuicao.curriculum.id)
                            }
                            disabled={iniciandoSessao}
                          >
                            {iniciandoSessao ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Iniciando...
                              </>
                            ) : (
                              <>
                                <Play className="mr-2 h-4 w-4" />
                                Iniciar Sessão
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lista de Avaliações */}
        {pacienteSelecionado && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Avaliações Atribuídas
              </CardTitle>
              <CardDescription>
                Escolha a avaliação que será aplicada nesta sessão
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAvaliacoes && (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Carregando avaliações...
                  </p>
                </div>
              )}

              {!loadingAvaliacoes && avaliacoes.length === 0 && (
                <div className="text-center py-8">
                  <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Nenhuma avaliação atribuída
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Este paciente ainda não possui avaliações atribuídas.
                  </p>
                  <Button onClick={() => router.push("/avaliacoes")}>
                    Gerenciar Avaliações
                  </Button>
                </div>
              )}

              {!loadingAvaliacoes && avaliacoes.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Tarefas</TableHead>
                      <TableHead>Atribuída em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {avaliacoes.map((atribuicao) => (
                      <TableRow key={atribuicao.id}>
                        <TableCell className="font-medium">
                          {atribuicao.avaliacao.nome}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {traduzirTipoAvaliacao(atribuicao.avaliacao.tipo)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {atribuicao.avaliacao.tarefas?.length || 0} tarefas
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(atribuicao.atribuida_em).toLocaleDateString(
                            "pt-BR"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            onClick={() =>
                              iniciarAvaliacao(atribuicao.avaliacao.id)
                            }
                            disabled={iniciandoSessao}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {iniciandoSessao ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Iniciando...
                              </>
                            ) : (
                              <>
                                <Play className="mr-2 h-4 w-4" />
                                Iniciar Avaliação
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {!pacienteSelecionado && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Selecione um paciente
                </h3>
                <p className="text-muted-foreground">
                  Para iniciar uma sessão, primeiro selecione o paciente acima
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Alert Dialog - Sessão Existente */}
      <AlertDialog open={sessaoExistenteDialog} onOpenChange={setSessaoExistenteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Sessão em Andamento
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base pt-2">
              {sessaoExistenteMensagem}
            </AlertDialogDescription>
            <div className="pt-2 text-sm text-muted-foreground">
              Você será direcionado para continuar esta sessão de onde parou. Todas as avaliações já realizadas serão mantidas.
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setSessaoExistenteDialog(false);
                if (sessaoExistenteId) {
                  router.push(`/aplicar-curriculum/${sessaoExistenteId}`);
                }
              }}
            >
              Continuar Sessão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
