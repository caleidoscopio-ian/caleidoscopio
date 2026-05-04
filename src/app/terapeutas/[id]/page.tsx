/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/main-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Pencil,
  Plus,
  Trash2,
  User,
  Calendar,
  Users,
  Banknote,
  Phone,
  Mail,
  CreditCard,
  Award,
  DoorOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RegraRepasseForm } from "@/components/terapeutas/regra-repasse-form";
import { PageLoader } from "@/components/page-loader";
import type { ProfissionalDetalhe, RegraRepasse } from "@/types/profissional";
import { TIPO_REPASSE_LABELS } from "@/types/profissional";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types locais ────────────────────────────────────────────────────────────

interface AgendamentoItem {
  id: string;
  data_hora: string;
  horario_fim: string;
  status: string;
  paciente?: { id: string; nome: string } | null;
  sala?: { id: string; nome: string } | null;
  procedimento?: { id: string; nome: string } | null;
}

interface PacienteItem {
  id: string;
  nome: string;
  data_nascimento?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  AGENDADO: "Agendado",
  CONFIRMADO: "Confirmado",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  FALTA: "Falta",
};

const STATUS_COLORS: Record<string, string> = {
  AGENDADO: "secondary",
  CONFIRMADO: "default",
  EM_ANDAMENTO: "default",
  CONCLUIDO: "default",
  CANCELADO: "destructive",
  FALTA: "destructive",
};

