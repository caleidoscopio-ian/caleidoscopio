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

interface Paciente {
  id: string;
  name: string;
}

interface Avaliacao {
  id: string;
  nota: number;
  tipos_ajuda: string[];
  observacao?: string;
  instrucao: {
    ordem: number;
    texto: string;
  };
}

interface Sessao {
  id: string;
  iniciada_em: string;
  finalizada_em?: string;
  status: string;
  observacoes_gerais?: string;
  tipo?: "ATIVIDADE" | "AVALIACAO"; // Novo campo para diferenciar
  paciente: {
    id: string;
    nome: string;
  };
  atividade: {
    id: string;
    nome: string;
    tipo: string;
    metodologia?: string;
  };
  profissional: {
    nome: string;
  };
  avaliacoes?: Avaliacao[];
  respostas?: any[]; // Para sessões de avaliação
  avaliacao?: any; // Para sessões de avaliação
}

export default function HistoricoSessoesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [pacienteFiltro, setPacienteFiltro] = useState<string>("all");
  const [statusFiltro, setStatusFiltro] = useState<string>("FINALIZADA");
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

  // Buscar sessões
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
      if (statusFiltro) {
        params.append("status", statusFiltro);
      }

      const response = await fetch(`/api/sessoes?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar sessões");
      }

      if (result.success) {
        setSessoes(result.data);
      }
    } catch (err) {
      console.error("❌ Erro ao buscar sessões:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar sessões");
    } finally {
      setLoading(false);
    }
  };

  // Buscar detalhes de uma sessão
  const fetchSessaoDetalhes = async (sessaoId: string) => {
    try {
      if (!user) return;

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(`/api/sessoes?id=${sessaoId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (result.success) {
        setSessaoDetalhes(result.data);
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
      const nomeItem = sessao.tipo === "AVALIACAO"
        ? (sessao.avaliacao?.nome || sessao.atividade?.nome || "")
        : (sessao.atividade?.nome || "");

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

  // Calcular estatísticas de uma sessão de ATIVIDADE
  const calcularEstatisticas = (sessao: Sessao) => {
    if (!sessao.avaliacoes || sessao.avaliacoes.length === 0) {
      return { media: 0, comAjuda: 0, total: 0 };
    }

    const total = sessao.avaliacoes.length;
    const somaNotas = sessao.avaliacoes.reduce((acc, av) => acc + av.nota, 0);
    const media = somaNotas / total;
    const comAjuda = sessao.avaliacoes.filter(
      (av) => av.tipos_ajuda && av.tipos_ajuda.length > 0
    ).length;

    return { media: media.toFixed(1), comAjuda, total };
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
    return "Atividade";
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
                placeholder="Buscar por paciente, atividade ou terapeuta..."
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
                    <TableHead>Atividade/Avaliação</TableHead>
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
                          <div>
                            <div className="font-medium">
                              {sessao.tipo === "AVALIACAO"
                                ? (sessao.avaliacao?.nome || sessao.atividade?.nome)
                                : sessao.atividade?.nome}
                            </div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {traduzirTipo(sessao.atividade?.tipo || "")}
                            </Badge>
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
                                  if (sessao.tipo === "AVALIACAO") {
                                    router.push(`/aplicar-avaliacao/${sessao.id}`);
                                  } else {
                                    router.push(`/aplicar-atividade/${sessao.id}`);
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
                                  onClick={() => fetchSessaoDetalhes(sessao.id)}
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
                                              {sessaoDetalhes.tipo === "AVALIACAO"
                                                ? "Avaliação"
                                                : "Atividade"}
                                            </label>
                                            <p className="font-medium">
                                              {sessaoDetalhes.tipo === "AVALIACAO"
                                                ? sessaoDetalhes.avaliacao?.nome || sessaoDetalhes.atividade?.nome
                                                : sessaoDetalhes.atividade?.nome}
                                            </p>
                                          </div>
                                          <div>
                                            <label className="text-sm font-medium text-muted-foreground">
                                              Tipo
                                            </label>
                                            <div className="mt-1">
                                              <Badge
                                                variant={
                                                  sessaoDetalhes.tipo === "AVALIACAO"
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

                                        {/* Estatísticas - ATIVIDADES */}
                                        {sessaoDetalhes.tipo !== "AVALIACAO" &&
                                          sessaoDetalhes.avaliacoes &&
                                          sessaoDetalhes.avaliacoes.length >
                                            0 && (
                                            <div className="space-y-3">
                                              <label className="text-sm font-medium text-muted-foreground">
                                                Resumo do Desempenho
                                              </label>
                                              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                                                <div className="grid grid-cols-4 gap-4 text-center">
                                                  <div>
                                                    <p className="text-3xl font-bold text-blue-600">
                                                      {
                                                        calcularEstatisticas(
                                                          sessaoDetalhes
                                                        ).media
                                                      }
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                      Média Geral
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                      (de 4.0)
                                                    </p>
                                                  </div>
                                                  <div>
                                                    <p className="text-3xl font-bold text-green-600">
                                                      {
                                                        sessaoDetalhes.avaliacoes.filter(
                                                          (a) => a.nota >= 3
                                                        ).length
                                                      }
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                      Acertos
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                      (nota ≥ 3)
                                                    </p>
                                                  </div>
                                                  <div>
                                                    <p className="text-3xl font-bold text-orange-600">
                                                      {
                                                        calcularEstatisticas(
                                                          sessaoDetalhes
                                                        ).comAjuda
                                                      }
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                      Com Ajuda
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                      (
                                                      {(
                                                        (calcularEstatisticas(
                                                          sessaoDetalhes
                                                        ).comAjuda /
                                                          calcularEstatisticas(
                                                            sessaoDetalhes
                                                          ).total) *
                                                        100
                                                      ).toFixed(0)}
                                                      %)
                                                    </p>
                                                  </div>
                                                  <div>
                                                    <p className="text-3xl font-bold text-purple-600">
                                                      {
                                                        calcularEstatisticas(
                                                          sessaoDetalhes
                                                        ).total
                                                      }
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                      Total
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                      instruções
                                                    </p>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Distribuição de Notas */}
                                              <div className="p-4 bg-muted/30 rounded-lg">
                                                <p className="text-sm font-medium mb-3">
                                                  Distribuição de Notas
                                                </p>
                                                <div className="space-y-2">
                                                  {[4, 3, 2, 1, 0].map(
                                                    (nota) => {
                                                      const count =
                                                        sessaoDetalhes.avaliacoes!.filter(
                                                          (a) => a.nota === nota
                                                        ).length;
                                                      const percentage =
                                                        (count /
                                                          sessaoDetalhes
                                                            .avaliacoes!
                                                            .length) *
                                                        100;
                                                      return (
                                                        <div
                                                          key={nota}
                                                          className="flex items-center gap-3"
                                                        >
                                                          <span className="text-xs font-medium w-12">
                                                            Nota {nota}:
                                                          </span>
                                                          <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                              className={`h-full ${
                                                                nota === 4
                                                                  ? "bg-green-500"
                                                                  : nota === 3
                                                                    ? "bg-blue-500"
                                                                    : nota === 2
                                                                      ? "bg-yellow-500"
                                                                      : nota ===
                                                                          1
                                                                        ? "bg-orange-500"
                                                                        : "bg-red-500"
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

                                        {/* Avaliações das Instruções (para sessões tipo ATIVIDADE) */}
                                        {sessaoDetalhes.tipo !== "AVALIACAO" &&
                                          sessaoDetalhes.avaliacoes &&
                                          sessaoDetalhes.avaliacoes.length >
                                            0 && (
                                            <div>
                                              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                                Avaliações das Instruções
                                              </label>
                                              <div className="space-y-2">
                                                {sessaoDetalhes.avaliacoes.map(
                                                  (avaliacao) => (
                                                    <div
                                                      key={avaliacao.id}
                                                      className="p-3 border rounded-lg"
                                                    >
                                                      <div className="flex items-start gap-3">
                                                        <Badge variant="secondary">
                                                          {
                                                            avaliacao.instrucao
                                                              .ordem
                                                          }
                                                        </Badge>
                                                        <div className="flex-1">
                                                          <p className="text-sm font-medium mb-1">
                                                            {
                                                              avaliacao
                                                                .instrucao.texto
                                                            }
                                                          </p>
                                                          <div className="flex items-center gap-2 text-xs flex-wrap">
                                                            <Badge
                                                              variant={
                                                                avaliacao.nota >=
                                                                3
                                                                  ? "default"
                                                                  : "outline"
                                                              }
                                                            >
                                                              Nota:{" "}
                                                              {avaliacao.nota}/4
                                                            </Badge>
                                                            {avaliacao.tipos_ajuda &&
                                                              avaliacao
                                                                .tipos_ajuda
                                                                .length > 0 && (
                                                                <>
                                                                  {avaliacao.tipos_ajuda.map(
                                                                    (
                                                                      tipo,
                                                                      idx
                                                                    ) => (
                                                                      <Badge
                                                                        key={
                                                                          idx
                                                                        }
                                                                        variant="secondary"
                                                                      >
                                                                        {tipo}
                                                                      </Badge>
                                                                    )
                                                                  )}
                                                                </>
                                                              )}
                                                          </div>
                                                          {avaliacao.observacao && (
                                                            <p className="text-xs text-muted-foreground mt-2">
                                                              Obs:{" "}
                                                              {
                                                                avaliacao.observacao
                                                              }
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
