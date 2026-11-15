/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/main-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  History,
  Search,
  Loader2,
  Eye,
  Calendar,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Play,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { isTentativaCorreta } from "@/lib/pontuacao";
import {
  ActionButton,
  Carregando,
  EstadoVazio,
  IconButton,
  PageHeader,
  Panel,
  PersonAvatar,
  SearchField,
  StatCard,
  FasePill,
  StatusPill,
  type TomStatus,
} from "@/components/kit";

interface Paciente {
  id: string;
  name: string;
}

// Avaliação individual (curriculum — novo formato)
interface AvaliacaoCurriculum {
  id: string;
  instrucaoId: string;
  atividadeCloneId: string | null;
  tentativa: number;
  nota: number; // índice na lista de pontuações
  observacao?: string | null;
}

// Pontuação por instrução/fase
interface InstrucaoPontuacao {
  id: string;
  fase: string;
  ordem: number;
  sigla: string;
  grau: string;
}

// Instrução com fase e pontuações
interface InstrucaoClone {
  id: string;
  ordem: number;
  texto: string;
  faseAtual: string;
  qtd_tentativas_alvo: number;
  pontuacoes?: InstrucaoPontuacao[];
}

// Atividade clone com suas instruções
interface AtividadeClone {
  id: string;
  nome: string;
  ordem: number;
  faseAtual: string;
  instrucoes: InstrucaoClone[];
}

// Histórico de mudança de fase desta sessão
interface HistoricoFaseSessao {
  id: string;
  instrucaoId: string;
  faseAnterior: string;
  faseNova: string;
  motivo: string;
}

// Avaliação antiga (sessões de atividade legado)
interface AvaliacaoLegado {
  id: string;
  nota: number;
  tipos_ajuda: string[];
  observacao?: string;
  instrucao: { ordem: number; texto: string };
}

interface Sessao {
  id: string;
  iniciada_em: string;
  finalizada_em?: string;
  status: string;
  observacoes_gerais?: string;
  tipo?: "ATIVIDADE" | "AVALIACAO" | "CURRICULUM";
  paciente: { id: string; nome: string };
  atividade?: { id: string; nome: string; tipo: string; metodologia?: string };
  curriculum?: { id: string; nome: string };
  profissional: { nome: string };
  // Curriculum novo formato
  atividadesClone?: AtividadeClone[];
  instrucoesSelecionadas?: { instrucaoId: string; atividadeCloneId: string }[];
  avaliacoes?: AvaliacaoCurriculum[] | AvaliacaoLegado[];
  historicoFasesSessao?: HistoricoFaseSessao[];
  // Avaliação ABA+
  respostas?: any[];
  avaliacao?: any;
}


const TOM_STATUS_SESSAO: Record<string, TomStatus> = {
  EM_ANDAMENTO: "warning",
  FINALIZADA: "success",
  CANCELADA: "danger",
};

/** Sessões por página (o v2 usa 12). */
const POR_PAGINA = 12;

/** Microetiqueta de seção do modal. */
function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.72rem] font-medium tracking-wide text-ink-4 uppercase">{children}</p>
  );
}

/** Um número do "Resumo do Desempenho": cartão branco sobre a faixa em gradiente. */
function NumeroResumo({
  valor,
  rotulo,
  apoio,
  cor,
}: {
  valor: React.ReactNode;
  rotulo: string;
  apoio: React.ReactNode;
  cor: string;
}) {
  return (
    <div className="rounded-2xl bg-surface/80 px-2 py-3 text-center">
      <p className={`tabular text-[1.9rem] leading-none font-bold tracking-tight ${cor}`}>{valor}</p>
      <p className="mt-1.5 text-xs font-medium text-ink-2">{rotulo}</p>
      <p className="text-[0.7rem] text-ink-3">{apoio}</p>
    </div>
  );
}

