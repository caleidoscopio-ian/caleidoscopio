'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useFilialContext } from '@/contexts/filial-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, Building2, MapPin } from 'lucide-react'
import { format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { SalaOcupacao } from '@/types/ocupacao-sala'
import { cn } from '@/lib/utils'

interface FilialStats {
  id: string
  nome: string
  cor: string | null
  cidade?: string | null
  totalSalas: number
  salasComAgora: number
  taxaAtual: number // %
  proximosAtendimentos: Array<{
    salaId: string
    salaNome: string
    data_hora: string
    horario_fim: string
    paciente: string | null
    profissional: string | null
  }>
}

function taxaCor(taxa: number): string {
  if (taxa >= 85) return 'bg-red-500'
  if (taxa >= 60) return 'bg-amber-500'
  return 'bg-emerald-500'
}

interface MapaFiliaisProps {
  onFilialSelect?: (filialId: string | null) => void
  filialSelecionada?: string | null
}

export function MapaFiliais({ onFilialSelect, filialSelecionada }: MapaFiliaisProps) {
  const { user } = useAuth()
  const { filiais, isAdmin } = useFilialContext()
  const [salasData, setSalasData] = useState<SalaOcupacao[]>([])
  const [loading, setLoading] = useState(false)
  const agora = new Date()

  const fetchOcupacao = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const inicio = new Date(); inicio.setHours(0, 0, 0, 0)
      const fim = new Date(); fim.setHours(23, 59, 59, 999)
      const params = new URLSearchParams({
        dataInicio: inicio.toISOString(),
        dataFim: fim.toISOString(),
      })
      const r = await fetch(`/api/salas/ocupacao?${params}`, {
        headers: {
          'X-User-Data': btoa(JSON.stringify(user)),
          'X-Auth-Token': user.token,
        },
      })
      const d = await r.json()
      if (d.success) setSalasData(d.data)
    } catch {
      /* silencioso */
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchOcupacao() }, [fetchOcupacao])

  // Verificar se agendamento está ativo agora
  function isAtivoAgora(sala: SalaOcupacao): boolean {
    return sala.agendamentos.some((ag) => {
      const ini = new Date(ag.data_hora)
      const fi = new Date(ag.horario_fim)
      return ini <= agora && agora <= fi
    })
  }

  // Montar stats por filial
  const filialStats: FilialStats[] = (isAdmin ? filiais : []).map((filial) => {
    const salasFilial = salasData.filter((s) => s.filial?.id === filial.id)
    const totalSalas = salasFilial.length
    const salasComAgora = salasFilial.filter(isAtivoAgora).length
    const taxaAtual = totalSalas > 0 ? (salasComAgora / totalSalas) * 100 : 0

    // Próximos agendamentos (hoje, ainda não iniciados ou em andamento)
    const proximos = salasFilial
      .flatMap((s) =>
        s.agendamentos
          .filter((ag) => {
            const fi = new Date(ag.horario_fim)
            return fi >= agora && isSameDay(new Date(ag.data_hora), agora)
          })
          .map((ag) => ({
            salaId: s.id,
            salaNome: s.nome,
            data_hora: ag.data_hora,
            horario_fim: ag.horario_fim,
            paciente: ag.paciente?.nome ?? null,
            profissional: ag.profissional?.nome ?? null,
          }))
      )
      .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
      .slice(0, 4)

    return {
      id: filial.id,
      nome: filial.nome,
      cor: filial.cor ?? null,
      totalSalas,
      salasComAgora,
      taxaAtual,
      proximosAtendimentos: proximos,
    }
  })

  // Non-admin: mostrar apenas as salas dele, sem card de filial
  if (!isAdmin) {
    const totalSalas = salasData.length
    const salasAtivas = salasData.filter(isAtivoAgora).length
    const taxa = totalSalas > 0 ? (salasAtivas / totalSalas) * 100 : 0

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Ocupação atual da unidade</h3>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{salasAtivas} de {totalSalas} salas em uso</p>
              <Badge variant={salasAtivas > 0 ? 'default' : 'secondary'}>
                {taxa.toFixed(0)}% ocupado
              </Badge>
            </div>
            <Progress value={taxa} className={cn('h-2', taxaCor(taxa))} />
            <div className="grid grid-cols-2 gap-3">
              {salasData.map((sala) => {
                const ativa = isAtivoAgora(sala)
                return (
                  <div
                    key={sala.id}
                    className={cn(
                      'rounded-lg border px-3 py-2 flex items-center gap-2 text-sm',
                      ativa && 'bg-primary/5 border-primary/30',
                    )}
                  >
                    {sala.cor && (
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sala.cor }} />
                    )}
                    <span className="font-medium truncate">{sala.nome}</span>
                    <Badge variant={ativa ? 'default' : 'outline'} className="ml-auto text-xs shrink-0">
                      {ativa ? 'Em uso' : 'Livre'}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Ocupação por unidade — hoje</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {format(agora, "HH:mm 'de' dd/MM/yyyy", { locale: ptBR })}
        </p>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {filialStats.length === 0 && !loading && (
        <div className="py-16 text-center text-muted-foreground border rounded-lg">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Nenhuma unidade encontrada</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filialStats.map((filial) => (
          <Card
            key={filial.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              filialSelecionada === filial.id && 'ring-2 ring-primary',
            )}
            onClick={() =>
              onFilialSelect?.(filialSelecionada === filial.id ? null : filial.id)
            }
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {filial.cor && (
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: filial.cor }}
                    />
                  )}
                  <CardTitle className="text-base">{filial.nome}</CardTitle>
                </div>
                <Badge
                  variant={filial.taxaAtual >= 85 ? 'destructive' : filial.taxaAtual >= 60 ? 'secondary' : 'outline'}
                  className="shrink-0"
                >
                  {filial.taxaAtual.toFixed(0)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{filial.salasComAgora} de {filial.totalSalas} salas em uso</span>
                </div>
                <Progress value={filial.taxaAtual} className="h-2" />
              </div>

              {filial.proximosAtendimentos.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Próximos
                  </p>
                  {filial.proximosAtendimentos.map((ag, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-muted-foreground shrink-0">
                        {format(new Date(ag.data_hora), 'HH:mm')}
                      </span>
                      <span className="truncate">{ag.salaNome}</span>
                      {ag.paciente && (
                        <span className="truncate text-muted-foreground ml-auto">
                          {ag.paciente}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {filial.totalSalas === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma sala cadastrada</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
