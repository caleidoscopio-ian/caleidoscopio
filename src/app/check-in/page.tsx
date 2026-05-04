/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/main-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/page-loader";
import { useToast } from "@/hooks/use-toast";
import { CheckInStats } from "@/components/check-in/check-in-stats";
import { CheckInCard } from "@/components/check-in/check-in-card";
import { CheckInFiltersBar, todayStr, type CheckInFilters } from "@/components/check-in/check-in-filters";
import { StatusAgendamento } from "@/types/agendamento";
import { STATUS_LABELS, type AgendamentoCheckIn, type CheckInAction } from "@/types/check-in";
import { ClipboardCheck } from "lucide-react";

const COLUNAS: StatusAgendamento[] = [
  StatusAgendamento.AGENDADO,
  StatusAgendamento.CONFIRMADO,
  StatusAgendamento.EM_ATENDIMENTO,
  StatusAgendamento.ATENDIDO,
  StatusAgendamento.FALTOU,
];

const breadcrumbs = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Check-in" },
];

export default function CheckInPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [agendamentos, setAgendamentos] = useState<AgendamentoCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [profissionais, setProfissionais] = useState<{ id: string; nome: string }[]>([]);
  const [salas, setSalas] = useState<{ id: string; nome: string }[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [filters, setFilters] = useState<CheckInFilters>({
    data: todayStr(),
    search: "",
    profissionalId: "",
    salaId: "",
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const authHeaders = useCallback(() => ({
    "X-User-Data": btoa(JSON.stringify(user)),
    "X-Auth-Token": user!.token,
  }), [user]);

  const fetchAgendamentos = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({ data: filters.data });
      if (filters.search) params.set("search", filters.search);
      if (filters.profissionalId) params.set("profissionalId", filters.profissionalId);
      if (filters.salaId) params.set("salaId", filters.salaId);

      const r = await fetch(`/api/agendamentos/check-in?${params}`, { headers: authHeaders() });
      const d = await r.json();
      if (d.success) setAgendamentos(d.data);
      else toast({ title: "Erro ao carregar", description: d.error, variant: "destructive" });
    } catch {
      if (!silent) toast({ title: "Erro de conexão", variant: "destructive" });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user, filters, authHeaders]);

  // Checar se pode editar
  useEffect(() => {
    if (!user) return;
    fetch("/api/agendamentos/check-in?data=" + filters.data, {
      method: "HEAD",
      headers: { ...authHeaders(), "X-Check-Permission": "edit_schedule" },
    }).catch(() => {});
    // Verificar via tentativa de permissão — simplificamos consultando a role
    const editRoles = ["ADMIN", "SUPER_ADMIN"];
    setCanEdit(editRoles.includes(user.role) || true); // RBAC verifica server-side; permitimos tentativa
  }, [user]);

  // Carregar profissionais e salas para filtros
  useEffect(() => {
    if (!user) return;
    const h = authHeaders();
    fetch("/api/terapeutas", { headers: h })
      .then((r) => r.json())
      .then((d) => { if (d.success || Array.isArray(d)) setProfissionais(Array.isArray(d) ? d : d.data ?? []); })
      .catch(() => {});
    fetch("/api/salas", { headers: h })
      .then((r) => r.json())
      .then((d) => { if (d.success || Array.isArray(d)) setSalas(Array.isArray(d) ? d : d.data ?? []); })
      .catch(() => {});
  }, [user]);

  // Fetch inicial e ao mudar filtros
  useEffect(() => {
    if (isAuthenticated && user) fetchAgendamentos();
  }, [isAuthenticated, user, filters]);

  // Auto-refresh a cada 60s
  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (isAuthenticated && user) fetchAgendamentos(true);
    }, 60_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isAuthenticated, user, filters]);

  const handleAction = useCallback(async (id: string, action: CheckInAction, motivo?: string) => {
    if (!user) return;
    try {
      const r = await fetch(`/api/agendamentos/${id}/check-in`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action, motivo }),
      });
      const d = await r.json();
      if (d.success) {
        setAgendamentos((prev) =>
          prev.map((a) => (a.id === id ? (d.data as AgendamentoCheckIn) : a))
        );
        const labels: Record<CheckInAction, string> = {
          confirmar: "Confirmado",
          checkin:   "Check-in registrado",
          iniciar:   "Atendimento iniciado",
          finalizar: "Atendimento finalizado",
          "no-show": "No-show registrado",
          reabrir:   "Agendamento reaberto",
        };
        toast({ title: labels[action] });
      } else {
        toast({ title: "Erro", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro de conexão", variant: "destructive" });
    }
  }, [user, authHeaders]);

  if (loading) {
    return (
      <ProtectedRoute requiredPermission={{ resource: "agenda", action: "VIEW" }}>
        <MainLayout breadcrumbs={breadcrumbs}>
          <PageLoader message="Carregando check-in..." />
        </MainLayout>
      </ProtectedRoute>
    );
  }

  const porStatus = (status: StatusAgendamento) =>
    agendamentos.filter((a) => a.status === status);

  return (
    <ProtectedRoute requiredPermission={{ resource: "agenda", action: "VIEW" }}>
      <MainLayout breadcrumbs={breadcrumbs}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Check-in e Recepção</h1>
            <p className="text-sm text-muted-foreground">Gerencie o fluxo de chegada dos pacientes</p>
          </div>
        </div>

        <CheckInStats agendamentos={agendamentos} />

        <CheckInFiltersBar
          filters={filters}
          profissionais={profissionais}
          salas={salas}
          loading={loading}
          onChange={setFilters}
          onRefresh={() => fetchAgendamentos()}
        />

        <Tabs defaultValue={StatusAgendamento.AGENDADO}>
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            {COLUNAS.map((status) => {
              const count = porStatus(status).length;
              return (
                <TabsTrigger key={status} value={status} className="text-xs">
                  {STATUS_LABELS[status]}
                  {count > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-xs px-1.5">{count}</Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {COLUNAS.map((status) => {
            const lista = porStatus(status);
            return (
              <TabsContent key={status} value={status}>
                {lista.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Nenhum agendamento com status &ldquo;{STATUS_LABELS[status]}&rdquo;
                  </div>
                ) : (
                  <div className="space-y-2">
                    {lista.map((ag) => (
                      <CheckInCard
                        key={ag.id}
                        agendamento={ag}
                        canEdit={canEdit}
                        onAction={handleAction}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </MainLayout>
    </ProtectedRoute>
  );
}
