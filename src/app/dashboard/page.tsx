/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
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
import {
  Users,
  ClipboardList,
  Clock,
  CheckCircle,
  FileHeart,
  Play,
  TrendingUp,
  Loader2,
  AlertCircle,
  UserCheck,
  Calendar,
} from "lucide-react";

interface DashboardStats {
  totalPacientes: number;
  sessoesEmAndamento: number;
  sessoesRealizadasMes: number;
  anamnesesPendentes: number;
  atividadesCadastradas: number;
  sessõesHoje: number;
  totalTerapeutas?: number;
}

interface Sessao {
  id: string;
  iniciada_em: string;
  finalizada_em?: string;
  status: string;
  paciente: {
    id: string;
    nome: string;
  };
  atividade: {
    nome: string;
    tipo: string;
  };
  avaliacoes?: Array<{
    nota: number;
    tipos_ajuda: string[];
  }>;
}

interface Agendamento {
  id: string;
  data_hora: string;
  duracao_minutos: number;
  sala?: string;
  status: string;
  observacoes?: string;
  paciente: {
    id: string;
    nome: string;
  };
  profissional: {
    id: string;
    nome: string;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAdmin, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sessoesPendentes, setSessoesPendentes] = useState<Sessao[]>([]);
  const [sessoesRecentes, setSessoesRecentes] = useState<Sessao[]>([]);
  const [agendamentosHoje, setAgendamentosHoje] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const breadcrumbs = [{ label: "Dashboard" }];

  // Buscar estatísticas
  const fetchStats = async () => {
    try {
      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/dashboard/stats", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar estatísticas");
      }

      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error("❌ Erro ao buscar estatísticas:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao carregar estatísticas"
      );
    }
  };

  // Buscar sessões
  const fetchSessoes = async () => {
    try {
      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/dashboard/sessoes-recentes", {
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
        setSessoesPendentes(result.data.pendentes);
        setSessoesRecentes(result.data.recentes);
      }
    } catch (err) {
      console.error("❌ Erro ao buscar sessões:", err);
    }
  };

  // Buscar agendamentos do dia
  const fetchAgendamentosHoje = async () => {
    try {
      if (!isAuthenticated || !user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/dashboard/agenda-hoje", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao buscar agendamentos");
      }

      if (result.success) {
        setAgendamentosHoje(result.data);
      }
    } catch (err) {
      console.error("❌ Erro ao buscar agendamentos:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchSessoes(),
        fetchAgendamentosHoje(),
      ]);
      setLoading(false);
    };

    if (isAuthenticated && user) {
      loadData();
    }
  }, [isAuthenticated, user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatHorario = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      AGENDADO: { label: "Agendado", variant: "secondary" as const },
      CONFIRMADO: { label: "Confirmado", variant: "default" as const },
      CANCELADO: { label: "Cancelado", variant: "destructive" as const },
      ATENDIDO: { label: "Atendido", variant: "outline" as const },
      FALTOU: { label: "Faltou", variant: "destructive" as const },
    };
    return (
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig["AGENDADO"]
    );
  };

  const calcularMediaNotas = (sessao: Sessao) => {
    if (!sessao.avaliacoes || sessao.avaliacoes.length === 0) return 0;
    const soma = sessao.avaliacoes.reduce((acc, av) => acc + av.nota, 0);
    return (soma / sessao.avaliacoes.length).toFixed(1);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout breadcrumbs={breadcrumbs}>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Carregando dashboard...</p>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Bem-vindo, {user?.name}!</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          {/* Cards de Estatísticas */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Pacientes
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.totalPacientes || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? "Na clínica" : "Sob seus cuidados"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Sessões em Andamento
                </CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.sessoesEmAndamento || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pendentes de finalização
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Sessões este Mês
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats?.sessoesRealizadasMes || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Sessões finalizadas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Anamneses Pendentes
                </CardTitle>
                <FileHeart className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {stats?.anamnesesPendentes || 0}
                </div>
                <p className="text-xs text-muted-foreground">Em rascunho</p>
              </CardContent>
            </Card>
          </div>

          {/* Estatísticas Admin */}
          {isAdmin && stats && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total de Terapeutas
                  </CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.totalTerapeutas || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Profissionais cadastrados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Atividades Cadastradas
                  </CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.atividadesCadastradas || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Protocolos disponíveis
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Agenda do Dia */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Agenda de Hoje
                </CardTitle>
                <CardDescription>Seus agendamentos para hoje</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {agendamentosHoje.length > 0 ? (
                  <>
                    {agendamentosHoje.map((agendamento) => {
                      const statusBadge = getStatusBadge(agendamento.status);
                      return (
                        <div
                          key={agendamento.id}
                          className="p-3 border rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-medium">
                                {agendamento.paciente.nome}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {formatHorario(agendamento.data_hora)} (
                                  {agendamento.duracao_minutos} min)
                                </span>
                              </div>
                              {agendamento.sala && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Sala: {agendamento.sala}
                                </p>
                              )}
                              {isAdmin && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Terapeuta: {agendamento.profissional.nome}
                                </p>
                              )}
                            </div>
                            <Badge variant={statusBadge.variant}>
                              {statusBadge.label}
                            </Badge>
                          </div>
                          {agendamento.observacoes && (
                            <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                              {agendamento.observacoes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push("/agenda")}
                    >
                      Ver Agenda Completa
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      Sem agendamentos para hoje
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => router.push("/agenda")}
                    >
                      Ver Agenda Completa
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sessões Pendentes */}
            {sessoesPendentes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    Sessões Pendentes
                  </CardTitle>
                  <CardDescription>
                    Sessões em andamento que precisam ser finalizadas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sessoesPendentes.map((sessao) => (
                    <div
                      key={sessao.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{sessao.paciente.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {sessao.atividade.nome}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Iniciada em: {formatDate(sessao.iniciada_em)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          router.push(`/aplicar-atividade/${sessao.id}`)
                        }
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Continuar
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Atividades Recentes */}
            {sessoesRecentes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Atividades Recentes
                  </CardTitle>
                  <CardDescription>Últimas sessões realizadas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sessoesRecentes.map((sessao) => (
                    <div key={sessao.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium">{sessao.paciente.nome}</p>
                          <p className="text-sm text-muted-foreground">
                            {sessao.atividade.nome}
                          </p>
                        </div>
                        <Badge variant="default" className="bg-green-600">
                          Média: {calcularMediaNotas(sessao)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Finalizada em:{" "}
                        {sessao.finalizada_em &&
                          formatDate(sessao.finalizada_em)}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Empty State se não houver sessões */}
          {sessoesPendentes.length === 0 && sessoesRecentes.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhuma sessão encontrada
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Comece iniciando uma nova sessão com um paciente
                </p>
                <Button onClick={() => router.push("/iniciar-sessao")}>
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Sessão
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
