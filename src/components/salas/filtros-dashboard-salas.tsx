"use client"

// Filtros do dashboard de salas (Módulo 27).
//
// Segue a convenção da taxa de ocupação: botão de período e dropdown aplicam
// **no clique**; intervalo customizado espera o "Aplicar", porque são dois
// campos e consultar no meio da escolha mostraria um período que ninguém pediu.

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarIcon, Loader2, Search } from "lucide-react"
import { endOfMonth, format, startOfMonth, subDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { useFilial } from "@/hooks/useFilial"

export type PeriodoDashboard = "7d" | "30d" | "mes" | "custom"

export interface FiltrosDashboardValues {
  inicio: Date
  fim: Date
  filialId: string | null
  salaId: string | null
}

/** Mesmo teto das rotas de sala (`/api/salas/capacidade` e `/ocupacao`) */
export const MAX_DIAS_DASHBOARD = 35

interface Props {
  valores: FiltrosDashboardValues
  onFiltrar: (v: FiltrosDashboardValues) => void
  loading?: boolean
}

interface SalaOpcao {
  id: string
  nome: string
  filialId: string | null
}

export function FiltrosDashboardSalas({ valores, onFiltrar, loading }: Props) {
  const { user } = useAuth()
  const { filiais } = useFilial()
  const [periodo, setPeriodo] = useState<PeriodoDashboard>("30d")
  const [inicio, setInicio] = useState(valores.inicio)
  const [fim, setFim] = useState(valores.fim)
  const [salas, setSalas] = useState<SalaOpcao[]>([])

  useEffect(() => {
    if (!user) return
    fetch("/api/salas", {
      headers: {
        "X-User-Data": btoa(JSON.stringify(user)),
        "X-Auth-Token": user.token,
      },
    })
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: SalaOpcao[] }) => {
        if (!d?.success || !Array.isArray(d.data)) return
        setSalas(d.data.map((s) => ({ id: s.id, nome: s.nome, filialId: s.filialId ?? null })))
      })
      .catch(() => {
        /* o dashboard funciona sem o dropdown de sala */
      })
  }, [user])

  const aplicar = (mudanca: Partial<FiltrosDashboardValues> = {}) => {
    onFiltrar({ inicio, fim, filialId: valores.filialId, salaId: valores.salaId, ...mudanca })
  }

  const handlePeriodo = (p: PeriodoDashboard) => {
    setPeriodo(p)
    const hoje = new Date()
    const faixa =
      p === "7d"
        ? { inicio: subDays(hoje, 6), fim: hoje }
        : p === "30d"
          ? { inicio: subDays(hoje, 29), fim: hoje }
          : p === "mes"
            ? { inicio: startOfMonth(hoje), fim: endOfMonth(hoje) }
            : null
    if (!faixa) return
    setInicio(faixa.inicio)
    setFim(faixa.fim)
    aplicar(faixa)
  }

  // Sala só é oferecida se pertence à filial filtrada — oferecer as outras
  // daria resultado vazio sem explicação
  const salasVisiveis = valores.filialId
    ? salas.filter((s) => s.filialId === valores.filialId || s.filialId === null)
    : salas

  const dias = Math.ceil((fim.getTime() - inicio.getTime()) / 86400000) + 1
  const periodoLongo = dias > MAX_DIAS_DASHBOARD
  const invertido = fim.getTime() < inicio.getTime()

  const PERIODOS: { chave: PeriodoDashboard; rotulo: string }[] = [
    { chave: "7d", rotulo: "Últimos 7 dias" },
    { chave: "30d", rotulo: "Últimos 30 dias" },
    { chave: "mes", rotulo: "Mês atual" },
    { chave: "custom", rotulo: "Personalizado" },
  ]

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {PERIODOS.map((p) => (
          <Button
            key={p.chave}
            type="button"
            size="sm"
            variant={periodo === p.chave ? "default" : "outline"}
            onClick={() => handlePeriodo(p.chave)}
          >
            {p.rotulo}
          </Button>
        ))}

        <div className="flex items-center gap-1.5">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("gap-2", periodo !== "custom" && "opacity-60")}
              >
                <CalendarIcon className="h-4 w-4" />
                {format(inicio, "dd/MM/yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={inicio}
                onSelect={(d) => {
                  if (!d) return
                  setInicio(d)
                  setPeriodo("custom")
                }}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <span className="text-sm text-muted-foreground">até</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("gap-2", periodo !== "custom" && "opacity-60")}
              >
                <CalendarIcon className="h-4 w-4" />
                {format(fim, "dd/MM/yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={fim}
                onSelect={(d) => {
                  if (!d) return
                  setFim(d)
                  setPeriodo("custom")
                }}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        {filiais.length > 0 && (
          <Select
            value={valores.filialId ?? "_todas"}
            onValueChange={(v) => {
              const id = v === "_todas" ? null : v
              // Trocar de filial pode deixar a sala escolhida fora do escopo
              const salaVale =
                valores.salaId &&
                salas.some(
                  (s) => s.id === valores.salaId && (s.filialId === id || s.filialId === null)
                )
              aplicar({ filialId: id, salaId: salaVale ? valores.salaId : null })
            }}
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Todas as filiais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_todas">Todas as filiais</SelectItem>
              {filiais.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {salasVisiveis.length > 0 && (
          <Select
            value={valores.salaId ?? "_todas"}
            onValueChange={(v) => aplicar({ salaId: v === "_todas" ? null : v })}
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Todas as salas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_todas">Todas as salas</SelectItem>
              {salasVisiveis.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {periodo === "custom" && (
          <Button
            size="sm"
            onClick={() => aplicar()}
            disabled={loading || periodoLongo || invertido}
            className="gap-2"
          >
            <Search className="h-4 w-4" />
            Aplicar
          </Button>
        )}

        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {invertido && (
        <p className="text-xs text-destructive">A data final é anterior à inicial.</p>
      )}
      {!invertido && periodoLongo && (
        <p className="text-xs text-destructive">
          O período selecionado tem {dias} dias. O máximo aqui é {MAX_DIAS_DASHBOARD} —
          acima disso a conta de capacidade passa a ser pesada demais para rodar em
          tempo de tela.
        </p>
      )}
    </div>
  )
}
