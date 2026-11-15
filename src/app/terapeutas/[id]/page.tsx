/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/main-layout";
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
  Banknote,
  Calendar,
  CalendarDays,
  Clock,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { formatarDataCivil } from "@/lib/datas-fuso";
import { useToast } from "@/hooks/use-toast";
import { RegraRepasseForm } from "@/components/terapeutas/regra-repasse-form";
import { GradeEditor } from "@/components/ocupacao-prof/grade-editor";
import { PageLoader } from "@/components/page-loader";
import type { ProfissionalDetalhe, RegraRepasse } from "@/types/profissional";
import { TIPO_REPASSE_LABELS } from "@/types/profissional";
import { TIPO_VINCULO_LABELS } from "@/lib/profissional-constants";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ActionButton,
  EstadoVazio,
  IconButton,
  LinhaDado,
  PageHeader,
  PersonAvatar,
  Panel,
  StatCard,
  StatusPill,
  type TomStatus,
} from "@/components/kit";

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

const TOM_STATUS: Record<string, TomStatus> = {
  AGENDADO: "info",
  CONFIRMADO: "success",
  EM_ANDAMENTO: "violet",
  CONCLUIDO: "success",
  CANCELADO: "danger",
  FALTA: "warning",
};

/** Contagem na aba — pílula da marca. */
function Contagem({ n }: { n: number }) {
  return (
    <span className="tabular ml-1.5 rounded-full bg-brand-soft px-2 py-0.5 text-[0.7rem] font-semibold text-brand">
      {n}
    </span>
  );
}

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
          <div className="py-16">
            <EstadoVazio
              icone={<User />}
              titulo="Profissional não encontrado"
              texto="Ele pode ter sido removido ou o link está incorreto"
              acao={
                <ActionButton variant="secondary" onClick={() => router.push("/terapeutas")}>
                  Voltar para profissionais
                </ActionButton>
              }
            />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  const vinculo = profissional.tipo_vinculo
    ? TIPO_VINCULO_LABELS[profissional.tipo_vinculo] || profissional.tipo_vinculo
    : null;

  return (
    <ProtectedRoute requiredPermission={{ resource: "terapeutas", action: "VIEW" }}>
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-7">
        <PageHeader
          voltar={{ onClick: () => router.push("/terapeutas") }}
          avatar={<PersonAvatar nome={profissional.nome} tamanho={56} />}
          titulo={
            <span className="inline-flex flex-wrap items-center gap-3">
              {profissional.nome}
              <StatusPill tom={profissional.ativo ? "success" : "danger"} ponto>
                {profissional.ativo ? "Ativo" : "Inativo"}
              </StatusPill>
            </span>
          }
          subtitulo={
            [profissional.especialidade || "Não classificado", vinculo].filter(Boolean).join(" · ")
          }
          meta={
            profissional.registro_profissional ? (
              <StatusPill tom="info">{profissional.registro_profissional}</StatusPill>
            ) : undefined
          }
        />

        <div className="anim-escalonada grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr]">
          <StatCard
            tom="blue"
            size="hero"
            icone={<Calendar />}
            rotulo="Agendamentos"
            valor={profissional._count.agendamentos}
          />
          <StatCard
            tom="lavender"
            icone={<Users />}
            rotulo="Pacientes"
            valor={profissional._count.pacientes}
          />
          <StatCard
            tom="mint"
            icone={<User />}
            rotulo="Prontuários"
            valor={profissional._count.prontuarios}
          />
          <StatCard
            tom="peach"
            icone={<Banknote />}
            rotulo="Regras de Repasse"
            valor={profissional._count.regrasRepasse}
          />
        </div>

        <Tabs defaultValue="dados">
          <TabsList>
            <TabsTrigger value="dados">Dados Gerais</TabsTrigger>
            <TabsTrigger value="agenda">
              Agenda
              {agendamentos.length > 0 && <Contagem n={agendamentos.length} />}
            </TabsTrigger>
            <TabsTrigger value="grade">Grade de Horário</TabsTrigger>
            <TabsTrigger value="pacientes">
              Pacientes
              {pacientes.length > 0 && <Contagem n={pacientes.length} />}
            </TabsTrigger>
            <TabsTrigger value="repasse">
              Regras de Repasse
              {regras.length > 0 && <Contagem n={regras.length} />}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Dados Gerais ────────────────────────────────────────── */}
          <TabsContent value="dados" className="mt-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Panel icone={<User />} titulo="Identificação">
                <LinhaDado rotulo="Nome">{profissional.nome}</LinhaDado>
                <LinhaDado rotulo="Especialidade">
                  {profissional.especialidade || "Não classificado"}
                </LinhaDado>
                <LinhaDado rotulo="Vínculo">{vinculo}</LinhaDado>
                <LinhaDado rotulo="Registro profissional">
                  {profissional.registro_profissional && (
                    <span className="tabular">{profissional.registro_profissional}</span>
                  )}
                </LinhaDado>
              </Panel>
              <Panel icone={<Phone />} titulo="Contato e Cadastro">
                <LinhaDado rotulo="Telefone">
                  {profissional.telefone && <span className="tabular">{profissional.telefone}</span>}
                </LinhaDado>
                <LinhaDado rotulo="E-mail">{profissional.email}</LinhaDado>
                <LinhaDado rotulo="CPF">
                  {profissional.cpf && <span className="tabular">{profissional.cpf}</span>}
                </LinhaDado>
                <LinhaDado rotulo="Cadastrado em">
                  <span className="tabular">
                    {format(new Date(profissional.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </LinhaDado>
              </Panel>
            </div>
          </TabsContent>

          {/* ── Tab: Agenda ──────────────────────────────────────────────── */}
          <TabsContent value="agenda" className="mt-5">
            <Panel
              icone={<CalendarDays />}
              titulo="Últimos Agendamentos"
              subtitulo="Os 20 agendamentos mais recentes do profissional"
            >
              {agendaLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-2xl" />
                  ))}
                </div>
              ) : agendamentos.length === 0 ? (
                <EstadoVazio icone={<CalendarDays />} titulo="Nenhum agendamento encontrado" />
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
                          <span className="tabular text-sm text-ink">
                            {format(new Date(a.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-3">
                            <PersonAvatar nome={a.paciente?.nome ?? "—"} tamanho={34} />
                            <span className="truncate font-semibold text-ink">{a.paciente?.nome ?? "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>{a.procedimento?.nome ?? <span className="text-ink-4">—</span>}</TableCell>
                        <TableCell>{a.sala?.nome ?? <span className="text-ink-4">—</span>}</TableCell>
                        <TableCell>
                          <StatusPill tom={TOM_STATUS[a.status] ?? "neutral"} ponto>
                            {STATUS_LABELS[a.status] ?? a.status}
                          </StatusPill>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Panel>
          </TabsContent>

          {/* ── Tab: Pacientes ───────────────────────────────────────────── */}
          <TabsContent value="pacientes" className="mt-5">
            <Panel icone={<Users />} titulo="Pacientes Atendidos" subtitulo="Pacientes vinculados a este profissional">
              {pacientesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-2xl" />
                  ))}
                </div>
              ) : pacientes.length === 0 ? (
                <EstadoVazio icone={<Users />} titulo="Nenhum paciente vinculado" />
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
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-3">
                            <PersonAvatar nome={p.nome} tamanho={34} />
                            <span className="truncate font-semibold text-ink">{p.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="tabular text-[0.82rem] text-ink-3">
                            {p.data_nascimento ? formatarDataCivil(p.data_nascimento) : "—"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Panel>
          </TabsContent>

          {/* ── Tab: Regras de Repasse ───────────────────────────────────── */}
          <TabsContent value="repasse" className="mt-5">
            <Panel
              icone={<Banknote />}
              titulo="Regras de Repasse"
              subtitulo="Quanto o profissional recebe por atendimento"
              acoes={
                <ActionButton size="sm" onClick={() => setRegraForm({ open: true, regra: null })}>
                  <Plus />
                  Nova Regra
                </ActionButton>
              }
            >
              {regrasLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-2xl" />
                  ))}
                </div>
              ) : regras.length === 0 ? (
                <EstadoVazio
                  icone={<Banknote />}
                  titulo="Nenhuma regra de repasse cadastrada"
                  texto="Clique em “Nova Regra” para adicionar."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Convênio</TableHead>
                      <TableHead>Procedimento</TableHead>
                      <TableHead>Vigência</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regras.map((regra) => {
                      const status = getRegraStatus(regra);
                      return (
                        <TableRow key={regra.id} className={!regra.ativo ? "opacity-60" : ""}>
                          <TableCell>
                            {regra.descricao ? (
                              <span className="font-semibold text-ink">{regra.descricao}</span>
                            ) : (
                              <span className="text-ink-4 italic">Sem descrição</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusPill tom="violet">{TIPO_REPASSE_LABELS[regra.tipo] ?? regra.tipo}</StatusPill>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="tabular font-semibold text-ink">
                              {formatValor(Number(regra.valor), regra.tipo)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {regra.convenio ? (
                              regra.convenio.nome_fantasia || regra.convenio.razao_social
                            ) : (
                              <StatusPill tom="neutral">Todos</StatusPill>
                            )}
                          </TableCell>
                          <TableCell>
                            {regra.procedimento ? (
                              regra.procedimento.nome
                            ) : (
                              <StatusPill tom="neutral">Todos</StatusPill>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className="tabular text-[0.82rem] text-ink-3">
                              {format(new Date(regra.vigencia_inicio), "dd/MM/yy", { locale: ptBR })}
                              {" — "}
                              {regra.vigencia_fim
                                ? format(new Date(regra.vigencia_fim), "dd/MM/yy", { locale: ptBR })
                                : "Sem fim"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <StatusPill
                              tom={status === "Ativa" ? "success" : status === "Futura" ? "info" : "neutral"}
                              ponto
                            >
                              {status}
                            </StatusPill>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1.5">
                              <IconButton
                                aria-label="Editar regra"
                                className="size-9"
                                onClick={() => setRegraForm({ open: true, regra })}
                                disabled={!regra.ativo}
                              >
                                <Pencil className="size-4" />
                              </IconButton>
                              <IconButton
                                aria-label="Desativar regra"
                                className="size-9 text-danger-ink"
                                onClick={() => handleDesativarRegra(regra.id)}
                                disabled={!regra.ativo}
                              >
                                <Trash2 className="size-4" />
                              </IconButton>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Panel>
          </TabsContent>

          {/* ── Tab: Grade de Horário ───────────────────────────────────── */}
          {/* Mesmo editor do modal da taxa de ocupação, não uma segunda tela:
              a filial escolhida aqui é a que alimenta o agendamento. */}
          <TabsContent value="grade" className="mt-5">
            <Panel
              icone={<Clock />}
              titulo="Grade de Atendimento"
              subtitulo="Dias, horários e filial em que o profissional atende. É o que a agenda usa para liberar o agendamento e o que a taxa de ocupação usa como horário disponível."
            >
              <GradeEditor endpoint={`/api/terapeutas/${id}/grade`} onSaved={fetchProfissional} />
            </Panel>
          </TabsContent>
        </Tabs>
        </div>

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