function HistoricoSessoesPageContent() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [pacienteFiltro, setPacienteFiltro] = useState<string>("all");
  const [statusFiltro, setStatusFiltro] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [sessaoDetalhes, setSessaoDetalhes] = useState<Sessao | null>(null);
  // Um modal só para a tela, não um por linha
  const [detalhesAberto, setDetalhesAberto] = useState(false);
  const [pagina, setPagina] = useState(1);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Histórico de Sessões" },
  ];

  // Buscar pacientes
  const fetchPacientes = async () => {
    try {
      if (!user) return;

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

      if (result.success) {
        setPacientes(result.data);
      }
    } catch (err) {
      console.error("Erro ao buscar pacientes:", err);
    }
  };

  // Buscar sessões (curriculum + avaliações)
  const fetchSessoes = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      // Construir query params
      const params = new URLSearchParams();
      if (pacienteFiltro !== "all") {
        params.append("pacienteId", pacienteFiltro);
      }
      if (statusFiltro !== "all") {
        params.append("status", statusFiltro);
      }

      // Buscar sessões de CURRICULUM
      const responseCurriculum = await fetch(`/api/sessoes-curriculum?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      // Buscar sessões de AVALIAÇÃO
      const responseAvaliacoes = await fetch(`/api/sessoes-avaliacao?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const resultCurriculum = await responseCurriculum.json();
      const resultAvaliacoes = await responseAvaliacoes.json();

      // Marcar curriculums
      const sessoesCurriculum = resultCurriculum.success ? resultCurriculum.data.map((s: any) => ({
        ...s,
        tipo: "CURRICULUM"
      })) : [];

      // Marcar avaliações
      const sessoesAvaliacoes = resultAvaliacoes.success ? resultAvaliacoes.data.map((s: any) => ({
        ...s,
        tipo: "AVALIACAO"
      })) : [];

      // Unir e ordenar por data
      const todasSessoes = [...sessoesCurriculum, ...sessoesAvaliacoes].sort((a, b) => {
        return new Date(b.iniciada_em).getTime() - new Date(a.iniciada_em).getTime();
      });

      setSessoes(todasSessoes);
    } catch (err) {
      console.error("❌ Erro ao buscar sessões:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar sessões");
    } finally {
      setLoading(false);
    }
  };

  // Buscar detalhes de uma sessão
  const fetchSessaoDetalhes = async (sessaoId: string, tipo?: string) => {
    try {
      if (!user) return;

      const userDataEncoded = btoa(JSON.stringify(user));

      // Escolher API baseado no tipo
      const apiUrl = tipo === "CURRICULUM"
        ? `/api/sessoes-curriculum?id=${sessaoId}`
        : `/api/sessoes-avaliacao?id=${sessaoId}`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (result.success) {
        setSessaoDetalhes({...result.data, tipo: tipo || result.data.tipo});
      }
    } catch (err) {
      console.error("Erro ao buscar detalhes:", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchPacientes();
      fetchSessoes();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchSessoes();
    }
  }, [pacienteFiltro, statusFiltro]);

  // Filtrar sessões por termo de busca
  const filteredSessoes = sessoes.filter(
    (sessao) => {
      const nomeItem = sessao.tipo === "CURRICULUM"
        ? (sessao.curriculum?.nome || "")
        : (sessao.avaliacao?.nome || sessao.atividade?.nome || "");

      return (
        sessao.paciente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nomeItem.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sessao.profissional.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  );

  // Formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Filtro novo volta para a primeira página
  useEffect(() => {
    setPagina(1);
  }, [searchTerm, pacienteFiltro, statusFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(filteredSessoes.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicioPagina = (paginaAtual - 1) * POR_PAGINA;
  const sessoesDaPagina = filteredSessoes.slice(inicioPagina, inicioPagina + POR_PAGINA);

  const abrirDetalhes = (sessao: Sessao) => {
    setSessaoDetalhes(null);
    setDetalhesAberto(true);
    fetchSessaoDetalhes(sessao.id, sessao.tipo);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calcular duração da sessão
  const calcularDuracao = (inicio: string, fim?: string) => {
    if (!fim) return "-";
    const diff = new Date(fim).getTime() - new Date(inicio).getTime();
    const minutos = Math.floor(diff / 60000);
    return `${minutos} min`;
  };

  // Calcular estatísticas de uma sessão de CURRICULUM (novo formato por instrução)
  const calcularEstatisticasCurriculum = (sessao: Sessao) => {
    const instrucoesSel = sessao.instrucoesSelecionadas || [];
    const historico = sessao.historicoFasesSessao || [];
    const avaliacoes = (sessao.avaliacoes || []) as AvaliacaoCurriculum[];
    const clones = sessao.atividadesClone || [];
    const FASE_ORDER = ["LINHA_BASE", "INTERVENCAO", "MANUTENCAO", "GENERALIZACAO"];

    const totalInstrucoes = instrucoesSel.length;
    const avancaram = historico.filter(
      (h) => FASE_ORDER.indexOf(h.faseNova) > FASE_ORDER.indexOf(h.faseAnterior)
    ).length;
    const regrediram = historico.filter(
      (h) => FASE_ORDER.indexOf(h.faseNova) < FASE_ORDER.indexOf(h.faseAnterior)
    ).length;

    let totalTentativas = 0;
    let tentativasCorretas = 0;
    for (const av of avaliacoes) {
      const clone = clones.find((c) => c.instrucoes.some((i) => i.id === av.instrucaoId));
      const instrucao = clone?.instrucoes.find((i) => i.id === av.instrucaoId);
      if (!instrucao || !instrucao.pontuacoes) continue;
      const ponts = instrucao.pontuacoes
        .filter((p) => p.fase === instrucao.faseAtual)
        .sort((a, b) => a.ordem - b.ordem);
      totalTentativas++;
      if (isTentativaCorreta(av.nota, ponts)) tentativasCorretas++;
    }

    const percentAcerto =
      totalTentativas > 0 ? Math.round((tentativasCorretas / totalTentativas) * 100) : 0;

    return { totalInstrucoes, avancaram, regrediram, percentAcerto, totalTentativas, tentativasCorretas };
  };

  // Calcular estatísticas de uma sessão de AVALIAÇÃO
  const calcularEstatisticasAvaliacao = (sessao: Sessao) => {
    if (!sessao.respostas || sessao.respostas.length === 0) {
      return { media: 0, respondidas: 0, total: 0, naoAplicavel: 0 };
    }

    const total = sessao.respostas.length;
    const respostasValidas = sessao.respostas.filter(
      (r: any) => r.pontuacao !== null && r.pontuacao !== -1
    );
    const naoAplicavel = sessao.respostas.filter(
      (r: any) => r.pontuacao === -1
    ).length;

    const somaPontuacoes = respostasValidas.reduce(
      (acc: number, r: any) => acc + (r.pontuacao || 0),
      0
    );
    const media = respostasValidas.length > 0 ? somaPontuacoes / respostasValidas.length : 0;
    const respondidas = sessao.respostas.filter(
      (r: any) => r.pontuacao !== null
    ).length;

    return { media: media.toFixed(1), respondidas, total, naoAplicavel };
  };

  // Traduzir tipo
  const traduzirTipo = (tipo: string) => {
    const tipos: Record<string, string> = {
      PROTOCOLO_ABA: "Protocolo ABA",
      AVALIACAO_CLINICA: "Avaliação Clínica",
      JOGO_MEMORIA: "Jogo de Memória",
      CUSTOM: "Personalizada",
      AQUISICAO_HABILIDADES: "Aquisição de Habilidades",
      REDUCAO_COMPORTAMENTOS: "Redução de Comportamentos",
    };
    return tipos[tipo] || tipo;
  };

  // Obter label do tipo de sessão
  const getTipoSessaoLabel = (sessao: Sessao) => {
    if (sessao.tipo === "AVALIACAO") {
      return "Avaliação";
    }
    return "Plano Terapêutico";
  };

  // Traduzir status
  const traduzirStatus = (status: string) => {
    const statuses: Record<
      string,
      {
        label: string;
        variant:
          | "default"
          | "success"
          | "destructive"
          | "outline"
          | "secondary";
      }
    > = {
      EM_ANDAMENTO: { label: "Em Andamento", variant: "default" },
      FINALIZADA: { label: "Finalizada", variant: "success" },
      CANCELADA: { label: "Cancelada", variant: "destructive" },
    };
    return statuses[status] || { label: status, variant: "outline" };
  };

  const est = sessaoDetalhes?.tipo === "CURRICULUM" ? calcularEstatisticasCurriculum(sessaoDetalhes) : null;
  const estAv =
    sessaoDetalhes?.tipo === "AVALIACAO" && sessaoDetalhes.respostas?.length
      ? calcularEstatisticasAvaliacao(sessaoDetalhes)
      : null;

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-7">
        <PageHeader
          titulo="Histórico de Sessões"
          subtitulo="Visualize e acompanhe todas as sessões realizadas"
        />

        {/* Filtros acima dos KPIs — posição medida no clone do v2 */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SearchField
            placeholder="Buscar por paciente, plano terapêutico/avaliação ou terapeuta..."
            aria-label="Buscar sessões"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Select value={pacienteFiltro} onValueChange={setPacienteFiltro}>
            <SelectTrigger className="h-11 w-full rounded-full border-rim bg-surface/80 text-sm md:w-[14rem]">
              <SelectValue placeholder="Todos os pacientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os pacientes</SelectItem>
              {pacientes.map((paciente) => (
                <SelectItem key={paciente.id} value={paciente.id}>
                  {paciente.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger className="h-11 w-full rounded-full border-rim bg-surface/80 text-sm md:w-[11rem]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="FINALIZADA">Finalizadas</SelectItem>
              <SelectItem value="EM_ANDAMENTO">Em Andamento</SelectItem>
              <SelectItem value="CANCELADA">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="anim-escalonada grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr]">
          <StatCard
            tom="blue"
            size="hero"
            icone={<History />}
            rotulo="Total de Sessões"
            valor={loading ? "..." : sessoes.length}
          />
          <StatCard
            tom="mint"
            icone={<CheckCircle2 />}
            rotulo="Finalizadas"
            valor={loading ? "..." : sessoes.filter((s) => s.status === "FINALIZADA").length}
          />
          <StatCard
            tom="lavender"
            icone={<Clock />}
            rotulo="Em Andamento"
            valor={loading ? "..." : sessoes.filter((s) => s.status === "EM_ANDAMENTO").length}
          />
          <StatCard
            tom="peach"
            icone={<TrendingUp />}
            rotulo="Pacientes Atendidos"
            valor={loading ? "..." : new Set(sessoes.map((s) => s.paciente.id)).size}
          />
        </div>

        <Panel
          icone={<History />}
          titulo={
            <span className="inline-flex items-center gap-2">
              Sessões Registradas
              {!loading && (
                <span className="tabular rounded-full bg-surface-sunken px-2 py-0.5 text-[0.72rem] font-semibold text-ink-2">
                  {filteredSessoes.length}
                </span>
              )}
            </span>
          }
          subtitulo="Lista completa de sessões realizadas"
        >
          {error ? (
            <EstadoVazio
              icone={<AlertCircle />}
              titulo="Erro ao carregar sessões"
              texto={error}
              acao={
                <ActionButton variant="secondary" size="sm" onClick={fetchSessoes}>
                  Tentar Novamente
                </ActionButton>
              }
            />
          ) : loading ? (
            <Carregando texto="Carregando sessões..." />
          ) : filteredSessoes.length === 0 ? (
            <EstadoVazio
              icone={<History />}
              titulo="Nenhuma sessão encontrada"
              texto={
                sessoes.length === 0
                  ? "Ainda não há sessões registradas."
                  : "Nenhuma sessão corresponde aos filtros selecionados."
              }
              acao={
                sessoes.length === 0 ? (
                  <ActionButton size="sm" onClick={() => router.push("/iniciar-sessao")}>
                    Iniciar Nova Sessão
                  </ActionButton>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="hidden md:table-cell">Curriculum/Avaliação</TableHead>
                    <TableHead className="hidden md:table-cell">Terapeuta</TableHead>
                    <TableHead className="hidden md:table-cell">Data/Hora</TableHead>
                    <TableHead className="hidden md:table-cell">Duração</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Ações</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessoesDaPagina.map((sessao) => {
                    const status = traduzirStatus(sessao.status);
                    return (
                      <TableRow key={sessao.id}>
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-3">
                            <PersonAvatar nome={sessao.paciente.nome} tamanho={34} />
                            <span className="font-medium text-ink">{sessao.paciente.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusPill tom={sessao.tipo === "AVALIACAO" ? "violet" : "info"}>
                            {getTipoSessaoLabel(sessao)}
                          </StatusPill>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="font-medium text-ink-2">
                            {sessao.tipo === "CURRICULUM"
                              ? sessao.curriculum?.nome
                              : sessao.avaliacao?.nome || sessao.atividade?.nome}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{sessao.profissional.nome}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="tabular text-sm whitespace-nowrap">
                            {formatDateTime(sessao.iniciada_em)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="tabular whitespace-nowrap">
                            {calcularDuracao(sessao.iniciada_em, sessao.finalizada_em)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusPill tom={TOM_STATUS_SESSAO[sessao.status] ?? "neutral"} ponto>
                            {status.label}
                          </StatusPill>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {sessao.status === "EM_ANDAMENTO" && (
                              <ActionButton
                                size="sm"
                                onClick={() => {
                                  if (sessao.tipo === "CURRICULUM") {
                                    router.push(`/aplicar-curriculum/${sessao.id}`);
                                  } else if (sessao.tipo === "AVALIACAO") {
                                    router.push(`/aplicar-avaliacao/${sessao.id}`);
                                  }
                                }}
                              >
                                <Play />
                                Continuar
                              </ActionButton>
                            )}
                            <button
                              type="button"
                              aria-label={`Ver detalhes da sessão de ${sessao.paciente.nome}`}
                              title="Ver detalhes"
                              onClick={() => abrirDetalhes(sessao)}
                              className="grid size-9 place-items-center rounded-full bg-surface text-ink-2 shadow-[0_1px_2px_rgba(15,27,61,0.06)] transition hover:text-brand focus-visible:ring-4 focus-visible:ring-brand-ring focus-visible:outline-none"
                            >
                              <Eye className="size-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between gap-3 px-1">
                <p className="tabular text-[0.8rem] text-ink-3">
                  {inicioPagina + 1} a {Math.min(inicioPagina + POR_PAGINA, filteredSessoes.length)} de{" "}
                  {filteredSessoes.length}
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
        </Panel>
      </div>

      {/* ===== Modal: Detalhes da Sessão — anatomia medida no clone do v2 ===== */}
      <Dialog open={detalhesAberto} onOpenChange={setDetalhesAberto}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2 text-[1.3rem]">
              <History className="size-5 text-brand" />
              Detalhes da Sessão
            </DialogTitle>
            <DialogDescription className="text-ink-3">
              Informações completas e avaliações
            </DialogDescription>
          </DialogHeader>

          {!sessaoDetalhes ? (
            <Carregando texto="Carregando detalhes..." />
          ) : (
            <div className="space-y-5">
              {/* Identificação */}
              <div className="grid gap-4 rounded-2xl bg-surface-muted p-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Rotulo>Paciente</Rotulo>
                  <div className="flex items-center gap-2 font-medium text-ink">
                    <PersonAvatar nome={sessaoDetalhes.paciente.nome} tamanho={28} />
                    {sessaoDetalhes.paciente.nome}
                  </div>
                </div>
                <div className="space-y-1">
                  <Rotulo>Terapeuta</Rotulo>
                  <div className="font-medium text-ink">{sessaoDetalhes.profissional.nome}</div>
                </div>
                <div className="space-y-1">
                  <Rotulo>{sessaoDetalhes.tipo === "CURRICULUM" ? "Plano Terapêutico" : "Avaliação"}</Rotulo>
                  <div className="font-medium text-ink">
                    {sessaoDetalhes.tipo === "CURRICULUM"
                      ? sessaoDetalhes.curriculum?.nome
                      : sessaoDetalhes.avaliacao?.nome || sessaoDetalhes.atividade?.nome}
                  </div>
                </div>
                <div className="space-y-1">
                  <Rotulo>Tipo</Rotulo>
                  <div>
                    <StatusPill tom={sessaoDetalhes.tipo === "AVALIACAO" ? "violet" : "info"}>
                      {getTipoSessaoLabel(sessaoDetalhes)}
                    </StatusPill>
                  </div>
                </div>
                <div className="space-y-1">
                  <Rotulo>Status</Rotulo>
                  <div>
                    <StatusPill tom={TOM_STATUS_SESSAO[sessaoDetalhes.status] ?? "neutral"} ponto>
                      {traduzirStatus(sessaoDetalhes.status).label}
                    </StatusPill>
                  </div>
                </div>
                <div className="space-y-1">
                  <Rotulo>Data e duração</Rotulo>
                  <div className="tabular font-medium text-ink">
                    {formatDateTime(sessaoDetalhes.iniciada_em)}
                    <span className="text-ink-3">
                      {" · "}
                      {calcularDuracao(sessaoDetalhes.iniciada_em, sessaoDetalhes.finalizada_em)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Resumo do Desempenho — plano terapêutico */}
              {est && (
                <div className="space-y-2">
                  <Rotulo>Resumo do Desempenho</Rotulo>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[linear-gradient(115deg,var(--kpi-blue-from)_0%,var(--kpi-lavender-to)_100%)] p-2 sm:grid-cols-4">
                    <NumeroResumo valor={est.totalInstrucoes} rotulo="Instruções" apoio="na sessão" cor="text-brand" />
                    <NumeroResumo valor={est.avancaram} rotulo="Avançaram" apoio="de fase" cor="text-success-ink" />
                    <NumeroResumo valor={est.regrediram} rotulo="Regrediram" apoio="de fase" cor="text-danger-ink" />
                    <NumeroResumo
                      valor={`${est.percentAcerto}%`}
                      rotulo="Acerto"
                      apoio={`(${est.tentativasCorretas}/${est.totalTentativas})`}
                      cor="text-violet-ink"
                    />
                  </div>
                </div>
              )}

              {/* Resumo do Desempenho — avaliação */}
              {estAv && sessaoDetalhes.respostas && (
                <div className="space-y-2">
                  <Rotulo>Resumo do Desempenho</Rotulo>
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[linear-gradient(115deg,var(--kpi-mint-from)_0%,var(--kpi-blue-to)_100%)] p-2 sm:grid-cols-4">
                    <NumeroResumo valor={`${estAv.media}%`} rotulo="Média Geral" apoio="(pontuação)" cor="text-brand" />
                    <NumeroResumo valor={estAv.respondidas} rotulo="Respondidas" apoio={`(de ${estAv.total})`} cor="text-success-ink" />
                    <NumeroResumo valor={estAv.naoAplicavel} rotulo="N/A" apoio="(não aplicável)" cor="text-warning-ink" />
                    <NumeroResumo valor={estAv.total} rotulo="Total" apoio="tarefas" cor="text-violet-ink" />
                  </div>

                  <div className="rounded-2xl bg-surface-muted p-4">
                    <p className="mb-3 text-sm font-semibold text-ink">Distribuição de Pontuações</p>
                    <div className="space-y-2">
                      {[100, 75, 50, 25, 0, -1].map((pontuacao) => {
                        const count = sessaoDetalhes.respostas!.filter((r: any) => r.pontuacao === pontuacao).length;
                        const percentage = (count / sessaoDetalhes.respostas!.length) * 100;
                        const cor =
                          pontuacao === 100
                            ? "bg-success"
                            : pontuacao === 75
                              ? "bg-brand"
                              : pontuacao === 50 || pontuacao === 25
                                ? "bg-warning"
                                : pontuacao === 0
                                  ? "bg-danger"
                                  : "bg-ink-4";
                        return (
                          <div key={pontuacao} className="flex items-center gap-3">
                            <span className="tabular w-12 text-xs font-medium text-ink-2">
                              {pontuacao === -1 ? "N/A" : `${pontuacao}%`}
                            </span>
                            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface">
                              <div className={`h-full rounded-full ${cor}`} style={{ width: `${percentage}%` }} />
                            </div>
                            <span className="tabular w-16 text-right text-xs text-ink-3">
                              {count} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Respostas das tarefas — avaliação */}
              {sessaoDetalhes.tipo === "AVALIACAO" &&
                sessaoDetalhes.respostas &&
                sessaoDetalhes.respostas.length > 0 && (
                  <div className="space-y-2">
                    <Rotulo>Respostas das Tarefas</Rotulo>
                    <ul className="space-y-2">
                      {sessaoDetalhes.respostas.map((resposta: any) => (
                        <li key={resposta.id} className="rounded-2xl bg-surface-muted p-4">
                          <div className="flex items-start gap-3">
                            <span className="tabular grid size-7 shrink-0 place-items-center rounded-full bg-surface text-xs font-semibold text-ink-2">
                              {resposta.tarefa.ordem}
                            </span>
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <p className="text-sm font-medium text-ink">{resposta.tarefa.pergunta}</p>
                              <StatusPill
                                tom={
                                  resposta.pontuacao === null
                                    ? "neutral"
                                    : resposta.pontuacao === -1
                                      ? "warning"
                                      : "info"
                                }
                              >
                                {resposta.pontuacao === -1
                                  ? "N/A"
                                  : resposta.pontuacao !== null
                                    ? `${resposta.pontuacao}%`
                                    : "Não respondida"}
                              </StatusPill>
                              {resposta.observacao && (
                                <p className="text-xs text-ink-3">Obs: {resposta.observacao}</p>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Instruções da sessão — plano terapêutico */}
              {sessaoDetalhes.tipo === "CURRICULUM" &&
                sessaoDetalhes.instrucoesSelecionadas &&
                sessaoDetalhes.instrucoesSelecionadas.length > 0 && (
                  <div className="space-y-2">
                    <Rotulo>Instruções da Sessão</Rotulo>
                    <div className="space-y-3">
                      {sessaoDetalhes.atividadesClone?.map((clone) => {
                        const instrucaoIdsDessaAtv = new Set(
                          (sessaoDetalhes.instrucoesSelecionadas || [])
                            .filter((s) => s.atividadeCloneId === clone.id)
                            .map((s) => s.instrucaoId)
                        );
                        const instrucoes = clone.instrucoes.filter((i) => instrucaoIdsDessaAtv.has(i.id));
                        if (instrucoes.length === 0) return null;
                        const FASE_ORDER = ["LINHA_BASE", "INTERVENCAO", "MANUTENCAO", "GENERALIZACAO"];
                        return (
                          <div key={clone.id} className="overflow-hidden rounded-2xl bg-surface-muted">
                            <p className="px-4 py-2.5 text-sm font-semibold text-ink">{clone.nome}</p>
                            <ul className="divide-y divide-hairline border-t border-hairline bg-surface/70">
                              {instrucoes.map((instrucao) => {
                                const hist = sessaoDetalhes.historicoFasesSessao?.find(
                                  (h) => h.instrucaoId === instrucao.id
                                );
                                const avsInstrucao = ((sessaoDetalhes.avaliacoes || []) as AvaliacaoCurriculum[])
                                  .filter((av) => av.instrucaoId === instrucao.id)
                                  .sort((a, b) => a.tentativa - b.tentativa);
                                const ponts = (instrucao.pontuacoes || [])
                                  .filter((p) => p.fase === instrucao.faseAtual)
                                  .sort((a, b) => a.ordem - b.ordem);
                                const corretas = avsInstrucao.filter((av) => isTentativaCorreta(av.nota, ponts)).length;
                                const percentInstrucao =
                                  avsInstrucao.length > 0 ? Math.round((corretas / avsInstrucao.length) * 100) : null;
                                const avancou =
                                  hist && FASE_ORDER.indexOf(hist.faseNova) > FASE_ORDER.indexOf(hist.faseAnterior);
                                const regrediu =
                                  hist && FASE_ORDER.indexOf(hist.faseNova) < FASE_ORDER.indexOf(hist.faseAnterior);
                                const obs = avsInstrucao.find((av) => av.observacao)?.observacao;
                                return (
                                  <li key={instrucao.id} className="space-y-2 px-4 py-3">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                      <p className="flex-1 text-sm font-medium text-ink">{instrucao.texto}</p>
                                      <div className="flex shrink-0 flex-wrap items-center gap-1">
                                        {hist ? (
                                          <>
                                            <FasePill fase={hist.faseAnterior} />
                                            <span className="text-xs text-ink-3">→</span>
                                            <FasePill fase={hist.faseNova} />
                                            {avancou && (
                                              <span className="text-xs font-bold text-success-ink" aria-label="avançou">↑</span>
                                            )}
                                            {regrediu && (
                                              <span className="text-xs font-bold text-danger-ink" aria-label="regrediu">↓</span>
                                            )}
                                          </>
                                        ) : (
                                          <FasePill fase={instrucao.faseAtual} />
                                        )}
                                      </div>
                                    </div>
                                    {avsInstrucao.length > 0 && (
                                      <div className="flex flex-wrap items-center gap-1">
                                        <span className="mr-1 text-xs text-ink-3">Tentativas:</span>
                                        {avsInstrucao.map((av) => {
                                          const sigla = ponts[av.nota]?.sigla ?? String(av.nota);
                                          const isCorreto = isTentativaCorreta(av.nota, ponts);
                                          return (
                                            <span
                                              key={av.id}
                                              className={
                                                isCorreto
                                                  ? "inline-grid min-w-7 place-items-center rounded-full bg-success px-2 py-0.5 text-xs font-bold text-white"
                                                  : "inline-grid min-w-7 place-items-center rounded-full border border-hairline bg-surface px-2 py-0.5 text-xs font-bold text-ink-2"
                                              }
                                            >
                                              {sigla}
                                            </span>
                                          );
                                        })}
                                        {percentInstrucao !== null && (
                                          <span className="ml-2 text-xs text-ink-3">{percentInstrucao}% acerto</span>
                                        )}
                                      </div>
                                    )}
                                    {obs && <p className="text-xs text-ink-3">Obs: {obs}</p>}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Observações gerais */}
              {sessaoDetalhes.observacoes_gerais && (
                <div className="space-y-2">
                  <Rotulo>Observações Gerais</Rotulo>
                  <p className="rounded-2xl bg-surface-muted p-4 text-sm whitespace-pre-wrap text-ink-2">
                    {sessaoDetalhes.observacoes_gerais}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

export default function HistoricoSessoesPage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: 'sessoes', action: 'VIEW' }}>
      <HistoricoSessoesPageContent />
    </ProtectedRoute>
  )
}
