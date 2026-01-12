/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/main-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  User,
  Users,
} from "lucide-react";
import { AgendaDiaria } from "@/components/agenda/agenda-diaria";
import { AgendaSemanal } from "@/components/agenda/agenda-semanal";
import { AgendamentoDetailsDialog } from "@/components/agenda/agendamento-details-dialog";
import { NovoAgendamentoForm } from "@/components/forms/novo-agendamento-form";
import { Agendamento, StatusAgendamento } from "@/types/agendamento";
import { useAuth } from "@/hooks/useAuth";
import {
  format,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

type ViewMode = "day" | "week";

export default function AgendaPage() {
  const { user, isAdmin, tenant } = useAuth();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [pacientes, setPacientes] = useState<
    Array<{ id: string; nome: string }>
  >([]);
  const [profissionais, setProfissionais] = useState<
    Array<{ id: string; nome: string; especialidade: string }>
  >([]);
  const [salas, setSalas] = useState<
    Array<{ id: string; nome: string; cor?: string }>
  >([]);
  const [selectedProfissional, setSelectedProfissional] =
    useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [showNovoAgendamento, setShowNovoAgendamento] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] =
    useState<Agendamento | null>(null);
  const [showDetalhes, setShowDetalhes] = useState(false);

  // Form defaults para novo agendamento
  const [novoAgendamentoDefaults, setNovoAgendamentoDefaults] = useState<any>(
    {}
  );

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Agenda" },
  ];

  // Carregar dados iniciais (só quando usuário estiver autenticado)
  useEffect(() => {
    if (user && isAdmin !== undefined) {
      loadData();
    }
  }, [user, isAdmin, selectedDate, viewMode, selectedProfissional]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadAgendamentos(),
        loadPacientes(),
        loadProfissionais(),
        loadSalas(),
      ]);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da agenda",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAgendamentos = async () => {
    try {
      // Verificar autenticação
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Definir range de datas baseado no modo de visualização
      let data_inicio: Date;
      let data_fim: Date;

      if (viewMode === "day") {
        data_inicio = startOfDay(selectedDate);
        data_fim = endOfDay(selectedDate);
      } else {
        data_inicio = startOfWeek(selectedDate, { locale: ptBR });
        data_fim = endOfWeek(selectedDate, { locale: ptBR });
      }

      const params = new URLSearchParams({
        data_inicio: data_inicio.toISOString(),
        data_fim: data_fim.toISOString(),
      });

      if (selectedProfissional !== "all") {
        params.append("profissionalId", selectedProfissional);
      }

      // Preparar headers com dados do usuário (mesmo padrão da página de pacientes)
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(`/api/agendamentos?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      if (!response.ok) throw new Error("Erro ao buscar agendamentos");

      const data = await response.json();
      setAgendamentos(data);
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error);
      throw error;
    }
  };

  const loadPacientes = async () => {
    try {
      // Verificar autenticação
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Preparar headers com dados do usuário
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/pacientes", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      if (!response.ok) throw new Error("Erro ao buscar pacientes");

      const result = await response.json();
      const data = result.success ? result.data : result;

      setPacientes(
        data.map((p: any) => ({ id: p.id, nome: p.name || p.nome }))
      );
    } catch (error) {
      console.error("Erro ao carregar pacientes:", error);
      throw error;
    }
  };

  const loadProfissionais = async () => {
    try {
      // Verificar autenticação
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Preparar headers com dados do usuário
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/terapeutas", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      if (!response.ok) throw new Error("Erro ao buscar profissionais");

      const result = await response.json();
      const data = result.success ? result.data : result;

      setProfissionais(
        data.map((p: any) => ({
          id: p.id,
          nome: p.name || p.nome,
          especialidade: p.specialty || p.especialidade,
        }))
      );
    } catch (error) {
      console.error("Erro ao carregar profissionais:", error);
      throw error;
    }
  };

  const loadSalas = async () => {
    try {
      // Verificar autenticação
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Preparar headers com dados do usuário
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch("/api/salas", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      if (!response.ok) throw new Error("Erro ao buscar salas");

      const result = await response.json();
      const data = result.success ? result.data : result;

      // Filtrar apenas salas ativas
      const salasAtivas = data.filter((s: any) => s.ativo !== false);

      setSalas(
        salasAtivas.map((s: any) => ({
          id: s.id,
          nome: s.nome,
          cor: s.cor,
        }))
      );
    } catch (error) {
      console.error("Erro ao carregar salas:", error);
      // Não propagar erro para não bloquear o carregamento da agenda
      setSalas([]);
    }
  };

  const handleNovoAgendamento = async (data: any) => {
    try {
      // Verificar autenticação
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const userDataEncoded = btoa(JSON.stringify(user));

      // Verificar se é agendamento em massa (múltiplas datas)
      const temDatasAdicionais = data.datasAdicionais && data.datasAdicionais.length > 0;

      if (temDatasAdicionais) {
        // Agendamento em massa
        const todasDatas = [data.data, ...data.datasAdicionais].map((d: Date) => d.toISOString());

        const response = await fetch("/api/agendamentos/batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
          body: JSON.stringify({
            pacienteId: data.pacienteId,
            profissionalId: data.profissionalId,
            datas: todasDatas,
            horario: data.horario,
            duracao_minutos: data.duracao_minutos,
            salaId: data.sala,
            status: data.status,
            observacoes: data.observacoes,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Erro ao criar agendamentos");
        }

        const result = await response.json();

        // Mostrar resumo
        toast({
          title: "Agendamento em Massa Concluído",
          description: `${result.resumo.sucessos} agendamento(s) criado(s), ${result.resumo.falhas} falha(s)`,
          variant: result.resumo.falhas > 0 ? "destructive" : "default",
        });

        // Mostrar detalhes das falhas
        if (result.resumo.falhas > 0) {
          const falhas = result.resultados.filter((r: any) => !r.success);
          console.warn("Falhas no agendamento em massa:", falhas);
        }
      } else {
        // Agendamento único (comportamento original)
        const [hour, minute] = data.horario.split(":").map(Number);
        const dataHora = new Date(data.data);
        dataHora.setHours(hour, minute, 0, 0);

        const response = await fetch("/api/agendamentos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Data": userDataEncoded,
            "X-Auth-Token": user.token,
          },
          body: JSON.stringify({
            pacienteId: data.pacienteId,
            profissionalId: data.profissionalId,
            data_hora: dataHora.toISOString(),
            duracao_minutos: data.duracao_minutos,
            sala: data.sala,
            status: data.status,
            observacoes: data.observacoes,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Erro ao criar agendamento");
        }

        toast({
          title: "Sucesso",
          description: "Agendamento criado com sucesso",
        });
      }

      setShowNovoAgendamento(false);
      loadAgendamentos();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleConfirmarAgendamento = async (id: string) => {
    try {
      // Verificar autenticação
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Preparar headers com dados do usuário
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(`/api/agendamentos/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({ status: StatusAgendamento.CONFIRMADO }),
      });

      if (!response.ok) throw new Error("Erro ao confirmar agendamento");

      toast({
        title: "Sucesso",
        description: "Agendamento confirmado",
      });

      loadAgendamentos();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao confirmar agendamento",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleCancelarAgendamento = async (id: string) => {
    try {
      // Verificar autenticação
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Preparar headers com dados do usuário
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(`/api/agendamentos/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({ status: StatusAgendamento.CANCELADO }),
      });

      if (!response.ok) throw new Error("Erro ao cancelar agendamento");

      toast({
        title: "Sucesso",
        description: "Agendamento cancelado",
      });

      loadAgendamentos();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao cancelar agendamento",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeletarAgendamento = async (id: string) => {
    try {
      // Verificar autenticação
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      // Preparar headers com dados do usuário
      const userDataEncoded = btoa(JSON.stringify(user));

      const response = await fetch(`/api/agendamentos/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": userDataEncoded,
          "X-Auth-Token": user.token,
        },
      });

      if (!response.ok) throw new Error("Erro ao deletar agendamento");

      toast({
        title: "Sucesso",
        description: "Agendamento excluído",
      });

      loadAgendamentos();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao deletar agendamento",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleIniciarAtendimento = (id: string) => {
    // TODO: Implementar navegação para prontuário
    console.log("Iniciar atendimento:", id);
    toast({
      title: "Em desenvolvimento",
      description:
        "Funcionalidade de iniciar atendimento será implementada em breve",
    });
  };

  const handleNovoAgendamentoClick = (
    profissionalId: string,
    horario: string
  ) => {
    const [hour, minute] = horario.split(":").map(Number);
    const data = new Date(selectedDate);
    data.setHours(hour, minute, 0, 0);

    setNovoAgendamentoDefaults({
      profissionalId,
      data,
      horario,
    });
    setShowNovoAgendamento(true);
  };

  const handleNovoAgendamentoSemanalClick = (data: Date, horario: string) => {
    setNovoAgendamentoDefaults({
      profissionalId:
        selectedProfissional !== "all" ? selectedProfissional : undefined,
      data,
      horario,
    });
    setShowNovoAgendamento(true);
  };

  const handleAgendamentoClick = (agendamento: Agendamento) => {
    setSelectedAgendamento(agendamento);
    setShowDetalhes(true);
  };

  const navigateDate = (direction: "prev" | "next") => {
    if (viewMode === "day") {
      setSelectedDate(
        direction === "next"
          ? addDays(selectedDate, 1)
          : subDays(selectedDate, 1)
      );
    } else {
      setSelectedDate(
        direction === "next"
          ? addDays(selectedDate, 7)
          : subDays(selectedDate, 7)
      );
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Estatísticas
  const agendamentosHoje = agendamentos.filter(
    (a) =>
      format(new Date(a.data_hora), "yyyy-MM-dd") ===
      format(new Date(), "yyyy-MM-dd")
  );

  const profissionaisFiltrados =
    selectedProfissional === "all"
      ? profissionais
      : profissionais.filter((p) => p.id === selectedProfissional);

  if (isLoading) {
    return (
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-lg">Carregando agenda...</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
            <p className="text-muted-foreground">
              Gerencie consultas e agendamentos
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowNovoAgendamento(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Agendamento
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoje</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {agendamentosHoje.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confirmados</CardTitle>
              <Clock className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {
                  agendamentos.filter(
                    (a) => a.status === StatusAgendamento.CONFIRMADO
                  ).length
                }
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atendidos</CardTitle>
              <User className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {
                  agendamentos.filter(
                    (a) => a.status === StatusAgendamento.ATENDIDO
                  ).length
                }
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelados</CardTitle>
              <Calendar className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {
                  agendamentos.filter(
                    (a) => a.status === StatusAgendamento.CANCELADO
                  ).length
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controles da Agenda */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateDate("prev")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-lg font-semibold capitalize">
                  {format(
                    selectedDate,
                    viewMode === "day"
                      ? "EEEE, d 'de' MMMM 'de' yyyy"
                      : "'Semana de' d 'de' MMMM",
                    { locale: ptBR }
                  )}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateDate("next")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Hoje
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Select
                  value={selectedProfissional}
                  onValueChange={setSelectedProfissional}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Todos os profissionais
                      </div>
                    </SelectItem>
                    {profissionais.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id}>
                        {prof.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant={viewMode === "day" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("day")}
                >
                  Dia
                </Button>
                <Button
                  variant={viewMode === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("week")}
                >
                  Semana
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Visualização da Agenda */}
        <Card>
          <CardContent className="p-0">
            {viewMode === "day" ? (
              <AgendaDiaria
                agendamentos={agendamentos}
                profissionais={profissionaisFiltrados}
                selectedDate={selectedDate}
                onNovoAgendamento={handleNovoAgendamentoClick}
                onAgendamentoClick={handleAgendamentoClick}
                showMultipleProfessionals={
                  isAdmin && selectedProfissional === "all"
                }
              />
            ) : (
              <AgendaSemanal
                agendamentos={agendamentos}
                profissionalId={
                  selectedProfissional !== "all"
                    ? selectedProfissional
                    : undefined
                }
                selectedDate={selectedDate}
                onNovoAgendamento={handleNovoAgendamentoSemanalClick}
                onAgendamentoClick={handleAgendamentoClick}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Novo Agendamento */}
      <Dialog open={showNovoAgendamento} onOpenChange={setShowNovoAgendamento}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <NovoAgendamentoForm
            pacientes={pacientes}
            profissionais={profissionais}
            salas={salas}
            onSubmit={handleNovoAgendamento}
            onCancel={() => setShowNovoAgendamento(false)}
            defaultValues={novoAgendamentoDefaults}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes do Agendamento */}
      <AgendamentoDetailsDialog
        agendamento={selectedAgendamento}
        open={showDetalhes}
        onOpenChange={setShowDetalhes}
        onConfirmar={handleConfirmarAgendamento}
        onCancelar={handleCancelarAgendamento}
        onIniciarAtendimento={handleIniciarAtendimento}
        onDeletar={handleDeletarAgendamento}
      />
    </MainLayout>
  );
}
