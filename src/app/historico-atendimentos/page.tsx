"use client";

import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/main-layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ResumoHistorico } from "@/components/historico-atend/resumo-historico";
import { FiltrosHistorico } from "@/components/historico-atend/filtros-historico";
import { TabelaHistorico } from "@/components/historico-atend/tabela-historico";
import { RegistrarGlosaDialog } from "@/components/glosas/registrar-glosa-dialog";
import type { AgendamentoParaGlosa } from "@/components/glosas/registrar-glosa-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FileDown, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { subDays, startOfDay, endOfDay } from "date-fns";
import type {
  HistoricoResponse, HistoricoResumo, AtendimentoHistorico, HistoricoFiltros,
} from "@/types/historico-atendimento";
import { StatusAgendamento } from "@/types/agendamento";

const RESUMO_VAZIO: HistoricoResumo = {
  total_atendimentos: 0,
  valor_total: 0,
  ticket_medio: 0,
  faltas: 0,
  cancelamentos: 0,
  total_registros: 0,
};

const FILTROS_INICIAIS: HistoricoFiltros = {
  dataInicio: subDays(new Date(), 29),
  dataFim: new Date(),
  status: [StatusAgendamento.ATENDIDO, StatusAgendamento.FALTOU, StatusAgendamento.CANCELADO],
  profissionalId: null,
  pacienteBusca: "",
  convenioId: null,
  procedimentoId: null,
  filialId: null,
};

