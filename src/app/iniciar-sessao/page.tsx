/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Loader2,
  User,
  ClipboardList,
  ClipboardCheck,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
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
import {
  ActionButton,
  Carregando,
  EstadoVazio,
  IconButton,
  PageHeader,
  Panel,
  PersonAvatar,
  SearchField,
  FasePill,
  StatusPill,
} from "@/components/kit";

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
  ultimaAplicacao?: string | null;
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

/** Pacientes por página na lista de seleção (o v2 usa 8). */
const POR_PAGINA = 8;


// Dias desde a última aplicação para recomendar manutenção
const DIAS_MANUTENCAO_RECOMENDADA = 15;

function diasDesde(data: string | null | undefined): number | null {
  if (!data) return null;
  const ms = Date.now() - new Date(data).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function formatarUltimaAplicacao(data: string | null | undefined): string {
  if (!data) return "Nunca aplicada";
  return new Date(data).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Manutenção recomendada: fase MANUTENCAO e última aplicação > 15 dias (ou nunca aplicada)
function manutencaoRecomendada(instrucao: {
  faseAtual: string;
  ultimaAplicacao?: string | null;
}): boolean {
  if (instrucao.faseAtual !== "MANUTENCAO") return false;
  const dias = diasDesde(instrucao.ultimaAplicacao);
  return dias === null || dias > DIAS_MANUTENCAO_RECOMENDADA;
}

// ========== Componente Principal ==========

function IniciarSessaoPageContent() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  // Pacientes
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pagina, setPagina] = useState(1);

  // Busca nova volta para a primeira página
  useEffect(() => {
    setPagina(1);
  }, [searchTerm]);
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

  const totalPaginas = Math.max(1, Math.ceil(filteredPacientes.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicioPagina = (paginaAtual - 1) * POR_PAGINA;
  const pacientesDaPagina = filteredPacientes.slice(inicioPagina, inicioPagina + POR_PAGINA);

  const pacienteAtual = pacientes.find((p) => p.id === pacienteSelecionado);
  const qtdSelecionadas = instrucoesSelecionadas.size;

  // ========== Render ==========

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-7">
        <PageHeader
          titulo="Iniciar Sessão"
          subtitulo="Selecione o paciente e a atividade para iniciar a sessão terapêutica"
        />

        {error && (
          <div className="flex items-center gap-2 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger-ink">
            <AlertCircle className="size-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Seleção de Paciente — anatomia medida no clone do v2 */}
        <Panel
          icone={<User />}
          titulo="Selecionar Paciente"
          subtitulo="Escolha o paciente que participará da sessão"
        >
          <div className="space-y-4">
            <SearchField
              placeholder="Buscar por nome ou CPF..."
              aria-label="Buscar paciente por nome ou CPF"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {pacienteAtual && (
              <div className="anim-entrada flex flex-col gap-4 rounded-[1.5rem] bg-[linear-gradient(115deg,var(--kpi-blue-from)_0%,var(--kpi-blue-via)_55%,var(--kpi-blue-to)_100%)] p-5 sm:flex-row sm:items-center">
                <PersonAvatar nome={pacienteAtual.name} tamanho={56} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="truncate text-lg font-semibold text-ink">
                      {pacienteAtual.name}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[0.72rem] font-medium text-white">
                      <CheckCircle2 className="size-3.5" />
                      Selecionado
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-3">
                    {pacienteAtual.cpf && (
                      <span>
                        <span className="font-medium text-ink-2">CPF:</span>{" "}
                        <span className="tabular">{pacienteAtual.cpf}</span>
                      </span>
                    )}
                    {pacienteAtual.profissional && (
                      <span>
                        <span className="font-medium text-ink-2">Terapeuta:</span>{" "}
                        {pacienteAtual.profissional.nome}
                      </span>
                    )}
                  </div>
                </div>
                <ActionButton
                  variant="secondary"
                  size="sm"
                  className="hover:text-danger-ink"
                  onClick={() => setPacienteSelecionado(null)}
                >
                  Alterar
                </ActionButton>
              </div>
            )}

            {loading ? (
              <Carregando texto="Carregando pacientes..." />
            ) : filteredPacientes.length === 0 ? (
              <EstadoVazio
                icone={<User />}
                titulo="Nenhum paciente encontrado"
                texto={searchTerm ? "Tente ajustar os termos da busca." : "Não há pacientes cadastrados."}
              />
            ) : (
              <div className="space-y-3">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome do Paciente</TableHead>
                      <TableHead className="hidden md:table-cell">CPF</TableHead>
                      <TableHead className="hidden md:table-cell">Terapeuta Responsável</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pacientesDaPagina.map((paciente) => {
                      const selecionado = pacienteSelecionado === paciente.id;
                      return (
                        <TableRow
                          key={paciente.id}
                          tabIndex={0}
                          className="cursor-pointer transition-colors hover:bg-brand-soft/60 focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none"
                          onClick={() => setPacienteSelecionado(paciente.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setPacienteSelecionado(paciente.id);
                            }
                          }}
                        >
                          <TableCell>
                            <span className="flex items-center gap-3">
                              <PersonAvatar nome={paciente.name} tamanho={34} />
                              <span className="font-medium text-ink">{paciente.name}</span>
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {paciente.cpf ? (
                              <span className="tabular text-ink-3">{paciente.cpf}</span>
                            ) : (
                              <span className="text-ink-4">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {paciente.profissional?.nome ? (
                              <span className="text-ink-2">{paciente.profissional.nome}</span>
                            ) : (
                              <span className="text-ink-4">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {selecionado ? (
                              <StatusPill tom="info" ponto>
                                Selecionado
                              </StatusPill>
                            ) : (
                              <ActionButton
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPacienteSelecionado(paciente.id);
                                }}
                              >
                                Selecionar
                              </ActionButton>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Paginação — "1 a 8 de 48" à esquerda, "1 / 6" à direita */}
                <div className="flex items-center justify-between gap-3 px-1">
                  <p className="tabular text-[0.8rem] text-ink-3">
                    {inicioPagina + 1} a {Math.min(inicioPagina + POR_PAGINA, filteredPacientes.length)} de{" "}
                    {filteredPacientes.length}
                  </p>
                  {totalPaginas > 1 && (
                    <div className="flex items-center gap-2">
                      <IconButton
                        aria-label="Página anterior"
                        className="size-9"
                        disabled={paginaAtual <= 1}
                        onClick={() => setPagina(paginaAtual - 1)}
                      >
                        <ChevronLeft className="size-4" />
                      </IconButton>
                      <span className="tabular min-w-[3rem] text-center text-[0.8rem] text-ink-2">
                        {paginaAtual} / {totalPaginas}
                      </span>
                      <IconButton
                        aria-label="Próxima página"
                        className="size-9"
                        disabled={paginaAtual >= totalPaginas}
                        onClick={() => setPagina(paginaAtual + 1)}
                      >
                        <ChevronRight className="size-4" />
                      </IconButton>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Panel>

        {pacienteSelecionado ? (
          // Planos e avaliações lado a lado, cada item um cartão — como no v2.
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel
              icone={<ClipboardList />}
              titulo="Planos Terapêuticos Atribuídos"
              subtitulo="Escolha o plano terapêutico e selecione as instruções desta sessão"
            >
              {loadingCurriculums ? (
                <Carregando texto="Carregando planos..." />
              ) : curriculums.length === 0 ? (
                <EstadoVazio
                  icone={<ClipboardList />}
                  titulo="Nenhum plano terapêutico atribuído"
                  texto="Este paciente ainda não possui planos terapêuticos atribuídos."
                  acao={
                    <ActionButton size="sm" onClick={() => router.push("/curriculum")}>
                      Gerenciar Planos Terapêuticos
                    </ActionButton>
                  }
                />
              ) : (
                <ul className="space-y-2.5">
                  {curriculums.map((atribuicao) => (
                    <li key={atribuicao.id} className="rounded-2xl bg-surface-muted p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1.5">
                          <p className="font-semibold text-ink">{atribuicao.curriculum.nome}</p>
                          {atribuicao.curriculum.descricao && (
                            <p className="line-clamp-2 text-sm text-ink-3">
                              {atribuicao.curriculum.descricao}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
                            <StatusPill tom="info">
                              {atribuicao.curriculum.atividades.length} atividade(s)
                            </StatusPill>
                            <span className="tabular">
                              Atribuído em {new Date(atribuicao.atribuida_em).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        </div>
                        <ActionButton
                          size="sm"
                          onClick={() => abrirSelecaoInstrucoes(atribuicao.curriculum.id)}
                          disabled={iniciandoSessao || loadingInstrucoes}
                        >
                          {loadingInstrucoes && curriculumParaIniciar === atribuicao.curriculum.id ? (
                            <>
                              <Loader2 className="animate-spin" />
                              Carregando...
                            </>
                          ) : (
                            <>
                              <Play />
                              Iniciar Sessão
                            </>
                          )}
                        </ActionButton>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              icone={<ClipboardCheck />}
              titulo="Avaliações Atribuídas"
              subtitulo="Escolha a avaliação que será aplicada nesta sessão"
            >
              {loadingAvaliacoes ? (
                <Carregando texto="Carregando avaliações..." />
              ) : avaliacoes.length === 0 ? (
                <EstadoVazio
                  icone={<ClipboardCheck />}
                  titulo="Nenhuma avaliação atribuída"
                  texto="Este paciente ainda não possui avaliações atribuídas."
                  acao={
                    <ActionButton size="sm" variant="secondary" onClick={() => router.push("/avaliacoes")}>
                      Gerenciar Avaliações
                    </ActionButton>
                  }
                />
              ) : (
                <ul className="space-y-2.5">
                  {avaliacoes.map((atribuicao) => (
                    <li key={atribuicao.id} className="rounded-2xl bg-surface-muted p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1.5">
                          <p className="font-semibold text-ink">{atribuicao.avaliacao.nome}</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
                            <StatusPill tom="violet">
                              {traduzirTipoAvaliacao(atribuicao.avaliacao.tipo)}
                            </StatusPill>
                            <StatusPill tom="neutral">
                              {atribuicao.avaliacao.tarefas?.length || 0} tarefas
                            </StatusPill>
                          </div>
                          <p className="tabular text-xs text-ink-3">
                            Atribuída em {new Date(atribuicao.atribuida_em).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <ActionButton
                          size="sm"
                          className="bg-success text-white shadow-none hover:bg-success/90"
                          onClick={() => iniciarAvaliacao(atribuicao.avaliacao.id)}
                          disabled={iniciandoSessao}
                        >
                          {iniciandoSessao ? (
                            <>
                              <Loader2 className="animate-spin" />
                              Iniciando...
                            </>
                          ) : (
                            <>
                              <Play />
                              Iniciar Avaliação
                            </>
                          )}
                        </ActionButton>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        ) : (
          <Panel>
            <div className="py-10">
              <EstadoVazio
                icone={<User />}
                titulo="Selecione um paciente"
                texto="Para iniciar uma sessão, primeiro selecione o paciente acima"
              />
            </div>
          </Panel>
        )}
      </div>

      {/* ===== Dialog: Seleção de Instruções ===== */}
      <Dialog open={dialogSelecaoOpen} onOpenChange={setDialogSelecaoOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
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
                        <div className="flex-1 min-w-0">
                          <span className="text-sm leading-snug block">{instrucao.texto}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3 shrink-0" />
                            Última aplicação: {formatarUltimaAplicacao(instrucao.ultimaAplicacao)}
                          </span>
                        </div>
                        {manutencaoRecomendada(instrucao) && (
                          <Badge variant="outline" className="bg-warning-soft text-warning-ink text-xs gap-1 shrink-0">
                            <AlertTriangle className="h-3 w-3" />
                            Manutenção Recomendada
                          </Badge>
                        )}
                        <FasePill fase={instrucao.faseAtual} />
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
              <AlertCircle className="h-5 w-5 text-brand" />
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
