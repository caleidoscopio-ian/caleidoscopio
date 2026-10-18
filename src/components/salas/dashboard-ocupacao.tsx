'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Building2, Clock, CalendarCheck } from 'lucide-react'
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
import { subDays, format, eachDayOfInterval, isSameDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { CapacidadeResposta, SalaOcupacao } from '@/types/ocupacao-sala'
import { CapacidadeSalas } from '@/components/salas/capacidade-salas'
import {
  FiltrosDashboardSalas,
  type FiltrosDashboardValues,
} from '@/components/salas/filtros-dashboard-salas'

interface KPI {
  totalAtendimentos: number
  salaMaisUsada: string | null
  horarioPico: string | null
}

function calcKPIs(salas: SalaOcupacao[]): KPI {
  const ags = salas.flatMap((s) => s.agendamentos)
  const totalAtendimentos = ags.length

  // Sala mais usada
  const contPorSala = salas.map((s) => ({ nome: s.nome, count: s.agendamentos.length }))
  const salaMaisUsada = contPorSala.sort((a, b) => b.count - a.count)[0]?.nome ?? null

  // A taxa de ocupação NÃO é calculada aqui. Ela vinha de um denominador
  // chutado — (21h − 7h) × todos os dias do período × nº de salas, ou seja
  // toda sala aberta 14h por dia, inclusive sábado e domingo — e por isso
  // subestimava qualquer clínica real. Agora vem de `/api/salas/capacidade`,
  // contra o horário de funcionamento cadastrado de cada sala.

  // Horário de pico (hora com mais agendamentos)
  const contPorHora: Record<number, number> = {}
  for (const ag of ags) {
    const h = new Date(ag.data_hora).getHours()
    contPorHora[h] = (contPorHora[h] ?? 0) + 1
  }
  const horaPickEntry = Object.entries(contPorHora).sort((a, b) => Number(b[1]) - Number(a[1]))[0]
  const horarioPico = horaPickEntry ? `${horaPickEntry[0]}:00` : null

  return { totalAtendimentos, salaMaisUsada, horarioPico }
}

interface DashboardOcupacaoProps {
  filialId?: string | null
}

export function DashboardOcupacao({ filialId }: DashboardOcupacaoProps) {
  const { user } = useAuth()
  const [salas, setSalas] = useState<SalaOcupacao[]>([])
  const [capacidade, setCapacidade] = useState<CapacidadeResposta | null>(null)
  const [loading, setLoading] = useState(false)
  // Começa nos últimos 30 dias, herdando a filial do seletor global da página.
  // Daí em diante os filtros daqui mandam — inclusive para trocar de filial.
  const [filtros, setFiltros] = useState<FiltrosDashboardValues>(() => ({
    inicio: subDays(new Date(), 29),
    fim: new Date(),
    filialId: filialId ?? null,
    salaId: null,
  }))

  const fetchOcupacao = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // O dia inteiro, nos limites locais: a API resolve o fuso da clínica
      const inicio = new Date(filtros.inicio); inicio.setHours(0, 0, 0, 0)
      const fim = new Date(filtros.fim); fim.setHours(23, 59, 59, 999)
      const params = new URLSearchParams({
        dataInicio: inicio.toISOString(),
        dataFim: fim.toISOString(),
        ...(filtros.filialId ? { filialId: filtros.filialId } : {}),
        ...(filtros.salaId ? { salaId: filtros.salaId } : {}),
      })
      const headers = {
        'X-User-Data': btoa(JSON.stringify(user)),
        'X-Auth-Token': user.token,
      }
      // Duas rotas: a de ocupação devolve os agendamentos (os gráficos de
      // volume precisam de cada um), a de capacidade devolve só os agregados.
      const [r, rc] = await Promise.all([
        fetch(`/api/salas/ocupacao?${params}`, { headers }),
        fetch(`/api/salas/capacidade?${params}`, { headers }),
      ])
      const d = await r.json()
      if (d.success) setSalas(d.data)
      const dc = (await rc.json()) as CapacidadeResposta
      setCapacidade(dc.success ? dc : null)
    } catch {
      /* silencioso */
    } finally {
      setLoading(false)
    }
  }, [user, filtros])

  useEffect(() => { fetchOcupacao() }, [fetchOcupacao])

  // A filial do seletor global da página passa a valer quando muda lá
  useEffect(() => {
    setFiltros((atual) =>
      (filialId ?? null) === atual.filialId ? atual : { ...atual, filialId: filialId ?? null, salaId: null }
    )
  }, [filialId])

  const inicio = filtros.inicio
  const fim = filtros.fim
  const kpis = calcKPIs(salas)
  const taxaCapacidade = capacidade ? capacidade.total.taxa_ocupacao * 100 : null

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

  const diasNoPeriodo = eachDayOfInterval({ start: inicio, end: fim }).length

  return (
    <div className="space-y-6">
      <FiltrosDashboardSalas valores={filtros} onFiltrar={setFiltros} loading={loading} />

      {/* Capacidade — o comparativo de gestão (Módulo 27) */}
      <CapacidadeSalas dados={capacidade} />

      {/* Volume — quantos atendimentos, onde e quando */}
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
                  {taxaCapacidade === null ? '—' : taxaCapacidade.toFixed(1)}
                  <span className="text-sm font-normal text-muted-foreground">%</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  sobre o horário das salas
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
                    interval={diasNoPeriodo > 10 ? Math.ceil(diasNoPeriodo / 8) : 0}
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
