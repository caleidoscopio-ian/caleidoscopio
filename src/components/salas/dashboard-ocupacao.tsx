'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, TrendingUp, Building2, Clock, CalendarCheck } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from 'recharts'
import {
  subDays,
  startOfMonth,
  endOfMonth,
  format,
  eachDayOfInterval,
  isSameDay,
  parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { SalaOcupacao } from '@/types/ocupacao-sala'

type Periodo = '7d' | '30d' | 'mes'

const HORAS_UTEIS = (21 - 7) * 60  // 840 min por dia

interface KPI {
  totalAtendimentos: number
  salaMaisUsada: string | null
  taxaOcupacaoMedia: number
  horarioPico: string | null
}

function calcKPIs(salas: SalaOcupacao[], dias: number): KPI {
  const ags = salas.flatMap((s) => s.agendamentos)
  const totalAtendimentos = ags.length

  // Sala mais usada
  const contPorSala = salas.map((s) => ({ nome: s.nome, count: s.agendamentos.length }))
  const salaMaisUsada = contPorSala.sort((a, b) => b.count - a.count)[0]?.nome ?? null

  // Taxa de ocupação: (minutos ocupados / minutos úteis totais) × 100
  const minOcupados = salas.reduce((acc, sala) => {
    const min = sala.agendamentos.reduce((a, ag) => {
      const dur = (new Date(ag.horario_fim).getTime() - new Date(ag.data_hora).getTime()) / 60000
      return a + Math.min(dur, HORAS_UTEIS)
    }, 0)
    return acc + min
  }, 0)
  const minUteisTotais = salas.length * dias * HORAS_UTEIS
  const taxaOcupacaoMedia = minUteisTotais > 0 ? (minOcupados / minUteisTotais) * 100 : 0

  // Horário de pico (hora com mais agendamentos)
  const contPorHora: Record<number, number> = {}
  for (const ag of ags) {
    const h = new Date(ag.data_hora).getHours()
    contPorHora[h] = (contPorHora[h] ?? 0) + 1
  }
  const horaPickEntry = Object.entries(contPorHora).sort((a, b) => Number(b[1]) - Number(a[1]))[0]
  const horarioPico = horaPickEntry ? `${horaPickEntry[0]}:00` : null

  return { totalAtendimentos, salaMaisUsada, taxaOcupacaoMedia, horarioPico }
}

interface DashboardOcupacaoProps {
  filialId?: string | null
}

export function DashboardOcupacao({ filialId }: DashboardOcupacaoProps) {
  const { user } = useAuth()
  const [periodo, setPeriodo] = useState<Periodo>('30d')
  const [salas, setSalas] = useState<SalaOcupacao[]>([])
  const [loading, setLoading] = useState(false)

  const getRange = useCallback((): { inicio: Date; fim: Date; dias: number } => {
    const hoje = new Date()
    hoje.setHours(23, 59, 59, 999)
    if (periodo === '7d') {
      const ini = subDays(new Date(), 6); ini.setHours(0, 0, 0, 0)
      return { inicio: ini, fim: hoje, dias: 7 }
    }
    if (periodo === '30d') {
      const ini = subDays(new Date(), 29); ini.setHours(0, 0, 0, 0)
      return { inicio: ini, fim: hoje, dias: 30 }
    }
    // mes
    const ini = startOfMonth(new Date()); ini.setHours(0, 0, 0, 0)
    const fi = endOfMonth(new Date()); fi.setHours(23, 59, 59, 999)
    const dias = Math.ceil((fi.getTime() - ini.getTime()) / 86400000)
    return { inicio: ini, fim: fi, dias }
  }, [periodo])

  const fetchOcupacao = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { inicio, fim } = getRange()
      const params = new URLSearchParams({
        dataInicio: inicio.toISOString(),
        dataFim: fim.toISOString(),
        ...(filialId ? { filialId } : {}),
      })
      const r = await fetch(`/api/salas/ocupacao?${params}`, {
        headers: {
          'X-User-Data': btoa(JSON.stringify(user)),
          'X-Auth-Token': user.token,
        },
      })
      const d = await r.json()
      if (d.success) setSalas(d.data)
    } catch {
      /* silencioso */
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filialId, getRange])

  useEffect(() => { fetchOcupacao() }, [fetchOcupacao])

  const { inicio, fim, dias } = getRange()
  const kpis = calcKPIs(salas, dias)

  // Dados para gráfico de barras: atendimentos por sala
  const dadosPorSala = salas
    .map((s) => ({ nome: s.nome.length > 14 ? s.nome.slice(0, 13) + '…' : s.nome, total: s.agendamentos.length, cor: s.cor }))
    .sort((a, b) => b.total - a.total)

  // Dados para linha: atendimentos por dia
  const diasRange = eachDayOfInterval({ start: inicio, end: fim })
  const dadosPorDia = diasRange.map((dia) => {
    const total = salas.flatMap((s) => s.agendamentos).filter((ag) =>
      isSameDay(parseISO(ag.data_hora), dia)
    ).length
    return {
      dia: format(dia, 'dd/MM', { locale: ptBR }),
      total,
    }
  })

  // Dados para gráfico de horas
  const dadosPorHora = Array.from({ length: 14 }, (_, i) => {
    const hora = 7 + i
    const total = salas.flatMap((s) => s.agendamentos).filter((ag) =>
      new Date(ag.data_hora).getHours() === hora
    ).length
    return { hora: `${String(hora).padStart(2, '0')}:00`, total }
  })

  const PERIODOS = [
    { key: '7d' as Periodo, label: 'Últimos 7 dias' },
    { key: '30d' as Periodo, label: 'Últimos 30 dias' },
    { key: 'mes' as Periodo, label: 'Mês atual' },
  ]

  return (
    <div className="space-y-6">
      {/* Seletor de período */}
      <div className="flex items-center gap-2 flex-wrap">
        {PERIODOS.map((p) => (
          <Button
            key={p.key}
            variant={periodo === p.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriodo(p.key)}
          >
            {p.label}
          </Button>
        ))}
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <CalendarCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Total atendimentos</p>
                <p className="text-2xl font-bold">{kpis.totalAtendimentos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Taxa de ocupação</p>
                <p className="text-2xl font-bold">
                  {kpis.taxaOcupacaoMedia.toFixed(1)}
                  <span className="text-sm font-normal text-muted-foreground">%</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Sala mais usada</p>
                <p className="text-sm font-semibold truncate max-w-[140px]">
                  {kpis.salaMaisUsada ?? '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Horário de pico</p>
                <p className="text-2xl font-bold">{kpis.horarioPico ?? '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {kpis.totalAtendimentos === 0 && !loading && (
        <div className="py-16 text-center text-muted-foreground border rounded-lg">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum dado para o período selecionado</p>
        </div>
      )}

      {kpis.totalAtendimentos > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Atendimentos por sala */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Atendimentos por sala</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dadosPorSala} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nome" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v) => [v, 'Atendimentos']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {dadosPorSala.map((entry, idx) => (
                      <Cell key={idx} fill={entry.cor ?? '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Atendimentos por dia */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Atendimentos por dia</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dadosPorDia} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dia"
                    tick={{ fontSize: 10 }}
                    interval={periodo === '30d' ? 4 : 0}
                    angle={-30}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(v) => [v, 'Atendimentos']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Distribuição por hora do dia */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Distribuição por horário{' '}
                <span className="font-normal text-muted-foreground">(horas do dia)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={dadosPorHora} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="hora" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(v) => [v, 'Atendimentos']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]}>
                    {dadosPorHora.map((entry, idx) => {
                      const isPico =
                        kpis.horarioPico != null &&
                        entry.hora === kpis.horarioPico
                      return <Cell key={idx} fill={isPico ? '#f59e0b' : '#10b981'} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {kpis.horarioPico && (
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="inline-block w-2 h-2 rounded-sm bg-amber-400 mr-1" />
                  Horário de pico: {kpis.horarioPico}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
