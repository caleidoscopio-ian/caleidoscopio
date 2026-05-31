"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Search } from "lucide-react"
import { format, subDays, startOfMonth, endOfMonth } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useFilial } from "@/hooks/useFilial"

export interface FiltrosOcupacaoValues {
  dataInicio: Date
  dataFim: Date
  profissionalId: string | null
  filialId: string | null
}

interface FiltrosOcupacaoProps {
  profissionais: Array<{ id: string; nome: string; especialidade: string }>
  isAdmin: boolean
  onFiltrar: (filtros: FiltrosOcupacaoValues) => void
  loading?: boolean
}

type Periodo = "7d" | "30d" | "mes" | "custom"

export function FiltrosOcupacao({ profissionais, isAdmin, onFiltrar, loading }: FiltrosOcupacaoProps) {
  const { filiais } = useFilial()
  const hoje = new Date()

  const [periodo, setPeriodo] = useState<Periodo>("30d")
  const [dataInicio, setDataInicio] = useState<Date>(subDays(hoje, 29))
  const [dataFim, setDataFim] = useState<Date>(hoje)
  const [profissionalId, setProfissionalId] = useState<string | null>(null)
  const [filialId, setFilialId] = useState<string | null>(null)

  const handlePeriodo = (p: Periodo) => {
    setPeriodo(p)
    const now = new Date()
    if (p === "7d") { setDataInicio(subDays(now, 6)); setDataFim(now) }
    else if (p === "30d") { setDataInicio(subDays(now, 29)); setDataFim(now) }
    else if (p === "mes") { setDataInicio(startOfMonth(now)); setDataFim(endOfMonth(now)) }
  }

  const handleFiltrar = () => {
    onFiltrar({ dataInicio, dataFim, profissionalId, filialId })
  }

  return (
    <div className="flex flex-wrap gap-3 items-end">
      {/* Período rápido */}
      <div className="flex gap-1">
        {(["7d", "30d", "mes", "custom"] as Periodo[]).map((p) => (
          <Button
            key={p}
            type="button"
            size="sm"
            variant={periodo === p ? "default" : "outline"}
            onClick={() => handlePeriodo(p)}
          >
            {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : p === "mes" ? "Mês atual" : "Custom"}
          </Button>
        ))}
      </div>

      {/* Data início */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("gap-2", periodo !== "custom" && "opacity-60")}>
            <CalendarIcon className="h-4 w-4" />
            {format(dataInicio, "dd/MM/yyyy", { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={dataInicio} onSelect={(d) => { if (d) { setDataInicio(d); setPeriodo("custom") } }} locale={ptBR} />
        </PopoverContent>
      </Popover>

      <span className="text-sm text-muted-foreground self-center">até</span>

      {/* Data fim */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("gap-2", periodo !== "custom" && "opacity-60")}>
            <CalendarIcon className="h-4 w-4" />
            {format(dataFim, "dd/MM/yyyy", { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={dataFim} onSelect={(d) => { if (d) { setDataFim(d); setPeriodo("custom") } }} locale={ptBR} />
        </PopoverContent>
      </Popover>

      {/* Profissional */}
      <Select value={profissionalId ?? "_todos"} onValueChange={(v) => setProfissionalId(v === "_todos" ? null : v)}>
        <SelectTrigger className="w-52 h-9">
          <SelectValue placeholder="Todos os profissionais" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_todos">Todos os profissionais</SelectItem>
          {profissionais.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filial (admin) */}
      {isAdmin && filiais.length > 0 && (
        <Select value={filialId ?? "_todas"} onValueChange={(v) => setFilialId(v === "_todas" ? null : v)}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="Todas as filiais" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_todas">Todas as filiais</SelectItem>
            {filiais.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button size="sm" onClick={handleFiltrar} disabled={loading} className="gap-2">
        <Search className="h-4 w-4" />
        {loading ? "Carregando..." : "Filtrar"}
      </Button>
    </div>
  )
}