function formatValor(valor: number, tipo: string) {
  if (tipo === "PERCENTUAL") return `${valor}%`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function getRegraStatus(regra: RegraRepasse): "Ativa" | "Inativa" | "Futura" {
  if (!regra.ativo) return "Inativa";
  const hoje = new Date();
  const inicio = new Date(regra.vigencia_inicio);
  if (inicio > hoje) return "Futura";
  if (regra.vigencia_fim && new Date(regra.vigencia_fim) < hoje) return "Inativa";
  return "Ativa";
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TerapeutaDetalhePage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [profissional, setProfissional] = useState<ProfissionalDetalhe | null>(null);
  const [agendamentos, setAgendamentos] = useState<AgendamentoItem[]>([]);
  const [pacientes, setPacientes] = useState<PacienteItem[]>([]);
  const [regras, setRegras] = useState<RegraRepasse[]>([]);

  const [loading, setLoading] = useState(true);
  const [agendaLoading, setAgendaLoading] = useState(true);
  const [pacientesLoading, setPacientesLoading] = useState(true);
  const [regrasLoading, setRegrasLoading] = useState(true);

  const [regraForm, setRegraForm] = useState<{ open: boolean; regra?: RegraRepasse | null }>({ open: false });

  const authHeaders = useCallback(
    () => ({
      "X-User-Data": btoa(JSON.stringify(user)),
      "X-Auth-Token": user!.token,
    }),
    [user]
  );

  const fetchProfissional = useCallback(async () => {
    if (!user) return;
    try {
      const r = await fetch(`/api/terapeutas/${id}`, { headers: authHeaders() });
      const data = await r.json();
      if (data.success) setProfissional(data.data);
      else throw new Error(data.error);
    } catch (err) {
      toast({ title: "Erro ao carregar profissional", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, user, authHeaders, toast]);

  const fetchAgendamentos = useCallback(async () => {
    if (!user) return;
    setAgendaLoading(true);
    try {
      const r = await fetch(`/api/agendamentos?profissionalId=${id}&limit=20`, { headers: authHeaders() });
      const data = await r.json();
      if (data.success) setAgendamentos(data.data ?? []);
    } finally {
      setAgendaLoading(false);
    }
  }, [id, user, authHeaders]);

  const fetchPacientes = useCallback(async () => {
    if (!user) return;
    setPacientesLoading(true);
    try {
      const r = await fetch(`/api/pacientes?profissionalId=${id}`, { headers: authHeaders() });
      const data = await r.json();
      if (data.success) setPacientes(data.data ?? []);
      else setPacientes([]);
    } finally {
      setPacientesLoading(false);
    }
  }, [id, user, authHeaders]);

  const fetchRegras = useCallback(async () => {
    if (!user) return;
    setRegrasLoading(true);
    try {
      const r = await fetch(`/api/terapeutas/${id}/regras-repasse?includeInativos=true`, { headers: authHeaders() });
      const data = await r.json();
      if (data.success) setRegras(data.data ?? []);
    } finally {
      setRegrasLoading(false);
    }
  }, [id, user, authHeaders]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    fetchProfissional();
    fetchAgendamentos();
    fetchPacientes();
    fetchRegras();
  }, [isAuthenticated, user]);

  const handleDesativarRegra = async (regraId: string) => {
    if (!user) return;
    try {
      const r = await fetch(`/api/terapeutas/${id}/regras-repasse?regraId=${regraId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await r.json();
      if (data.success) {
        toast({ title: "Regra desativada com sucesso" });
        fetchRegras();
      } else {
        toast({ title: "Erro ao desativar", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro inesperado", variant: "destructive" });
    }
  };

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Profissionais", href: "/terapeutas" },
    { label: profissional?.nome ?? "Detalhe" },
  ];

  // ─── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <ProtectedRoute requiredPermission={{ resource: "terapeutas", action: "VIEW" }}>
        <MainLayout breadcrumbs={breadcrumbs}>
          <PageLoader message="Carregando profissional..." />
        </MainLayout>
      </ProtectedRoute>
    );
  }

  if (!profissional) {
    return (
      <ProtectedRoute requiredPermission={{ resource: "terapeutas", action: "VIEW" }}>
        <MainLayout breadcrumbs={breadcrumbs}>
          <div className="text-center py-16 text-muted-foreground">
            Profissional não encontrado.
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredPermission={{ resource: "terapeutas", action: "VIEW" }}>
      <MainLayout breadcrumbs={breadcrumbs}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => router.push("/terapeutas")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{profissional.nome}</h1>
              <Badge variant="secondary">{profissional.especialidade}</Badge>
              {!profissional.ativo && <Badge variant="destructive">Inativo</Badge>}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Agendamentos</p>
                  <p className="text-xl font-bold">{profissional._count.agendamentos}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Pacientes</p>
                  <p className="text-xl font-bold">{profissional._count.pacientes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Prontuários</p>
                  <p className="text-xl font-bold">{profissional._count.prontuarios}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Regras de Repasse</p>
                  <p className="text-xl font-bold">{profissional._count.regrasRepasse}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dados">
          <TabsList className="mb-4">
            <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="pacientes">Pacientes</TabsTrigger>
            <TabsTrigger value="repasse">Regras de Repasse</TabsTrigger>
          </TabsList>

          {/* ── Tab: Dados Gerais ────────────────────────────────────────── */}
          <TabsContent value="dados">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações do Profissional</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Nome</p>
                    <p className="font-medium">{profissional.nome}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Especialidade</p>
                    <p className="font-medium">{profissional.especialidade}</p>
                  </div>
                </div>
                {profissional.cpf && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">CPF</p>
                      <p className="font-medium">{profissional.cpf}</p>
                    </div>
                  </div>
                )}
                {profissional.registro_profissional && (
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Registro Profissional</p>
                      <p className="font-medium">{profissional.registro_profissional}</p>
                    </div>
                  </div>
                )}
                {profissional.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <p className="font-medium">{profissional.telefone}</p>
                    </div>
                  </div>
                )}
                {profissional.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">E-mail</p>
                      <p className="font-medium">{profissional.email}</p>
                    </div>
                  </div>
                )}
                {profissional.salas_acesso.length > 0 && (
                  <div className="flex items-start gap-2 col-span-2">
                    <DoorOpen className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Salas com acesso</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {profissional.salas_acesso.map((sala) => (
                          <Badge key={sala} variant="outline" className="text-xs">
                            {sala}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div className="col-span-2 text-xs text-muted-foreground pt-2 border-t">
                  Cadastrado em{" "}
                  {format(new Date(profissional.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Agenda ──────────────────────────────────────────────── */}
          <TabsContent value="agenda">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Últimos Agendamentos</CardTitle>
              </CardHeader>
              <CardContent>
                {agendaLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : agendamentos.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum agendamento encontrado.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Procedimento</TableHead>
                        <TableHead>Sala</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agendamentos.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(a.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>{a.paciente?.nome ?? "—"}</TableCell>
                          <TableCell>{a.procedimento?.nome ?? "—"}</TableCell>
                          <TableCell>{a.sala?.nome ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant={(STATUS_COLORS[a.status] ?? "secondary") as "default" | "secondary" | "destructive" | "outline"}>
                              {STATUS_LABELS[a.status] ?? a.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Pacientes ───────────────────────────────────────────── */}
          <TabsContent value="pacientes">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pacientes Atendidos</CardTitle>
              </CardHeader>
              <CardContent>
                {pacientesLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : pacientes.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum paciente vinculado.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Data de Nascimento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pacientes.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.nome}</TableCell>
                          <TableCell>
                            {p.data_nascimento
                              ? format(new Date(p.data_nascimento), "dd/MM/yyyy", { locale: ptBR })
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Regras de Repasse ───────────────────────────────────── */}
          <TabsContent value="repasse">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Regras de Repasse</CardTitle>
                <Button
                  size="sm"
                  onClick={() => setRegraForm({ open: true, regra: null })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Regra
                </Button>
              </CardHeader>
              <CardContent>
                {regrasLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : regras.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">
                    Nenhuma regra de repasse cadastrada.
                    <br />
                    Clique em &ldquo;Nova Regra&rdquo; para adicionar.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Convênio</TableHead>
                        <TableHead>Procedimento</TableHead>
                        <TableHead>Vigência</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {regras.map((regra) => {
                        const status = getRegraStatus(regra);
                        return (
                          <TableRow key={regra.id} className={!regra.ativo ? "opacity-50" : ""}>
                            <TableCell className="font-medium">
                              {regra.descricao || <span className="text-muted-foreground italic">Sem descrição</span>}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="whitespace-nowrap">
                                {TIPO_REPASSE_LABELS[regra.tipo] ?? regra.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono">
                              {formatValor(Number(regra.valor), regra.tipo)}
                            </TableCell>
                            <TableCell>
                              {regra.convenio
                                ? (regra.convenio.nome_fantasia || regra.convenio.razao_social)
                                : <span className="text-muted-foreground text-xs">Todos</span>}
                            </TableCell>
                            <TableCell>
                              {regra.procedimento
                                ? regra.procedimento.nome
                                : <span className="text-muted-foreground text-xs">Todos</span>}
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap">
                              {format(new Date(regra.vigencia_inicio), "dd/MM/yy", { locale: ptBR })}
                              {" — "}
                              {regra.vigencia_fim
                                ? format(new Date(regra.vigencia_fim), "dd/MM/yy", { locale: ptBR })
                                : "Sem fim"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  status === "Ativa"
                                    ? "default"
                                    : status === "Futura"
                                    ? "secondary"
                                    : "destructive"
                                }
                                className="text-xs"
                              >
                                {status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => setRegraForm({ open: true, regra })}
                                  disabled={!regra.ativo}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => handleDesativarRegra(regra.id)}
                                  disabled={!regra.ativo}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
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
          </TabsContent>
        </Tabs>

        {/* Form Dialog */}
        <RegraRepasseForm
          profissionalId={id}
          regra={regraForm.regra}
          open={regraForm.open}
          onOpenChange={(open) => setRegraForm((prev) => ({ ...prev, open }))}
          onSuccess={fetchRegras}
        />
      </MainLayout>
    </ProtectedRoute>
  );
}