function HistoricoContent() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [exportandoCSV, setExportandoCSV] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);
  const [glosaAgendamento, setGlosaAgendamento] = useState<AgendamentoParaGlosa | null>(null);
  const [dados, setDados] = useState<AtendimentoHistorico[]>([]);
  const [total, setTotal] = useState(0);
  const [resumo, setResumo] = useState<HistoricoResumo>(RESUMO_VAZIO);
  const [periodo, setPeriodo] = useState({ inicio: "", fim: "" });
  const [page, setPage] = useState(1);
  const [filtrosAtivos, setFiltrosAtivos] = useState<HistoricoFiltros>(FILTROS_INICIAIS);

  // Listas para os filtros
  const [profissionais, setProfissionais] = useState<Array<{ id: string; nome: string }>>([]);
  const [convenios, setConvenios] = useState<Array<{ id: string; nome: string }>>([]);
  const [procedimentos, setProcedimentos] = useState<Array<{ id: string; nome: string; codigo: string | null }>>([]);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Histórico de Atendimentos" },
  ];

  const headers = useCallback(() => ({
    "X-User-Data": btoa(JSON.stringify(user)),
    "X-Auth-Token": user!.token,
  }), [user]);

  // Carregar listas de filtro
  useEffect(() => {
    if (!user) return;
    const h = headers();
    Promise.all([
      fetch("/api/terapeutas", { headers: h }).then((r) => r.json()),
      fetch("/api/convenios", { headers: h }).then((r) => r.json()),
      fetch("/api/procedimentos?ativo=true&limit=200", { headers: h }).then((r) => r.json()),
    ]).then(([profs, convs, procs]) => {
      if (Array.isArray(profs)) {
        setProfissionais(profs.map((p: { id: string; name: string }) => ({ id: p.id, nome: p.name })));
      }
      if (Array.isArray(convs)) {
        setConvenios(convs.map((c: { id: string; razao_social: string; nome_fantasia: string | null }) => ({
          id: c.id,
          nome: c.nome_fantasia || c.razao_social,
        })));
      }
      if (convs?.data) {
        setConvenios((convs.data as Array<{ id: string; razao_social: string; nome_fantasia: string | null }>).map((c) => ({
          id: c.id, nome: c.nome_fantasia || c.razao_social,
        })));
      }
      if (procs?.data) {
        setProcedimentos((procs.data as Array<{ id: string; nome: string; codigo: string | null }>).map((p) => ({
          id: p.id, nome: p.nome, codigo: p.codigo ?? null,
        })));
      }
    }).catch(() => {});
  }, [user, headers]);

  const buildParams = useCallback((filtros: HistoricoFiltros, pg: number) => {
    const p = new URLSearchParams({
      dataInicio: startOfDay(filtros.dataInicio).toISOString(),
      dataFim: endOfDay(filtros.dataFim).toISOString(),
      status: filtros.status.join(","),
      page: String(pg),
      pageSize: "50",
    });
    if (filtros.profissionalId) p.set("profissionalId", filtros.profissionalId);
    if (filtros.pacienteBusca) p.set("busca", filtros.pacienteBusca);
    if (filtros.convenioId) p.set("convenioId", filtros.convenioId);
    if (filtros.procedimentoId) p.set("procedimentoId", filtros.procedimentoId);
    if (filtros.filialId) p.set("filialId", filtros.filialId);
    return p;
  }, []);

  const buscar = useCallback(async (filtros: HistoricoFiltros, pg: number) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/relatorios/historico-atendimentos?${buildParams(filtros, pg)}`,
        { headers: headers() }
      );
      const d: HistoricoResponse = await res.json();
      if (!res.ok || !d.success) throw new Error("Erro ao carregar histórico");
      setDados(d.data);
      setTotal(d.total);
      setResumo(d.resumo);
      setPeriodo(d.periodo);
    } catch {
      toast({ title: "Erro ao carregar histórico", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, headers, buildParams, toast]);

  const handleFiltrar = (filtros: HistoricoFiltros) => {
    setFiltrosAtivos(filtros);
    setPage(1);
    buscar(filtros, 1);
  };

  const handlePage = (pg: number) => {
    setPage(pg);
    buscar(filtrosAtivos, pg);
  };

  // Carga inicial
  useEffect(() => {
    if (user) buscar(FILTROS_INICIAIS, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Exportar todos os registros (sem paginação)
  const fetchTodos = useCallback(async (): Promise<{ data: AtendimentoHistorico[]; periodo: { inicio: string; fim: string }; resumo: HistoricoResumo } | null> => {
    if (!user) return null;
    const p = buildParams(filtrosAtivos, 1);
    p.set("pageSize", "200");
    p.set("page", "1");
    const res = await fetch(`/api/relatorios/historico-atendimentos?${p}`, { headers: headers() });
    const d: HistoricoResponse = await res.json();
    if (!d.success) return null;
    // Se há mais páginas, buscar o restante
    if (d.total > 200) {
      const extra: AtendimentoHistorico[] = [...d.data];
      for (let pg = 2; pg <= Math.ceil(d.total / 200); pg++) {
        const p2 = buildParams(filtrosAtivos, pg);
        p2.set("pageSize", "200");
        const r2 = await fetch(`/api/relatorios/historico-atendimentos?${p2}`, { headers: headers() });
        const d2: HistoricoResponse = await r2.json();
        if (d2.success) extra.push(...d2.data);
      }
      return { data: extra, periodo: d.periodo, resumo: d.resumo };
    }
    return { data: d.data, periodo: d.periodo, resumo: d.resumo };
  }, [user, headers, buildParams, filtrosAtivos]);

  const handleExportCSV = async () => {
    setExportandoCSV(true);
    try {
      const resultado = await fetchTodos();
      if (!resultado) throw new Error("Sem dados");
      const { exportarCSV } = await import("@/lib/export-historico");
      exportarCSV(resultado.data, resultado.periodo);
    } catch {
      toast({ title: "Erro ao exportar CSV", variant: "destructive" });
    } finally {
      setExportandoCSV(false);
    }
  };

  const handleExportPDF = async () => {
    setExportandoPDF(true);
    try {
      const resultado = await fetchTodos();
      if (!resultado) throw new Error("Sem dados");
      const { exportarPDF } = await import("@/lib/export-historico");
      await exportarPDF(resultado.data, resultado.periodo, resultado.resumo);
    } catch {
      toast({ title: "Erro ao exportar PDF", variant: "destructive" });
    } finally {
      setExportandoPDF(false);
    }
  };

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Histórico de Atendimentos</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Registro completo de atendimentos realizados, faltas e cancelamentos com dados financeiros.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline" size="sm" className="gap-2"
              onClick={handleExportCSV}
              disabled={exportandoCSV || total === 0}
            >
              <FileDown className="h-4 w-4" />
              {exportandoCSV ? "Exportando..." : "CSV"}
            </Button>
            <Button
              variant="outline" size="sm" className="gap-2"
              onClick={handleExportPDF}
              disabled={exportandoPDF || total === 0}
            >
              <FileText className="h-4 w-4" />
              {exportandoPDF ? "Gerando PDF..." : "PDF"}
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <FiltrosHistorico
          profissionais={profissionais}
          convenios={convenios}
          procedimentos={procedimentos}
          isAdmin={isAdmin ?? false}
          onFiltrar={handleFiltrar}
          loading={loading}
        />

        {/* KPI cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : (
          <ResumoHistorico resumo={resumo} />
        )}

        {/* Tabela */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Registros
            </h2>
            {!loading && total > 0 && (
              <span className="text-xs text-muted-foreground">{total} registro(s) encontrado(s)</span>
            )}
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded" />
              ))}
            </div>
          ) : (
            <TabelaHistorico
              linhas={dados}
              total={total}
              page={page}
              pageSize={50}
              onPage={handlePage}
              onRegistrarGlosa={(l) =>
                setGlosaAgendamento({
                  id: l.id,
                  data_hora: l.data_hora,
                  pacienteNome: l.paciente.nome,
                  profissionalNome: l.profissional?.nome ?? null,
                  procedimentoNome: l.procedimento?.nome ?? null,
                  convenioNome: l.convenio?.nome ?? null,
                  valorSugerido: l.valor ?? null,
                })
              }
            />
          )}
        </div>
      </div>

      {/* Dialog de glosa acionado pelo atalho */}
      <RegistrarGlosaDialog
        open={glosaAgendamento !== null}
        onOpenChange={(o) => { if (!o) setGlosaAgendamento(null); }}
        agendamento={glosaAgendamento}
        onSuccess={() => setGlosaAgendamento(null)}
      />
    </MainLayout>
  );
}

export default function HistoricoAtendimentosPage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: "relatorios", action: "VIEW" }}>
      <HistoricoContent />
    </ProtectedRoute>
  );
}
