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
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import ProtectedRoute from "@/components/ProtectedRoute";

// ========== Interfaces ==========

interface Paciente {
  id: string;
  name: string;
  cpf?: string;
  birthDate: string;
  profissional?: { nome: string };
}

interface InstrucaoDisponivel {
  id: string;
  ordem: number;
  texto: string;
  faseAtual: string;
}

interface AtividadeDisponivel {
  id: string;
  nome: string;
  ordem: number;
  faseAtual: string;
  qtd_tentativas_alvo?: number;
  instrucoes: InstrucaoDisponivel[];
}

interface CurriculumAtividade {
  id: string;
  ordem: number;
  atividade: { id: string; nome: string; instrucoes: any[] };
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

// ========== FaseBadge ==========

const FASE_CONFIG: Record<string, { label: string; className: string }> = {
  LINHA_BASE: { label: "Linha de Base", className: "bg-gray-500 text-white" },
  INTERVENCAO: { label: "Intervenção", className: "bg-blue-500 text-white" },
  MANUTENCAO: { label: "Manutenção", className: "bg-green-500 text-white" },
  GENERALIZACAO: { label: "Generalização", className: "bg-amber-500 text-white" },
};

function FaseBadge({ fase }: { fase: string }) {
  const config = FASE_CONFIG[fase] || { label: fase, className: "bg-gray-400 text-white" };
  return <Badge className={`${config.className} text-xs`}>{config.label}</Badge>;
}

// ========== Componente Principal ==========

function IniciarSessaoPageContent() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  // Pacientes
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Curriculum / avaliações
  const [curriculums, setCurriculums] = useState<CurriculumAtribuido[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoAtribuida[]>([]);
  const [loadingCurriculums, setLoadingCurriculums] = useState(false);
  const [loadingAvaliacoes, setLoadingAvaliacoes] = useState(false);

  // Modal de seleção de instruções
  const [dialogSelecaoOpen, setDialogSelecaoOpen] = useState(false);
  const [curriculumParaIniciar, setCurriculumParaIniciar] = useState<string | null>(null);
  const [atividadesDisponíveis, setAtividadesDisponíveis] = useState<AtividadeDisponivel[]>([]);
  const [instrucoesSelecionadas, setInstrucoesSelecionadas] = useState<Set<string>>(new Set());
  const [loadingInstrucoes, setLoadingInstrucoes] = useState(false);
  const [iniciandoSessao, setIniciandoSessao] = useState(false);

  // Erros e dialogs
  const [error, setError] = useState<string | null>(null);
  const [sessaoExistenteDialog, setSessaoExistenteDialog] = useState(false);
  const [sessaoExistenteId, setSessaoExistenteId] = useState<string | null>(null);
  const [sessaoExistenteMensagem, setSessaoExistenteMensagem] = useState("");

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Iniciar Sessão" },
  ];

  // ========== Fetch ==========

