'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameDay,
  isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { SalaOcupacao, AgendamentoOcupacao } from '@/types/ocupacao-sala'
import { STATUS_COR } from '@/types/ocupacao-sala'
import { cn } from '@/lib/utils'

function formatHora(iso: string) {
  return format(new Date(iso), 'HH:mm')
}

function AgCard({ ag }: { ag: AgendamentoOcupacao }) {
  const cor = ag.procedimento?.cor ?? STATUS_COR[ag.status]
  return (
    <div
      className="rounded px-2 py-1.5 text-xs space-y-0.5 border-l-2"
      style={{ borderColor: cor, backgroundColor: cor + '18' }}
    >
      <p className="font-semibold" style={{ color: cor }}>
        {formatHora(ag.data_hora)}–{formatHora(ag.horario_fim)}
      </p>
      {ag.paciente && (
        <p className="truncate text-foreground/80">{ag.paciente.nome}</p>
      )}
      {ag.profissional && (
        <p className="truncate text-muted-foreground">{ag.profissional.nome}</p>
      )}
    </div>
  )
}

interface DiaColuna {
  dia: Date
  salaGroups: Array<{
    sala: { id: string; nome: string; cor: string | null }
    ags: AgendamentoOcupacao[]
  }>
}

interface MapaSemanalProps {
  filialId?: string | null
}

export function MapaSemanal({ filialId }: MapaSemanalProps) {
  const { user } = useAuth()
  const [semanaRef, setSemanaRef] = useState(new Date())
  const [salas, setSalas] = useState<SalaOcupacao[]>([])
  const [loading, setLoading] = useState(false)

  const inicio = startOfWeek(semanaRef, { weekStartsOn: 1 }) // segunda
  const fim = endOfWeek(semanaRef, { weekStartsOn: 1 })       // domingo
  const dias = eachDayOfInterval({ start: inicio, end: fim })

  const fetchOcupacao = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const ini = new Date(inicio); ini.setHours(0, 0, 0, 0)
      const fi = new Date(fim); fi.setHours(23, 59, 59, 999)

      const params = new URLSearchParams({
        dataInicio: ini.toISOString(),
        dataFim: fi.toISOString(),
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
  }, [user, semanaRef, filialId])

  useEffect(() => { fetchOcupacao() }, [fetchOcupacao])

  // Montar estrutura por dia
  const colunas: DiaColuna[] = dias.map((dia) => {
    const salaGroups = salas
      .map((sala) => ({
        sala: { id: sala.id, nome: sala.nome, cor: sala.cor },
        ags: sala.agendamentos.filter((ag) => isSameDay(new Date(ag.data_hora), dia)),
      }))
      .filter((g) => g.ags.length > 0)
    return { dia, salaGroups }
  })

  const totalSemana = salas.reduce((acc, s) => acc + s.agendamentos.length, 0)

  return (
    <div className="space-y-4">
      {/* Navegação de semana */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setSemanaRef(d => subWeeks(d, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setSemanaRef(d => addWeeks(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="font-medium">
          {format(inicio, "dd 'de' MMM", { locale: ptBR })} –{' '}
          {format(fim, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setSemanaRef(new Date())}>
          Esta semana
        </Button>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {!loading && totalSemana > 0 && (
          <Badge variant="secondary">{totalSemana} atendimentos</Badge>
        )}
      </div>

      {/* Grid de dias */}
      <div className="grid grid-cols-7 gap-2 min-w-max">
        {colunas.map(({ dia, salaGroups }) => {
          const hoje = isToday(dia)
          return (
            <div
              key={dia.toISOString()}
              className={cn(
                'min-w-40 rounded-lg border flex flex-col',
                hoje && 'border-primary/50 bg-primary/5',
              )}
            >
              {/* Header do dia */}
              <div
                className={cn(
                  'px-3 py-2 border-b text-center',
                  hoje && 'bg-primary/10 rounded-t-lg',
                )}
              >
                <p className={cn('text-xs font-semibold uppercase tracking-wide',
                  hoje ? 'text-primary' : 'text-muted-foreground')}>
                  {format(dia, 'EEE', { locale: ptBR })}
                </p>
                <p className={cn('text-xl font-bold', hoje && 'text-primary')}>
                  {format(dia, 'dd')}
                </p>
                {salaGroups.length > 0 && (
                  <Badge variant="secondary" className="text-xs mt-0.5">
                    {salaGroups.reduce((a, g) => a + g.ags.length, 0)}
                  </Badge>
                )}
              </div>

              {/* Cards */}
              <div className="p-2 space-y-3 flex-1">
                {salaGroups.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-4">Livre</p>
                ) : (
                  salaGroups.map(({ sala, ags }) => (
                    <div key={sala.id}>
                      <div className="flex items-center gap-1.5 mb-1">
                        {sala.cor && (
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sala.cor }} />
                        )}
                        <span className="text-xs font-medium truncate">{sala.nome}</span>
                      </div>
                      <div className="space-y-1">
                        {ags.map((ag) => <AgCard key={ag.id} ag={ag} />)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
