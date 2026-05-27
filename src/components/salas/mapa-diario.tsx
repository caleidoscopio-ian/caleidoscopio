'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, CalendarDays, Loader2 } from 'lucide-react'
import { format, addDays, subDays, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { SalaOcupacao, AgendamentoOcupacao } from '@/types/ocupacao-sala'
import { STATUS_LABEL, STATUS_COR } from '@/types/ocupacao-sala'

const HORA_INICIO = 7   // 07:00
const HORA_FIM = 21     // 21:00
const TOTAL_MIN = (HORA_FIM - HORA_INICIO) * 60  // 840 min
const PX_POR_MIN = 1.2  // 1.2px por minuto → 1008px total
const ALTURA_TOTAL = TOTAL_MIN * PX_POR_MIN

function minutosDoInicio(isoDate: string): number {
  const d = new Date(isoDate)
  return (d.getHours() - HORA_INICIO) * 60 + d.getMinutes()
}

function formatHora(iso: string) {
  return format(new Date(iso), 'HH:mm')
}

function AppointmentBlock({ ag }: { ag: AgendamentoOcupacao }) {
  const [tooltip, setTooltip] = useState(false)
  const startMin = Math.max(0, minutosDoInicio(ag.data_hora))
  const endMin = Math.min(TOTAL_MIN, minutosDoInicio(ag.horario_fim))
  const durMin = Math.max(endMin - startMin, 15) // mínimo 15min visível

  const top = startMin * PX_POR_MIN
  const height = durMin * PX_POR_MIN

  const cor = ag.procedimento?.cor ?? STATUS_COR[ag.status]
  const isSmall = height < 36

  return (
    <div
      className="absolute left-1 right-1 rounded cursor-pointer select-none group z-10"
      style={{ top, height, backgroundColor: cor + '22', borderLeft: `3px solid ${cor}` }}
      onMouseEnter={() => setTooltip(true)}
      onMouseLeave={() => setTooltip(false)}
    >
      {!isSmall && (
        <div className="px-1.5 py-0.5 overflow-hidden h-full">
          <p className="text-[11px] font-semibold leading-tight truncate" style={{ color: cor }}>
            {formatHora(ag.data_hora)}–{formatHora(ag.horario_fim)}
          </p>
          {height > 50 && (
            <p className="text-[10px] leading-tight truncate text-foreground/70">
              {ag.paciente?.nome ?? '—'}
            </p>
          )}
        </div>
      )}

      {tooltip && (
        <div className="absolute z-50 left-full ml-2 top-0 min-w-52 max-w-72 rounded-lg border bg-popover text-popover-foreground shadow-lg p-3 text-xs space-y-1.5 pointer-events-none">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: cor }}
            />
            <span className="font-semibold">{STATUS_LABEL[ag.status]}</span>
          </div>
          <p className="font-medium">{formatHora(ag.data_hora)} – {formatHora(ag.horario_fim)}</p>
          {ag.paciente && <p>👤 {ag.paciente.nome}</p>}
          {ag.profissional && <p>🩺 {ag.profissional.nome}</p>}
          {ag.procedimento && <p>📋 {ag.procedimento.nome}</p>}
        </div>
      )}
    </div>
  )
}

interface MapaDiarioProps {
  filialId?: string | null
}

export function MapaDiario({ filialId }: MapaDiarioProps) {
  const { user } = useAuth()
  const [data, setData] = useState(new Date())
  const [salas, setSalas] = useState<SalaOcupacao[]>([])
  const [loading, setLoading] = useState(false)
  const agora = new Date()
  const minutosAgora =
    isToday(data) ? (agora.getHours() - HORA_INICIO) * 60 + agora.getMinutes() : null

  const fetchOcupacao = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const inicio = new Date(data)
      inicio.setHours(0, 0, 0, 0)
      const fim = new Date(data)
      fim.setHours(23, 59, 59, 999)

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
  }, [user, data, filialId])

  useEffect(() => { fetchOcupacao() }, [fetchOcupacao])

  const horas = Array.from({ length: HORA_FIM - HORA_INICIO + 1 }, (_, i) => HORA_INICIO + i)

  return (
    <div className="space-y-4">
      {/* Navegação de data */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setData(d => subDays(d, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setData(d => addDays(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium capitalize">
            {format(data, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </span>
          {isToday(data) && <Badge variant="secondary" className="text-xs">Hoje</Badge>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setData(new Date())}>
          Hoje
        </Button>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {salas.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border rounded-lg">
          <CalendarDays className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-medium">Nenhum agendamento para este dia</p>
          <p className="text-sm">Selecione outro dia ou verifique os filtros</p>
        </div>
      )}

      {salas.length > 0 && (
        <div className="rounded-lg border overflow-auto">
          <div className="flex min-w-max">
            {/* Eixo Y — horas */}
            <div className="sticky left-0 z-20 bg-background border-r w-16 shrink-0">
              <div className="h-10 border-b" /> {/* Espaço para header das salas */}
              <div className="relative" style={{ height: ALTURA_TOTAL }}>
                {horas.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full flex items-center justify-end pr-2"
                    style={{ top: (h - HORA_INICIO) * 60 * PX_POR_MIN - 8 }}
                  >
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {String(h).padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Colunas das salas */}
            {salas.map((sala) => (
              <div key={sala.id} className="border-r last:border-r-0 min-w-44 w-52 shrink-0">
                {/* Header da sala */}
                <div
                  className="h-10 border-b flex items-center px-3 gap-2 sticky top-0 z-10 bg-background"
                >
                  {sala.cor && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: sala.cor }}
                    />
                  )}
                  <span className="text-sm font-medium truncate">{sala.nome}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    ({sala.agendamentos.length})
                  </span>
                </div>

                {/* Área de timeline */}
                <div className="relative" style={{ height: ALTURA_TOTAL }}>
                  {/* Linhas de hora */}
                  {horas.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-dashed border-border/40"
                      style={{ top: (h - HORA_INICIO) * 60 * PX_POR_MIN }}
                    />
                  ))}

                  {/* Linha "agora" */}
                  {minutosAgora !== null && minutosAgora >= 0 && minutosAgora <= TOTAL_MIN && (
                    <div
                      className="absolute left-0 right-0 z-20 border-t-2 border-red-500"
                      style={{ top: minutosAgora * PX_POR_MIN }}
                    >
                      <span className="absolute -top-2 left-1 text-[10px] text-red-500 font-bold bg-background px-0.5">
                        {format(agora, 'HH:mm')}
                      </span>
                    </div>
                  )}

                  {/* Blocos de agendamento */}
                  {sala.agendamentos.map((ag) => (
                    <AppointmentBlock key={ag.id} ag={ag} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
