/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/main-layout";
import { cn } from "@/lib/utils";
import {
  PageHeader,
  StatCard,
  Panel,
  StatusPill,
  PersonAvatar,
  ActionButton,
} from "@/components/kit";
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
  ArrowRight,
  MapPin,
  User,
  CalendarOff,
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
  curriculum: {
    nome: string;
  };
  avaliacoes?: Array<{
    nota: number;
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

/** Os seis valores de `StatusAgendamento`. O mapa antigo tinha cinco:
 *  `EM_ATENDIMENTO` caía no padrão e aparecia rotulado como "Agendado". */
const ROTULO_STATUS: Record<string, string> = {
  AGENDADO: "Agendado",
  CONFIRMADO: "Confirmado",
  EM_ATENDIMENTO: "Em atendimento",
  ATENDIDO: "Atendido",
  FALTOU: "Faltou",
  CANCELADO: "Cancelado",
};

/* ── Peças de layout do dashboard ─────────────────────────────────────────
   As três janelas da tela usavam marcação própria: caixa com `border
   rounded-lg` numa, `flex` com botão noutra, `Card` do shadcn na terceira.
   Aqui existe **uma** anatomia de linha, igual à do v2:

     li  grid [3.75rem auto 1fr] · divisória `hairline` · sem caixa
       hora/duração · avatar · bloco `bg-surface-muted rounded-2xl`

   A caixa com borda em volta de cada item era o que fazia as janelas
   parecerem de sistemas diferentes — no v2 a separação é uma hairline, e o
   único retângulo é o painel. */

function ItemLista({
  hora,
  nome,
  pill,
  meta,
  nota,
  acao,
}: {
  hora?: React.ReactNode;
  nome: string;
  pill?: React.ReactNode;
  meta?: React.ReactNode;
  nota?: React.ReactNode;
  acao?: React.ReactNode;
}) {
  return (
    <li
      className={cn(
        "grid items-center gap-3 border-b border-hairline py-3 last:border-none md:gap-4",
        hora ? "grid-cols-[3.75rem_auto_1fr]" : "grid-cols-[auto_1fr]"
      )}
    >
      {hora}
      <PersonAvatar nome={nome} />
      <div className="min-w-0 rounded-2xl bg-surface-muted px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-[0.95rem] font-semibold text-ink">{nome}</p>
          {pill}
        </div>
        {meta && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.75rem] text-ink-3">
            {meta}
          </div>
        )}
        {nota && (
          <p className="mt-2 border-t border-hairline pt-2 text-[0.75rem] text-ink-3">
            {nota}
          </p>
        )}
        {acao && <div className="mt-3 flex justify-end">{acao}</div>}
      </div>
    </li>
  );
}

