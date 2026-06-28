"use client";

import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/main-layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDown, FileText, Plus, LayoutDashboard, List, FileUp } from "lucide-react";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { DashboardGlosas } from "@/components/glosas/dashboard-glosas";
import { FiltrosGlosas } from "@/components/glosas/filtros-glosas";
import { TabelaGlosas } from "@/components/glosas/tabela-glosas";
import { RegistrarGlosaDialog } from "@/components/glosas/registrar-glosa-dialog";
import { GlosaDetalheDialog } from "@/components/glosas/glosa-detalhe-dialog";
import { UploadDemonstrativo } from "@/components/glosas/upload-demonstrativo";
import { ListaDemonstrativos } from "@/components/glosas/lista-demonstrativos";
import { ComparativoConciliacaoView } from "@/components/glosas/comparativo-conciliacao";
import { ConciliacaoDetalhe } from "@/components/glosas/conciliacao-detalhe";
import type {
  Glosa, GlosaListResponse, GlosaDashboard, GlosaFiltros, GlosaResumo, StatusGlosa,
} from "@/types/glosa";
import type { DemonstrativoResumo, ComparativoConciliacao } from "@/types/conciliacao";

const TODOS_STATUS: StatusGlosa[] = ["PENDENTE", "EM_RECURSO", "RECUPERADA", "PARCIAL", "NEGADA", "ACATADA"];

const FILTROS_INICIAIS: GlosaFiltros = {
  dataInicio: subDays(new Date(), 89),
  dataFim: new Date(),
  status: TODOS_STATUS,
  categoria: null,
  convenioId: null,
  pacienteBusca: "",
};

const RESUMO_VAZIO: GlosaResumo = {
  total_glosas: 0, valor_glosado_total: 0, valor_recuperado_total: 0,
  valor_em_recurso: 0, pendentes: 0, taxa_recuperacao: 0, taxa_glosa: 0,
};

const DASHBOARD_VAZIO: GlosaDashboard = {
  resumo: RESUMO_VAZIO,
  por_categoria: [], por_convenio: [], por_status: [], evolucao_mensal: [],
};

