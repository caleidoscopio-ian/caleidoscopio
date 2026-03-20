/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
  DialogTrigger,
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
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scrollarea";
import ProtectedRoute from "@/components/ProtectedRoute";

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

// ============ Constantes de fase ============
const FASE_CONFIG: Record<string, { label: string; color: string }> = {
  LINHA_BASE:    { label: "Linha de Base", color: "bg-gray-500" },
  INTERVENCAO:   { label: "Intervenção",   color: "bg-blue-500" },
  MANUTENCAO:    { label: "Manutenção",    color: "bg-green-500" },
  GENERALIZACAO: { label: "Generalização", color: "bg-amber-500" },
};

function FaseBadge({ fase, size = "sm" }: { fase: string; size?: "sm" | "xs" }) {
  const cfg = FASE_CONFIG[fase] || { label: fase, color: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-white font-medium ${cfg.color} ${size === "xs" ? "text-[10px]" : "text-xs"}`}>
      {cfg.label}
    </span>
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
      if (ponts.length > 0 && av.nota === ponts.length - 1) tentativasCorretas++;
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

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Histórico de Sessões
          </h1>
          <p className="text-muted-foreground">
            Visualize e acompanhe todas as sessões realizadas
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por paciente, plano terapêutico/avaliação ou terapeuta..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Select value={pacienteFiltro} onValueChange={setPacienteFiltro}>
            <SelectTrigger className="w-[200px]">
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
            <SelectTrigger className="w-[180px]">
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

        {/* Estatísticas Gerais */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Sessões
              </CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : sessoes.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Finalizadas</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {loading
                  ? "..."
                  : sessoes.filter((s) => s.status === "FINALIZADA").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Em Andamento
              </CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {loading
                  ? "..."
                  : sessoes.filter((s) => s.status === "EM_ANDAMENTO").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pacientes Atendidos
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {loading
                  ? "..."
                  : new Set(sessoes.map((s) => s.paciente.id)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Sessões */}
        <Card>
          <CardHeader>
            <CardTitle>
              Sessões Registradas
              {!loading && (
                <Badge variant="secondary" className="ml-2">
                  {filteredSessoes.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Lista completa de sessões realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <div className="text-red-600 mb-4">{error}</div>
                <Button onClick={fetchSessoes} variant="outline">
                  Tentar Novamente
                </Button>
              </div>
            )}

            {loading && !error && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Carregando sessões...</p>
              </div>
            )}

            {!loading && !error && filteredSessoes.length === 0 && (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhuma sessão encontrada
                </h3>
                <p className="text-muted-foreground mb-4">
                  {sessoes.length === 0
                    ? "Ainda não há sessões registradas."
                    : "Nenhuma sessão corresponde aos filtros selecionados."}
                </p>
                {sessoes.length === 0 && (
                  <Button onClick={() => router.push("/iniciar-sessao")}>
                    Iniciar Nova Sessão
                  </Button>
                )}
              </div>
            )}

            {!loading && !error && filteredSessoes.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Curriculum/Avaliação</TableHead>
                    <TableHead>Terapeuta</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessoes.map((sessao) => {
                    const status = traduzirStatus(sessao.status);
                    const tipoSessao = getTipoSessaoLabel(sessao);
                    return (
                      <TableRow key={sessao.id}>
                        <TableCell className="font-medium">
                          {sessao.paciente.nome}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              sessao.tipo === "AVALIACAO" ? "default" : "secondary"
                            }
                            className="text-xs"
                          >
                            {tipoSessao}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {sessao.tipo === "CURRICULUM"
                              ? sessao.curriculum?.nome
                              : (sessao.avaliacao?.nome || sessao.atividade?.nome)}
                          </div>
                        </TableCell>
                        <TableCell>{sessao.profissional.nome}</TableCell>
                        <TableCell className="text-sm">
                          {formatDateTime(sessao.iniciada_em)}
                        </TableCell>
                        <TableCell>
                          {calcularDuracao(
                            sessao.iniciada_em,
                            sessao.finalizada_em
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant as any}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {sessao.status === "EM_ANDAMENTO" && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  if (sessao.tipo === "CURRICULUM") {
                                    router.push(`/aplicar-curriculum/${sessao.id}`);
                                  } else if (sessao.tipo === "AVALIACAO") {
                                    router.push(`/aplicar-avaliacao/${sessao.id}`);
                                  }
                                }}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Continuar
                              </Button>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => fetchSessaoDetalhes(sessao.id, sessao.tipo)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl max-h-[90vh]">
                                <DialogHeader>
                                  <DialogTitle>Detalhes da Sessão</DialogTitle>
                                  <DialogDescription>
                                    Informações completas e avaliações
                                  </DialogDescription>
                                </DialogHeader>
                                {sessaoDetalhes &&
                                  sessaoDetalhes.id === sessao.id && (
                                    <ScrollArea className="max-h-[calc(90vh-150px)] pr-4">
                                      <div className="space-y-4">
                                        {/* Informações da Sessão */}
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <label className="text-sm font-medium text-muted-foreground">
                                              Paciente
                                            </label>
                                            <p className="font-medium">
                                              {sessaoDetalhes.paciente.nome}
                                            </p>
                                          </div>
                                          <div>
                                            <label className="text-sm font-medium text-muted-foreground">
                                              Terapeuta
                                            </label>
                                            <p className="font-medium">
                                              {sessaoDetalhes.profissional.nome}
                                            </p>
                                          </div>
                                          <div>
                                            <label className="text-sm font-medium text-muted-foreground">
                                              {sessaoDetalhes.tipo === "CURRICULUM"
                                                ? "Plano Terapêutico"
                                                : "Avaliação"}
                                            </label>
                                            <p className="font-medium">
                                              {sessaoDetalhes.tipo === "CURRICULUM"
                                                ? sessaoDetalhes.curriculum?.nome
                                                : (sessaoDetalhes.avaliacao?.nome || sessaoDetalhes.atividade?.nome)}
                                            </p>
                                          </div>
                                          <div>
                                            <label className="text-sm font-medium text-muted-foreground">
                                              Tipo
                                            </label>
                                            <div className="mt-1">
                                              <Badge
                                                variant={
                                                  sessaoDetalhes.tipo === "CURRICULUM"
                                                    ? "default"
                                                    : "secondary"
                                                }
                                              >
                                                {getTipoSessaoLabel(sessaoDetalhes)}
                                              </Badge>
                                            </div>
                                          </div>
                                          <div className="col-span-2">
                                            <label className="text-sm font-medium text-muted-foreground">
                                              Status
                                            </label>
                                            <div className="mt-1">
                                              <Badge
                                                variant={
                                                  traduzirStatus(
                                                    sessaoDetalhes.status
                                                  ).variant as any
                                                }
                                              >
                                                {
                                                  traduzirStatus(
                                                    sessaoDetalhes.status
                                                  ).label
                                                }
                                              </Badge>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Resumo do Desempenho - CURRICULUM */}
                                        {sessaoDetalhes.tipo === "CURRICULUM" && (
                                          <div className="space-y-3">
                                            <label className="text-sm font-medium text-muted-foreground">
                                              Resumo do Desempenho
                                            </label>
                                            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                                              <div className="grid grid-cols-4 gap-4 text-center">
                                                <div>
                                                  <p className="text-3xl font-bold text-blue-600">
                                                    {calcularEstatisticasCurriculum(sessaoDetalhes).totalInstrucoes}
                                                  </p>
                                                  <p className="text-xs text-muted-foreground mt-1">Instruções</p>
                                                  <p className="text-xs text-muted-foreground">na sessão</p>
                                                </div>
                                                <div>
                                                  <p className="text-3xl font-bold text-green-600">
                                                    {calcularEstatisticasCurriculum(sessaoDetalhes).avancaram}
                                                  </p>
                                                  <p className="text-xs text-muted-foreground mt-1">Avançaram</p>
                                                  <p className="text-xs text-muted-foreground">de fase</p>
                                                </div>
                                                <div>
                                                  <p className="text-3xl font-bold text-red-500">
                                                    {calcularEstatisticasCurriculum(sessaoDetalhes).regrediram}
                                                  </p>
                                                  <p className="text-xs text-muted-foreground mt-1">Regrediram</p>
                                                  <p className="text-xs text-muted-foreground">de fase</p>
                                                </div>
                                                <div>
                                                  <p className="text-3xl font-bold text-purple-600">
                                                    {calcularEstatisticasCurriculum(sessaoDetalhes).percentAcerto}%
                                                  </p>
                                                  <p className="text-xs text-muted-foreground mt-1">Acerto</p>
                                                  <p className="text-xs text-muted-foreground">
                                                    ({calcularEstatisticasCurriculum(sessaoDetalhes).tentativasCorretas}/
                                                    {calcularEstatisticasCurriculum(sessaoDetalhes).totalTentativas})
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Estatísticas - AVALIAÇÕES */}
                                        {sessaoDetalhes.tipo === "AVALIACAO" &&
                                          sessaoDetalhes.respostas &&
                                          sessaoDetalhes.respostas.length > 0 && (
                                            <div className="space-y-3">
                                              <label className="text-sm font-medium text-muted-foreground">
                                                Resumo do Desempenho
                                              </label>
                                              <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border">
                                                <div className="grid grid-cols-4 gap-4 text-center">
                                                  <div>
                                                    <p className="text-3xl font-bold text-blue-600">
                                                      {
                                                        calcularEstatisticasAvaliacao(
                                                          sessaoDetalhes
                                                        ).media
                                                      }%
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                      Média Geral
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                      (pontuação)
                                                    </p>
                                                  </div>
                                                  <div>
                                                    <p className="text-3xl font-bold text-green-600">
                                                      {
                                                        calcularEstatisticasAvaliacao(
                                                          sessaoDetalhes
                                                        ).respondidas
                                                      }
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                      Respondidas
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                      (de{" "}
                                                      {
                                                        calcularEstatisticasAvaliacao(
                                                          sessaoDetalhes
                                                        ).total
                                                      })
                                                    </p>
                                                  </div>
                                                  <div>
                                                    <p className="text-3xl font-bold text-orange-600">
                                                      {
                                                        calcularEstatisticasAvaliacao(
                                                          sessaoDetalhes
                                                        ).naoAplicavel
                                                      }
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                      N/A
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                      (não aplicável)
                                                    </p>
                                                  </div>
                                                  <div>
                                                    <p className="text-3xl font-bold text-purple-600">
                                                      {
                                                        calcularEstatisticasAvaliacao(
                                                          sessaoDetalhes
                                                        ).total
                                                      }
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                      Total
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                      tarefas
                                                    </p>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Distribuição de Pontuações */}
                                              <div className="p-4 bg-muted/30 rounded-lg">
                                                <p className="text-sm font-medium mb-3">
                                                  Distribuição de Pontuações
                                                </p>
                                                <div className="space-y-2">
                                                  {[100, 75, 50, 25, 0, -1].map(
                                                    (pontuacao) => {
                                                      const count =
                                                        sessaoDetalhes.respostas!.filter(
                                                          (r: any) => r.pontuacao === pontuacao
                                                        ).length;
                                                      const percentage =
                                                        (count /
                                                          sessaoDetalhes
                                                            .respostas!
                                                            .length) *
                                                        100;
                                                      return (
                                                        <div
                                                          key={pontuacao}
                                                          className="flex items-center gap-3"
                                                        >
                                                          <span className="text-xs font-medium w-16">
                                                            {pontuacao === -1 ? "N/A" : `${pontuacao}%`}:
                                                          </span>
                                                          <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                              className={`h-full ${
                                                                pontuacao === 100
                                                                  ? "bg-green-500"
                                                                  : pontuacao === 75
                                                                    ? "bg-blue-500"
                                                                    : pontuacao === 50
                                                                      ? "bg-yellow-500"
                                                                      : pontuacao ===
                                                                          25
                                                                        ? "bg-orange-500"
                                                                        : pontuacao === 0
                                                                          ? "bg-red-500"
                                                                          : "bg-gray-400"
                                                              }`}
                                                              style={{
                                                                width: `${percentage}%`,
                                                              }}
                                                            />
                                                          </div>
                                                          <span className="text-xs font-medium w-16 text-right">
                                                            {count} (
                                                            {percentage.toFixed(
                                                              0
                                                            )}
                                                            %)
                                                          </span>
                                                        </div>
                                                      );
                                                    }
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                        {/* Respostas de Avaliações (para sessões tipo AVALIACAO) */}
                                        {sessaoDetalhes.tipo === "AVALIACAO" &&
                                          sessaoDetalhes.respostas &&
                                          sessaoDetalhes.respostas.length > 0 && (
                                            <div>
                                              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                                Respostas das Tarefas
                                              </label>
                                              <div className="space-y-2">
                                                {sessaoDetalhes.respostas.map(
                                                  (resposta: any) => (
                                                    <div
                                                      key={resposta.id}
                                                      className="p-3 border rounded-lg"
                                                    >
                                                      <div className="flex items-start gap-3">
                                                        <Badge variant="secondary">
                                                          {resposta.tarefa.ordem}
                                                        </Badge>
                                                        <div className="flex-1">
                                                          <p className="text-sm font-medium mb-1">
                                                            {resposta.tarefa.pergunta}
                                                          </p>
                                                          <div className="flex items-center gap-2 text-xs flex-wrap">
                                                            <Badge
                                                              variant={
                                                                resposta.pontuacao !== null &&
                                                                resposta.pontuacao !== -1
                                                                  ? "default"
                                                                  : "outline"
                                                              }
                                                            >
                                                              {resposta.pontuacao === -1
                                                                ? "N/A"
                                                                : resposta.pontuacao !== null
                                                                  ? `${resposta.pontuacao}%`
                                                                  : "Não respondida"}
                                                            </Badge>
                                                          </div>
                                                          {resposta.observacao && (
                                                            <p className="text-xs text-muted-foreground mt-2">
                                                              Obs: {resposta.observacao}
                                                            </p>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  )
                                                )}
                                              </div>
                                            </div>
                                          )}

                                        {/* Instruções da Sessão (para sessões tipo CURRICULUM) */}
                                        {sessaoDetalhes.tipo === "CURRICULUM" &&
                                          sessaoDetalhes.instrucoesSelecionadas &&
                                          sessaoDetalhes.instrucoesSelecionadas.length > 0 && (
                                            <div className="space-y-3">
                                              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                                Instruções da Sessão
                                              </label>
                                              {sessaoDetalhes.atividadesClone?.map((clone) => {
                                                const instrucaoIdsDessaAtv = new Set(
                                                  (sessaoDetalhes.instrucoesSelecionadas || [])
                                                    .filter((s) => s.atividadeCloneId === clone.id)
                                                    .map((s) => s.instrucaoId)
                                                );
                                                const instrucoes = clone.instrucoes.filter((i) =>
                                                  instrucaoIdsDessaAtv.has(i.id)
                                                );
                                                if (instrucoes.length === 0) return null;
                                                const FASE_ORDER = ["LINHA_BASE", "INTERVENCAO", "MANUTENCAO", "GENERALIZACAO"];
                                                return (
                                                  <div key={clone.id} className="border rounded-lg overflow-hidden">
                                                    <div className="px-4 py-2 bg-muted/50 font-medium text-sm">
                                                      {clone.nome}
                                                    </div>
                                                    <div className="divide-y">
                                                      {instrucoes.map((instrucao) => {
                                                        const hist = sessaoDetalhes.historicoFasesSessao?.find(
                                                          (h) => h.instrucaoId === instrucao.id
                                                        );
                                                        const avsInstrucao = (
                                                          (sessaoDetalhes.avaliacoes || []) as AvaliacaoCurriculum[]
                                                        )
                                                          .filter((av) => av.instrucaoId === instrucao.id)
                                                          .sort((a, b) => a.tentativa - b.tentativa);
                                                        const ponts = (instrucao.pontuacoes || [])
                                                          .filter((p) => p.fase === instrucao.faseAtual)
                                                          .sort((a, b) => a.ordem - b.ordem);
                                                        const corretas = avsInstrucao.filter(
                                                          (av) => ponts.length > 0 && av.nota === ponts.length - 1
                                                        ).length;
                                                        const percentInstrucao =
                                                          avsInstrucao.length > 0
                                                            ? Math.round((corretas / avsInstrucao.length) * 100)
                                                            : null;
                                                        const avancou =
                                                          hist &&
                                                          FASE_ORDER.indexOf(hist.faseNova) >
                                                            FASE_ORDER.indexOf(hist.faseAnterior);
                                                        const regrediu =
                                                          hist &&
                                                          FASE_ORDER.indexOf(hist.faseNova) <
                                                            FASE_ORDER.indexOf(hist.faseAnterior);
                                                        return (
                                                          <div key={instrucao.id} className="p-3 space-y-2">
                                                            <div className="flex items-start justify-between gap-2">
                                                              <p className="text-sm font-medium flex-1">
                                                                {instrucao.texto}
                                                              </p>
                                                              <div className="flex items-center gap-1 flex-shrink-0">
                                                                {hist ? (
                                                                  <>
                                                                    <FaseBadge fase={hist.faseAnterior} size="xs" />
                                                                    <span className="text-xs text-muted-foreground">→</span>
                                                                    <FaseBadge fase={hist.faseNova} size="xs" />
                                                                    {avancou && (
                                                                      <span className="text-green-600 text-xs font-bold">↑</span>
                                                                    )}
                                                                    {regrediu && (
                                                                      <span className="text-red-500 text-xs font-bold">↓</span>
                                                                    )}
                                                                  </>
                                                                ) : (
                                                                  <FaseBadge fase={instrucao.faseAtual} size="xs" />
                                                                )}
                                                              </div>
                                                            </div>
                                                            {avsInstrucao.length > 0 && (
                                                              <div className="flex items-center gap-1 flex-wrap">
                                                                <span className="text-xs text-muted-foreground mr-1">
                                                                  Tentativas:
                                                                </span>
                                                                {avsInstrucao.map((av) => {
                                                                  const sigla = ponts[av.nota]?.sigla ?? String(av.nota);
                                                                  const isCorreto =
                                                                    ponts.length > 0 && av.nota === ponts.length - 1;
                                                                  return (
                                                                    <Badge
                                                                      key={av.id}
                                                                      variant={isCorreto ? "default" : "outline"}
                                                                      className={`text-xs font-bold ${isCorreto ? "bg-green-600 hover:bg-green-700" : ""}`}
                                                                    >
                                                                      {sigla}
                                                                    </Badge>
                                                                  );
                                                                })}
                                                                {percentInstrucao !== null && (
                                                                  <span className="text-xs text-muted-foreground ml-2">
                                                                    {percentInstrucao}% acerto
                                                                  </span>
                                                                )}
                                                              </div>
                                                            )}
                                                            {avsInstrucao.some((av) => av.observacao) && (
                                                              <p className="text-xs text-muted-foreground">
                                                                Obs:{" "}
                                                                {avsInstrucao.find((av) => av.observacao)?.observacao}
                                                              </p>
                                                            )}
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}

                                        {/* Observações Gerais */}
                                        {sessaoDetalhes.observacoes_gerais && (
                                          <div>
                                            <label className="text-sm font-medium text-muted-foreground">
                                              Observações Gerais
                                            </label>
                                            <p className="text-sm mt-1 p-3 bg-muted/30 rounded">
                                              {
                                                sessaoDetalhes.observacoes_gerais
                                              }
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </ScrollArea>
                                  )}
                              </DialogContent>
                            </Dialog>
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
  );
}

export default function HistoricoSessoesPage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: 'sessoes', action: 'VIEW' }}>
      <HistoricoSessoesPageContent />
    </ProtectedRoute>
  )
}