function MetaItem({
  icone,
  children,
}: {
  icone: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {icone}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Estado vazio: o mesmo bloco nas três janelas, em vez de um `Card` solto. */
function Vazio({
  icone,
  titulo,
  texto,
  acao,
  noturno,
}: {
  icone: React.ReactNode;
  titulo: string;
  texto?: string;
  acao?: React.ReactNode;
  noturno?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <span
        className={cn(
          "grid size-12 place-items-center rounded-2xl [&_svg]:size-5",
          noturno ? "bg-white/10 text-white/70" : "bg-surface-sunken text-ink-3"
        )}
        aria-hidden
      >
        {icone}
      </span>
      <p
        className={cn(
          "mt-3 text-[0.95rem] font-semibold",
          noturno ? "text-white" : "text-ink"
        )}
      >
        {titulo}
      </p>
      {texto && (
        <p className={cn("mt-1 text-sm", noturno ? "text-white/60" : "text-ink-3")}>
          {texto}
        </p>
      )}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
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

  // O tom sai do mapa do `StatusPill` (`tomDoStatus`), o mesmo das outras
  // telas; aqui só mora o rótulo.
  const rotuloStatus = (status: string) =>
    ROTULO_STATUS[status] ?? ROTULO_STATUS.AGENDADO;

  const calcularMediaNotas = (sessao: Sessao) => {
    if (!sessao.avaliacoes || sessao.avaliacoes.length === 0) return 0;
    const soma = sessao.avaliacoes.reduce((acc, av) => acc + av.nota, 0);
    return (soma / sessao.avaliacoes.length).toFixed(1);
  };

  if (loading) {
    return (
      <ProtectedRoute requiredPermission={{ resource: 'dashboard', action: 'VIEW' }}>
        <MainLayout breadcrumbs={breadcrumbs}>
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 size-8 animate-spin text-brand" aria-hidden />
              <p className="text-sm text-ink-3">Carregando dashboard...</p>
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredPermission={{ resource: 'dashboard', action: 'VIEW' }}>
      <MainLayout breadcrumbs={breadcrumbs}>
        <div className="space-y-7">
          {/* `semTrilha`: o dashboard é a raiz, não tem de onde vir. */}
          <PageHeader
            semTrilha
            titulo="Dashboard"
            subtitulo={`Bem-vindo, ${user?.name ?? ""}!`}
          />

          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-danger-soft bg-danger-soft px-4 py-3 text-sm text-danger-ink">
              <AlertCircle className="size-4 shrink-0" aria-hidden />
              {error}
            </div>
          )}

          {/* Cards de Estatísticas */}
          {/* KPIs no padrão v2: um `hero` e três `md`, tons na ordem do original */}
          <div className="anim-escalonada grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr]">
            <StatCard
              tom="blue"
              size="hero"
              rotulo="Total de Pacientes"
              valor={stats?.totalPacientes ?? 0}
              hint={isAdmin ? "Na clínica" : "Sob seus cuidados"}
              icone={<Users />}
            />
            <StatCard
              tom="lavender"
              rotulo="Sessões em Andamento"
              valor={stats?.sessoesEmAndamento ?? 0}
              hint="Pendentes de finalização"
              icone={<Clock className="text-brand" />}
            />
            <StatCard
              tom="mint"
              rotulo="Sessões este Mês"
              valor={stats?.sessoesRealizadasMes ?? 0}
              hint="Sessões finalizadas"
              icone={<CheckCircle />}
            />
            <StatCard
              tom="peach"
              rotulo="Anamneses Pendentes"
              valor={stats?.anamnesesPendentes ?? 0}
              hint="Em rascunho"
              icone={<FileHeart />}
            />
          </div>

          {/* Agenda + sessões na composição do dashboard do v2:
              `xl:grid-cols-[1.45fr_1fr]`, a lista larga à esquerda e a coluna
              de apoio à direita. Antes eram três painéis num `md:grid-cols-2`,
              onde o terceiro sobrava sozinho em meia largura. */}
          <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
            <Panel
              icone={<Calendar />}
              titulo="Agenda de Hoje"
              subtitulo="Seus agendamentos para hoje"
              rodape={
                <>
                  <span className="text-[0.8rem]">
                    {agendamentosHoje.length === 1
                      ? "1 agendamento hoje"
                      : `${agendamentosHoje.length} agendamentos hoje`}
                  </span>
                  <ActionButton
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push("/agenda")}
                  >
                    Abrir agenda
                    <ArrowRight />
                  </ActionButton>
                </>
              }
            >
              {agendamentosHoje.length > 0 ? (
                <ol className="scrollbar-none max-h-[30rem] space-y-1 overflow-y-auto pr-1">
                  {agendamentosHoje.map((agendamento) => (
                    <ItemLista
                      key={agendamento.id}
                      nome={agendamento.paciente.nome}
                      hora={
                        <div className="text-center">
                          <p className="tabular text-[1.25rem] leading-none font-semibold text-ink">
                            {formatHorario(agendamento.data_hora)}
                          </p>
                          <p className="mt-1 text-[0.7rem] text-ink-3">
                            {agendamento.duracao_minutos} min
                          </p>
                        </div>
                      }
                      pill={
                        <StatusPill status={agendamento.status}>
                          {rotuloStatus(agendamento.status)}
                        </StatusPill>
                      }
                      meta={
                        isAdmin || agendamento.sala ? (
                          <>
                            {isAdmin && (
                              <MetaItem
                                icone={
                                  <User className="size-3.5 shrink-0" aria-hidden />
                                }
                              >
                                {agendamento.profissional.nome}
                              </MetaItem>
                            )}
                            {agendamento.sala && (
                              <MetaItem
                                icone={
                                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                                }
                              >
                                {agendamento.sala}
                              </MetaItem>
                            )}
                          </>
                        ) : undefined
                      }
                      nota={agendamento.observacoes}
                    />
                  ))}
                </ol>
              ) : (
                <Vazio
                  icone={<CalendarOff />}
                  titulo="Sem agendamentos para hoje"
                  texto="Nada marcado nesta data."
                />
              )}
            </Panel>

            <div className="flex flex-col gap-4">
              {/* O painel noturno do v2 — um por tela, e no dashboard é este:
                  a sessão aberta é o que a pessoa precisa retomar. */}
              <Panel
                variant="night"
                icone={<Clock />}
                titulo="Sessões Pendentes"
                subtitulo="Em andamento, precisam ser finalizadas"
                acoes={
                  <span className="tabular grid size-8 place-items-center rounded-full bg-white/10 text-sm font-semibold text-white">
                    {sessoesPendentes.length}
                  </span>
                }
                rodape={
                  <Link
                    href="/iniciar-sessao"
                    className="flex w-full items-center justify-between text-[0.85rem] text-white/75 transition hover:text-white"
                  >
                    Iniciar nova sessão
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                }
              >
                {sessoesPendentes.length > 0 ? (
                  <div className="space-y-3">
                    {sessoesPendentes.map((sessao) => (
                      <div
                        key={sessao.id}
                        className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4"
                      >
                        <p className="flex items-center gap-2 text-[0.72rem] font-medium text-night-accent">
                          <span className="relative flex size-2" aria-hidden>
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-night-accent opacity-60" />
                            <span className="relative inline-flex size-2 rounded-full bg-night-accent" />
                          </span>
                          Em andamento
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <PersonAvatar
                            nome={sessao.paciente.nome}
                            className="ring-white/20"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-[1.05rem] font-semibold text-white">
                              {sessao.paciente.nome}
                            </p>
                            <p className="truncate text-[0.75rem] text-white/60">
                              {sessao.curriculum.nome}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-end justify-between gap-3">
                          <div>
                            <p className="text-[0.7rem] text-white/55">Iniciada em:</p>
                            <p className="tabular text-sm font-semibold text-white">
                              {formatDate(sessao.iniciada_em)}
                            </p>
                          </div>
                          <ActionButton
                            size="sm"
                            onClick={() =>
                              router.push(`/aplicar-curriculum/${sessao.id}`)
                            }
                          >
                            <Play />
                            Continuar
                          </ActionButton>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Vazio
                    noturno
                    icone={<CheckCircle />}
                    titulo="Nenhuma sessão em aberto"
                    texto="Tudo finalizado por aqui."
                  />
                )}
              </Panel>

              {/* Indicadores de apoio: brancos e `sm`, na coluna estreita — é
                  onde o v2 põe os dois KPIs secundários do dashboard. */}
              {isAdmin && stats && (
                <div className="anim-escalonada grid grid-cols-2 gap-4">
                  <StatCard
                    size="sm"
                    icone={<UserCheck />}
                    rotulo="Terapeutas"
                    valor={stats.totalTerapeutas || 0}
                    hint="Cadastrados"
                  />
                  <StatCard
                    size="sm"
                    icone={<ClipboardList />}
                    rotulo="Atividades"
                    valor={stats.atividadesCadastradas || 0}
                    hint="Protocolos"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Mesma anatomia de linha da agenda: hairline, sem caixa por item */}
          <Panel
            icone={<TrendingUp />}
            titulo="Sessões Recentes"
            subtitulo="Últimas sessões realizadas"
          >
            {sessoesRecentes.length > 0 ? (
              <ol className="space-y-1">
                {sessoesRecentes.map((sessao) => (
                  <ItemLista
                    key={sessao.id}
                    nome={sessao.paciente.nome}
                    pill={
                      <StatusPill tom="success">
                        Média {calcularMediaNotas(sessao)}
                      </StatusPill>
                    }
                    meta={
                      <>
                        <MetaItem
                          icone={
                            <ClipboardList className="size-3.5 shrink-0" aria-hidden />
                          }
                        >
                          {sessao.curriculum.nome}
                        </MetaItem>
                        {sessao.finalizada_em && (
                          <MetaItem
                            icone={
                              <CheckCircle className="size-3.5 shrink-0" aria-hidden />
                            }
                          >
                            Finalizada em {formatDate(sessao.finalizada_em)}
                          </MetaItem>
                        )}
                      </>
                    }
                  />
                ))}
              </ol>
            ) : (
              <Vazio
                icone={<Play />}
                titulo="Nenhuma sessão encontrada"
                texto="Comece iniciando uma nova sessão com um paciente."
                acao={
                  <ActionButton onClick={() => router.push("/iniciar-sessao")}>
                    <Play />
                    Iniciar Sessão
                  </ActionButton>
                }
              />
            )}
          </Panel>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