  const fetchPacientes = async () => {
    if (!isAuthenticated || !user) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/pacientes", {
        headers: { "X-User-Data": btoa(JSON.stringify(user)), "X-Auth-Token": user.token },
      });
      const result = await res.json();
      if (result.success) setPacientes(result.data);
    } catch {
      setError("Erro ao carregar pacientes");
    } finally {
      setLoading(false);
    }
  };

  const fetchCurriculums = async (pacienteId: string) => {
    if (!user) return;
    try {
      setLoadingCurriculums(true);
      setError(null);
      const res = await fetch(`/api/curriculum/atribuir?pacienteId=${pacienteId}`, {
        headers: { "X-User-Data": btoa(JSON.stringify(user)), "X-Auth-Token": user.token },
      });
      const result = await res.json();
      if (result.success) setCurriculums(result.data);
    } catch {
      setError("Erro ao carregar planos terapêuticos");
    } finally {
      setLoadingCurriculums(false);
    }
  };

  const fetchAvaliacoes = async (pacienteId: string) => {
    if (!user) return;
    try {
      setLoadingAvaliacoes(true);
      setError(null);
      const res = await fetch(`/api/avaliacoes/atribuir?pacienteId=${pacienteId}`, {
        headers: { "X-User-Data": btoa(JSON.stringify(user)), "X-Auth-Token": user.token },
      });
      const result = await res.json();
      if (result.success) setAvaliacoes(result.data);
    } catch {
      setError("Erro ao carregar avaliações");
    } finally {
      setLoadingAvaliacoes(false);
    }
  };

  // ========== Seleção de Instruções ==========

  const abrirSelecaoInstrucoes = async (curriculumId: string) => {
    if (!user || !pacienteSelecionado) return;
    try {
      setLoadingInstrucoes(true);
      setError(null);
      setCurriculumParaIniciar(curriculumId);
      setDialogSelecaoOpen(true);
      setInstrucoesSelecionadas(new Set());

      const res = await fetch(
        `/api/sessoes-curriculum/instrucoes-disponiveis?pacienteId=${pacienteSelecionado}&curriculumId=${curriculumId}`,
        {
          headers: { "X-User-Data": btoa(JSON.stringify(user)), "X-Auth-Token": user.token },
        }
      );
      const result = await res.json();

      if (result.success) {
        const atividades: AtividadeDisponivel[] = result.data.atividadesClone;
        setAtividadesDisponíveis(atividades);
        // Pré-selecionar todas as instruções por padrão
        const todasIds = new Set<string>(
          atividades.flatMap((a) => a.instrucoes.map((i) => i.id))
        );
        setInstrucoesSelecionadas(todasIds);
      } else {
        setError(result.error || "Erro ao carregar instruções");
        setDialogSelecaoOpen(false);
      }
    } catch {
      setError("Erro ao carregar instruções disponíveis");
      setDialogSelecaoOpen(false);
    } finally {
      setLoadingInstrucoes(false);
    }
  };

  const toggleInstrucao = (instrucaoId: string) => {
    setInstrucoesSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(instrucaoId)) next.delete(instrucaoId);
      else next.add(instrucaoId);
      return next;
    });
  };

  const toggleAtividade = (atividade: AtividadeDisponivel) => {
    const todasSelecionadas = atividade.instrucoes.every((i) => instrucoesSelecionadas.has(i.id));
    setInstrucoesSelecionadas((prev) => {
      const next = new Set(prev);
      if (todasSelecionadas) {
        atividade.instrucoes.forEach((i) => next.delete(i.id));
      } else {
        atividade.instrucoes.forEach((i) => next.add(i.id));
      }
      return next;
    });
  };

  // ========== Iniciar Sessão ==========

  const confirmarIniciarSessao = async () => {
    if (!curriculumParaIniciar || !pacienteSelecionado || !user) return;
    if (instrucoesSelecionadas.size === 0) {
      setError("Selecione pelo menos uma instrução para a sessão");
      return;
    }

    // Montar lista de {instrucaoId, atividadeCloneId}
    const instrucoesSelecionadasArray = atividadesDisponíveis.flatMap((a) =>
      a.instrucoes
        .filter((i) => instrucoesSelecionadas.has(i.id))
        .map((i) => ({ instrucaoId: i.id, atividadeCloneId: a.id }))
    );

    try {
      setIniciandoSessao(true);
      setError(null);

      const res = await fetch("/api/sessoes-curriculum", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": btoa(JSON.stringify(user)),
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({
          pacienteId: pacienteSelecionado,
          curriculumId: curriculumParaIniciar,
          instrucoesSelecionadas: instrucoesSelecionadasArray,
        }),
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Erro ao iniciar sessão");

      setDialogSelecaoOpen(false);

      if (result.existente) {
        setSessaoExistenteId(result.data.id);
        setSessaoExistenteMensagem(result.message || "Já existe uma sessão em andamento.");
        setSessaoExistenteDialog(true);
      } else {
        router.push(`/aplicar-curriculum/${result.data.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar sessão");
    } finally {
      setIniciandoSessao(false);
    }
  };

  // ========== Avaliação ==========

  const iniciarAvaliacao = async (avaliacaoId: string) => {
    if (!pacienteSelecionado || !user) return;
    try {
      setIniciandoSessao(true);
      setError(null);
      const res = await fetch("/api/sessoes-avaliacao", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": btoa(JSON.stringify(user)),
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({ pacienteId: pacienteSelecionado, avaliacaoId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao iniciar avaliação");
      if (result.success) router.push(`/aplicar-avaliacao/${result.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar avaliação");
    } finally {
      setIniciandoSessao(false);
    }
  };

  // ========== Effects ==========

  useEffect(() => {
    if (isAuthenticated && user) fetchPacientes();
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (pacienteSelecionado) {
      fetchCurriculums(pacienteSelecionado);
      fetchAvaliacoes(pacienteSelecionado);
    } else {
      setCurriculums([]);
      setAvaliacoes([]);
    }
  }, [pacienteSelecionado]);

  const filteredPacientes = pacientes.filter(
    (p) =>
      (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.cpf && p.cpf.includes(searchTerm))
  );

  const traduzirTipoAvaliacao = (tipo: string) => {
    const tipos: Record<string, string> = {
      AQUISICAO_HABILIDADES: "Aquisição de Habilidades",
      REDUCAO_COMPORTAMENTOS: "Redução de Comportamentos",
    };
    return tipos[tipo] || tipo;
  };

  const pacienteAtual = pacientes.find((p) => p.id === pacienteSelecionado);
  const qtdSelecionadas = instrucoesSelecionadas.size;

  // ========== Render ==========

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
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CPF..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {pacienteAtual && (
                <div className="p-5 border-2 rounded-lg bg-primary/5 border-primary shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg">{pacienteAtual.name}</span>
                        <Badge className="bg-primary">✓ Selecionado</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-3">
                        {pacienteAtual.cpf && <span><span className="font-medium">CPF:</span> {pacienteAtual.cpf}</span>}
                        {pacienteAtual.profissional && (
                          <span><span className="font-medium">Terapeuta:</span> {pacienteAtual.profissional.nome}</span>
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

              {loading && (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Carregando pacientes...</p>
                </div>
              )}

              {!loading && filteredPacientes.length === 0 && (
                <div className="text-center py-8">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum paciente encontrado</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? "Tente ajustar os termos da busca." : "Não há pacientes cadastrados."}
                  </p>
                </div>
              )}

              {!loading && filteredPacientes.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Nome do Paciente</TableHead>
                        <TableHead className="font-semibold">CPF</TableHead>
                        <TableHead className="font-semibold">Terapeuta Responsável</TableHead>
                        <TableHead className="text-right font-semibold">Ação</TableHead>
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
                              <span className="font-medium">{paciente.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{paciente.cpf || "-"}</TableCell>
                          <TableCell>
                            {paciente.profissional?.nome ? (
                              <Badge variant="outline" className="font-normal">{paciente.profissional.nome}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {pacienteSelecionado === paciente.id ? (
                              <Badge className="bg-primary">✓ Selecionado</Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="hover:bg-primary/10 hover:text-primary"
                                onClick={(e) => { e.stopPropagation(); setPacienteSelecionado(paciente.id); }}
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

        {/* Planos Terapêuticos */}
        {pacienteSelecionado && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Planos Terapêuticos Atribuídos
              </CardTitle>
              <CardDescription>
                Escolha o plano terapêutico e selecione as instruções desta sessão
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCurriculums && (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Carregando planos...</p>
                </div>
              )}

              {!loadingCurriculums && curriculums.length === 0 && (
                <div className="text-center py-8">
                  <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum plano terapêutico atribuído</h3>
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
                        <TableCell className="font-medium">{atribuicao.curriculum.nome}</TableCell>
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
                          {new Date(atribuicao.atribuida_em).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            onClick={() => abrirSelecaoInstrucoes(atribuicao.curriculum.id)}
                            disabled={iniciandoSessao || loadingInstrucoes}
                          >
                            {loadingInstrucoes && curriculumParaIniciar === atribuicao.curriculum.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Carregando...
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

        {/* Avaliações */}
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
                  <p className="text-muted-foreground">Carregando avaliações...</p>
                </div>
              )}

              {!loadingAvaliacoes && avaliacoes.length === 0 && (
                <div className="text-center py-8">
                  <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma avaliação atribuída</h3>
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
                        <TableCell className="font-medium">{atribuicao.avaliacao.nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{traduzirTipoAvaliacao(atribuicao.avaliacao.tipo)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{atribuicao.avaliacao.tarefas?.length || 0} tarefas</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(atribuicao.atribuida_em).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            onClick={() => iniciarAvaliacao(atribuicao.avaliacao.id)}
                            disabled={iniciandoSessao}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {iniciandoSessao ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Iniciando...</>
                            ) : (
                              <><Play className="mr-2 h-4 w-4" />Iniciar Avaliação</>
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
                <h3 className="text-lg font-medium mb-2">Selecione um paciente</h3>
                <p className="text-muted-foreground">
                  Para iniciar uma sessão, primeiro selecione o paciente acima
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ===== Dialog: Seleção de Instruções ===== */}
      <Dialog open={dialogSelecaoOpen} onOpenChange={setDialogSelecaoOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar Instruções da Sessão</DialogTitle>
            <DialogDescription>
              Escolha quais instruções serão aplicadas nesta sessão. Você pode selecionar instruções de diferentes atividades.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {loadingInstrucoes && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Carregando instruções...</p>
              </div>
            )}

            {!loadingInstrucoes && atividadesDisponíveis.map((atividade) => {
              const todasAtivSelecionadas = atividade.instrucoes.every((i) =>
                instrucoesSelecionadas.has(i.id)
              );
              const algumaAtivSelecionada = atividade.instrucoes.some((i) =>
                instrucoesSelecionadas.has(i.id)
              );

              return (
                <div key={atividade.id} className="border rounded-lg overflow-hidden">
                  {/* Header da atividade */}
                  <div
                    className="flex items-center gap-3 p-3 bg-muted/40 cursor-pointer hover:bg-muted/60"
                    onClick={() => toggleAtividade(atividade)}
                  >
                    <Checkbox
                      checked={todasAtivSelecionadas}
                      className={algumaAtivSelecionada && !todasAtivSelecionadas ? "opacity-50" : ""}
                      onCheckedChange={() => toggleAtividade(atividade)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="font-medium text-sm flex-1">{atividade.nome}</span>
                    <Badge variant="secondary" className="text-xs">
                      {atividade.instrucoes.filter((i) => instrucoesSelecionadas.has(i.id)).length}/{atividade.instrucoes.length}
                    </Badge>
                  </div>

                  {/* Instruções */}
                  <div className="divide-y">
                    {atividade.instrucoes.map((instrucao) => (
                      <div
                        key={instrucao.id}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/20 transition-colors ${
                          instrucoesSelecionadas.has(instrucao.id) ? "bg-primary/5" : ""
                        }`}
                        onClick={() => toggleInstrucao(instrucao.id)}
                      >
                        <Checkbox
                          checked={instrucoesSelecionadas.has(instrucao.id)}
                          onCheckedChange={() => toggleInstrucao(instrucao.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm flex-1 leading-snug">{instrucao.texto}</span>
                        <FaseBadge fase={instrucao.faseAtual} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {!loadingInstrucoes && atividadesDisponíveis.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma atividade com instruções encontrada para este curriculum.
              </div>
            )}
          </div>

          <div className="border-t pt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {qtdSelecionadas} instrução(ões) selecionada(s)
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogSelecaoOpen(false)} disabled={iniciandoSessao}>
                Cancelar
              </Button>
              <Button
                onClick={confirmarIniciarSessao}
                disabled={iniciandoSessao || qtdSelecionadas === 0}
              >
                {iniciandoSessao ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Iniciando...</>
                ) : (
                  <><Play className="mr-2 h-4 w-4" />Iniciar Sessão ({qtdSelecionadas})</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              Você será direcionado para continuar esta sessão de onde parou.
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setSessaoExistenteDialog(false);
                if (sessaoExistenteId) router.push(`/aplicar-curriculum/${sessaoExistenteId}`);
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

export default function IniciarSessaoPage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: "sessoes", action: "CREATE" }}>
      <IniciarSessaoPageContent />
    </ProtectedRoute>
  );
}