function GlosasContent() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [glosas, setGlosas] = useState<Glosa[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [resumo, setResumo] = useState<GlosaResumo>(RESUMO_VAZIO);
  const [dashboard, setDashboard] = useState<GlosaDashboard>(DASHBOARD_VAZIO);
  const [filtrosAtivos, setFiltrosAtivos] = useState<GlosaFiltros>({ ...FILTROS_INICIAIS, status: TODOS_STATUS });

  const [convenios, setConvenios] = useState<Array<{ id: string; nome: string }>>([]);
  const [registrarOpen, setRegistrarOpen] = useState(false);
  const [detalheId, setDetalheId] = useState<string | null>(null);

  // Conciliação
  const [demonstrativos, setDemonstrativos] = useState<DemonstrativoResumo[]>([]);
  const [comparativo, setComparativo] = useState<ComparativoConciliacao | null>(null);
  const [demonstrativoDetalheId, setDemonstrativoDetalheId] = useState<string | null>(null);
  const [exportandoCSV, setExportandoCSV] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Atendimentos Glosados" },
  ];

  const h = useCallback(() => ({
    "X-User-Data": btoa(JSON.stringify(user)),
    "X-Auth-Token": user!.token,
  }), [user]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/convenios", { headers: h() })
      .then((r) => r.json())
      .then((d) => {
        const data = Array.isArray(d) ? d : (d.data ?? []);
        setConvenios(data.map((c: { id: string; razao_social: string; nome_fantasia?: string | null }) => ({
          id: c.id, nome: c.nome_fantasia || c.razao_social,
        })));
      })
      .catch(() => {});
  }, [user, h]);

  const buildParams = useCallback((filtros: GlosaFiltros, pg: number) => {
    const p = new URLSearchParams({
      dataInicio: startOfDay(filtros.dataInicio).toISOString(),
      dataFim: endOfDay(filtros.dataFim).toISOString(),
      page: String(pg),
      pageSize: "50",
    });
    if (filtros.status.length > 0) p.set("status", filtros.status.join(","));
    if (filtros.categoria) p.set("categoria", filtros.categoria);
    if (filtros.convenioId) p.set("convenioId", filtros.convenioId);
    if (filtros.pacienteBusca) p.set("busca", filtros.pacienteBusca);
    return p;
  }, []);

  const buscar = useCallback(async (filtros: GlosaFiltros, pg: number) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/glosas?${buildParams(filtros, pg)}`, { headers: h() });
      const d: GlosaListResponse = await res.json();
      if (!d.success) throw new Error("Erro");
      setGlosas(d.data);
      setTotal(d.total);
      setResumo(d.resumo);
    } catch { toast({ title: "Erro ao carregar glosas", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [user, h, buildParams, toast]);

  const buscarDashboard = useCallback(async (filtros: GlosaFiltros) => {
    if (!user) return;
    setDashboardLoading(true);
    try {
      const p = new URLSearchParams({
        dataInicio: startOfDay(filtros.dataInicio).toISOString(),
        dataFim: endOfDay(filtros.dataFim).toISOString(),
      });
      const res = await fetch(`/api/glosas/dashboard?${p}`, { headers: h() });
      const d = await res.json();
      if (d.success) {
        setDashboard({ ...d.data, resumo: { ...d.data.resumo, taxa_glosa: resumo.taxa_glosa } });
      }
    } catch { } finally { setDashboardLoading(false); }
  }, [user, h, resumo.taxa_glosa]);

  const handleFiltrar = (filtros: GlosaFiltros) => {
    setFiltrosAtivos(filtros);
    setPage(1);
    buscar(filtros, 1);
    buscarDashboard(filtros);
  };

  useEffect(() => {
    if (user) {
      const f = { ...FILTROS_INICIAIS, status: TODOS_STATUS };
      setFiltrosAtivos(f);
      buscar(f, 1);
      buscarDashboard(f);
      carregarConciliacao();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handlePage = (pg: number) => { setPage(pg); buscar(filtrosAtivos, pg); };

  const carregarConciliacao = useCallback(async () => {
    if (!user) return;
    try {
      const [dRes, cRes] = await Promise.all([
        fetch("/api/glosas/demonstrativos", { headers: h() }),
        fetch("/api/glosas/conciliacao", { headers: h() }),
      ]);
      const dData = await dRes.json();
      const cData = await cRes.json();
      if (dData.success) setDemonstrativos(dData.data);
      if (cData.success) setComparativo(cData.data);
    } catch { /* silencioso */ }
  }, [user, h]);

  const handleExcluirDemonstrativo = async (id: string) => {
    if (!confirm("Excluir este demonstrativo e suas guias conciliadas?") || !user) return;
    const res = await fetch(`/api/glosas/demonstrativos/${id}`, { method: "DELETE", headers: h() });
    if (res.ok) { toast({ title: "Demonstrativo excluído" }); carregarConciliacao(); }
    else toast({ title: "Erro ao excluir", variant: "destructive" });
  };

  const handleExcluir = async (id: string) => {
    if (!confirm("Excluir esta glosa?") || !user) return;
    const res = await fetch(`/api/glosas/${id}`, { method: "DELETE", headers: h() });
    if (res.ok) { toast({ title: "Glosa excluída" }); buscar(filtrosAtivos, page); }
    else toast({ title: "Erro ao excluir", variant: "destructive" });
  };

  const fetchTodas = async () => {
    const p = buildParams(filtrosAtivos, 1);
    p.set("pageSize", "200"); p.set("page", "1");
    const res = await fetch(`/api/glosas?${p}`, { headers: h() });
    const d: GlosaListResponse = await res.json();
    if (!d.success) throw new Error("Sem dados");
    const todas = [...d.data];
    if (d.total > 200) {
      for (let pg = 2; pg <= Math.ceil(d.total / 200); pg++) {
        const p2 = buildParams(filtrosAtivos, pg); p2.set("pageSize", "200");
        const r2 = await fetch(`/api/glosas?${p2}`, { headers: h() });
        const d2: GlosaListResponse = await r2.json();
        if (d2.success) todas.push(...d2.data);
      }
    }
    return { data: todas, periodo: d.periodo, resumo: d.resumo };
  };

  const handleExportCSV = async () => {
    setExportandoCSV(true);
    try {
      const r = await fetchTodas();
      const { exportarGlosasCSV } = await import("@/lib/export-glosas");
      exportarGlosasCSV(r.data, r.periodo);
    } catch { toast({ title: "Erro ao exportar CSV", variant: "destructive" }); }
    finally { setExportandoCSV(false); }
  };

  const handleExportPDF = async () => {
    setExportandoPDF(true);
    try {
      const r = await fetchTodas();
      const { exportarGlosasPDF } = await import("@/lib/export-glosas");
      await exportarGlosasPDF(r.data, r.periodo, r.resumo);
    } catch { toast({ title: "Erro ao exportar PDF", variant: "destructive" }); }
    finally { setExportandoPDF(false); }
  };

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Atendimentos Glosados</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Controle de glosas, processo de recurso e análise por convênio.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV} disabled={exportandoCSV || total === 0}>
              <FileDown className="h-4 w-4" />{exportandoCSV ? "Exportando..." : "CSV"}
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportPDF} disabled={exportandoPDF || total === 0}>
              <FileText className="h-4 w-4" />{exportandoPDF ? "Gerando..." : "PDF"}
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setRegistrarOpen(true)}>
              <Plus className="h-4 w-4" />Registrar Glosa
            </Button>
          </div>
        </div>

        <Tabs defaultValue="dashboard">
          <TabsList>
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />Visão Geral
            </TabsTrigger>
            <TabsTrigger value="lista" className="gap-2">
              <List className="h-4 w-4" />Detalhamento
            </TabsTrigger>
            <TabsTrigger value="conciliacao" className="gap-2">
              <FileUp className="h-4 w-4" />Conciliação
            </TabsTrigger>
          </TabsList>

          {/* Tab Dashboard */}
          <TabsContent value="dashboard" className="space-y-6 mt-4">
            {dashboardLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
              </div>
            ) : (
              <DashboardGlosas dashboard={{ ...dashboard, resumo: { ...dashboard.resumo, taxa_glosa: resumo.taxa_glosa } }} />
            )}
          </TabsContent>

          {/* Tab Lista */}
          <TabsContent value="lista" className="space-y-4 mt-4">
            <FiltrosGlosas convenios={convenios} onFiltrar={handleFiltrar} loading={loading} />

            {loading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
            ) : (
              <TabelaGlosas
                glosas={glosas}
                total={total}
                page={page}
                pageSize={50}
                onPage={handlePage}
                onDetalhe={(g) => setDetalheId(g.id)}
                onExcluir={handleExcluir}
              />
            )}
          </TabsContent>

          {/* Tab Conciliação */}
          <TabsContent value="conciliacao" className="space-y-6 mt-4">
            {comparativo && comparativo.total_demonstrativos > 0 && (
              <ComparativoConciliacaoView comparativo={comparativo} />
            )}
            <UploadDemonstrativo convenios={convenios} onImportado={carregarConciliacao} />
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Demonstrativos Importados
              </h2>
              <ListaDemonstrativos
                demonstrativos={demonstrativos}
                onDetalhe={(id) => setDemonstrativoDetalheId(id)}
                onExcluir={handleExcluirDemonstrativo}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <RegistrarGlosaDialog
        open={registrarOpen}
        onOpenChange={setRegistrarOpen}
        agendamento={null}
        onSuccess={() => buscar(filtrosAtivos, page)}
      />
      <GlosaDetalheDialog
        glosaId={detalheId}
        open={detalheId !== null}
        onOpenChange={(o) => { if (!o) setDetalheId(null); }}
        onAtualizada={() => buscar(filtrosAtivos, page)}
      />
      <ConciliacaoDetalhe
        demonstrativoId={demonstrativoDetalheId}
        open={demonstrativoDetalheId !== null}
        onOpenChange={(o) => { if (!o) setDemonstrativoDetalheId(null); }}
      />
    </MainLayout>
  );
}

export default function GlosasPage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: "convenios", action: "VIEW" }}>
      <GlosasContent />
    </ProtectedRoute>
  );
}
