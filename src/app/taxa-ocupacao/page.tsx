"use client"

import { useState, useEffect, useCallback } from "react"
import { MainLayout } from "@/components/main-layout"
import ProtectedRoute from "@/components/ProtectedRoute"
import { FiltrosOcupacao, type FiltrosOcupacaoValues } from "@/components/ocupacao-prof/filtros-ocupacao"
import { KpiCards } from "@/components/ocupacao-prof/kpi-cards"
import { TabelaOcupacao } from "@/components/ocupacao-prof/tabela-ocupacao"
import { GraficosOcupacao } from "@/components/ocupacao-prof/graficos-ocupacao"
import { GradeDialog } from "@/components/ocupacao-prof/grade-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { subDays, startOfDay, endOfDay } from "date-fns"
import type { OcupacaoResponse, OcupacaoProfissional, OcupacaoResumo } from "@/types/ocupacao-profissional"

const RESUMO_VAZIO: OcupacaoResumo = {
  taxa_media: 0,
  total_agendamentos: 0,
  horas_disponiveis: 0,
  horas_agendadas: 0,
  atendendo_agora: 0,
  profissionais_sem_grade: 0,
}

function TaxaOcupacaoContent() {
  const { user, isAdmin } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [profissionais, setProfissionais] = useState<OcupacaoProfissional[]>([])
  const [resumo, setResumo] = useState<OcupacaoResumo>(RESUMO_VAZIO)
  const [listaProfissionais, setListaProfissionais] = useState<Array<{ id: string; nome: string; especialidade: string }>>([])
  const [gradeDialog, setGradeDialog] = useState<{ id: string; nome: string } | null>(null)
  const [filtrosAtivos, setFiltrosAtivos] = useState<FiltrosOcupacaoValues>({
    dataInicio: subDays(new Date(), 29),
    dataFim: new Date(),
    profissionalId: null,
    filialId: null,
  })

  const breadcrumbs = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Taxa de Ocupação" },
  ]

  // Carregar lista de profissionais para o filtro
  useEffect(() => {
    if (!user) return
    fetch("/api/terapeutas", {
      headers: {
        "X-User-Data": btoa(JSON.stringify(user)),
        "X-Auth-Token": user.token,
      },
    })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setListaProfissionais(d.map((p: { id: string; name: string; specialty: string }) => ({
            id: p.id,
            nome: p.name,
            especialidade: p.specialty,
          })))
        }
      })
      .catch(() => {})
  }, [user])

  const buscarOcupacao = useCallback(async (filtros: FiltrosOcupacaoValues) => {
    if (!user) return
    setLoading(true)
    setFiltrosAtivos(filtros)
    try {
      // toISOString() converte o início/fim do dia LOCAL para o instante UTC correto,
      // evitando que agendamentos noturnos (cujo UTC vira o dia seguinte) fiquem fora do range.
      const params = new URLSearchParams({
        dataInicio: startOfDay(filtros.dataInicio).toISOString(),
        dataFim: endOfDay(filtros.dataFim).toISOString(),
      })
      if (filtros.profissionalId) params.set("profissionalId", filtros.profissionalId)
      if (filtros.filialId) params.set("filialId", filtros.filialId)

      const response = await fetch(`/api/relatorios/ocupacao-profissionais?${params}`, {
        headers: {
          "X-User-Data": btoa(JSON.stringify(user)),
          "X-Auth-Token": user.token,
        },
      })
      const data: OcupacaoResponse = await response.json()
      if (!response.ok || !data.success) throw new Error("Erro ao carregar dados")
      setProfissionais(data.profissionais)
      setResumo(data.resumo)
    } catch {
      toast({ title: "Erro ao carregar ocupação", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [user, toast])

  // Carga inicial
  useEffect(() => {
    if (user) buscarOcupacao(filtrosAtivos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Polling a cada 60s para indicadores em tempo real
  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      buscarOcupacao(filtrosAtivos)
    }, 60000)
    return () => clearInterval(interval)
  }, [user, buscarOcupacao, filtrosAtivos])

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Taxa de Ocupação</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão gerencial dos agendamentos por profissional — taxa de ocupação, absenteísmo e indicadores em tempo real.
          </p>
        </div>

        {/* Filtros */}
        <FiltrosOcupacao
          profissionais={listaProfissionais}
          isAdmin={isAdmin ?? false}
          onFiltrar={buscarOcupacao}
          loading={loading}
        />

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : (
          <KpiCards resumo={resumo} profissionais={profissionais} />
        )}

        {/* Tabela */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Profissionais
          </h2>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : (
            <TabelaOcupacao
              profissionais={profissionais}
              onConfigurarGrade={(id, nome) => setGradeDialog({ id, nome })}
            />
          )}
        </div>

        {/* Gráficos */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Gráficos
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-64 rounded-lg" />
              <Skeleton className="h-64 rounded-lg" />
            </div>
          ) : (
            <GraficosOcupacao profissionais={profissionais} />
          )}
        </div>
      </div>

      {/* Dialog de grade */}
      <GradeDialog
        profissionalId={gradeDialog?.id ?? null}
        profissionalNome={gradeDialog?.nome ?? ""}
        open={gradeDialog !== null}
        onOpenChange={(open) => { if (!open) setGradeDialog(null) }}
        onSaved={() => buscarOcupacao(filtrosAtivos)}
      />
    </MainLayout>
  )
}

export default function TaxaOcupacaoPage() {
  return (
    <ProtectedRoute requiredPermission={{ resource: "agenda", action: "VIEW" }}>
      <TaxaOcupacaoContent />
    </ProtectedRoute>
  )
}
