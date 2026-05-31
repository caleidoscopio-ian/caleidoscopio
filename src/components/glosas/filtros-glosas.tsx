"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Search, X } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  CATEGORIA_GLOSA_LABEL, STATUS_GLOSA_LABEL, STATUS_GLOSA_BADGE,
} from "@/types/glosa";
import type { CategoriaGlosa, StatusGlosa, GlosaFiltros } from "@/types/glosa";

const TODAS_CATEGORIAS = Object.keys(CATEGORIA_GLOSA_LABEL) as CategoriaGlosa[];
const TODOS_STATUS = Object.keys(STATUS_GLOSA_LABEL) as StatusGlosa[];

type Periodo = "7d" | "30d" | "90d" | "mes" | "custom";

interface FiltrosGlosasProps {
  convenios: Array<{ id: string; nome: string }>;
  onFiltrar: (filtros: GlosaFiltros) => void;
  loading?: boolean;
}

export function FiltrosGlosas({ convenios, onFiltrar, loading }: FiltrosGlosasProps) {
  const hoje = new Date();
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [dataInicio, setDataInicio] = useState(subDays(hoje, 29));
  const [dataFim, setDataFim] = useState(hoje);
  const [status, setStatus] = useState<StatusGlosa[]>([...TODOS_STATUS]);
  const [categoria, setCategoria] = useState<CategoriaGlosa | null>(null);
  const [convenioId, setConvenioId] = useState<string | null>(null);
  const [pacienteBusca, setPacienteBusca] = useState("");

  const handlePeriodo = (p: Periodo) => {
    setPeriodo(p);
    const now = new Date();
    if (p === "7d") { setDataInicio(subDays(now, 6)); setDataFim(now); }
    else if (p === "30d") { setDataInicio(subDays(now, 29)); setDataFim(now); }
    else if (p === "90d") { setDataInicio(subDays(now, 89)); setDataFim(now); }
    else if (p === "mes") { setDataInicio(startOfMonth(now)); setDataFim(endOfMonth(now)); }
  };

  const toggleStatus = (s: StatusGlosa) =>
    setStatus((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const limpar = () => {
    const now = new Date();
    setPeriodo("30d"); setDataInicio(subDays(now, 29)); setDataFim(now);
    setStatus([...TODOS_STATUS]); setCategoria(null); setConvenioId(null); setPacienteBusca("");
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
      <div className="flex flex-wrap gap-2 items-end">
        {/* Período */}
        <div className="flex gap-1">
          {(["7d", "30d", "90d", "mes", "custom"] as Periodo[]).map((p) => (
            <Button key={p} type="button" size="sm" variant={periodo === p ? "default" : "outline"} onClick={() => handlePeriodo(p)}>
              {p === "7d" ? "7d" : p === "30d" ? "30d" : p === "90d" ? "90d" : p === "mes" ? "Mês" : "Custom"}
            </Button>
          ))}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-2", periodo !== "custom" && "opacity-70")}>
              <CalendarIcon className="h-3.5 w-3.5" />
              {format(dataInicio, "dd/MM/yyyy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={dataInicio} onSelect={(d) => { if (d) { setDataInicio(d); setPeriodo("custom"); } }} locale={ptBR} />
          </PopoverContent>
        </Popover>

        <span className="text-sm text-muted-foreground self-center">até</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-2", periodo !== "custom" && "opacity-70")}>
              <CalendarIcon className="h-3.5 w-3.5" />
              {format(dataFim, "dd/MM/yyyy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={dataFim} onSelect={(d) => { if (d) { setDataFim(d); setPeriodo("custom"); } }} locale={ptBR} />
          </PopoverContent>
        </Popover>

        {/* Busca paciente */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar paciente..." value={pacienteBusca} onChange={(e) => setPacienteBusca(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onFiltrar({ dataInicio, dataFim, status, categoria, convenioId, pacienteBusca }); }}
            className="pl-8 h-9 w-44" />
        </div>

        {/* Categoria */}
        <Select value={categoria ?? "_todas"} onValueChange={(v) => setCategoria(v === "_todas" ? null : v as CategoriaGlosa)}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_todas">Todas categorias</SelectItem>
            {TODAS_CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{CATEGORIA_GLOSA_LABEL[c]}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Convênio */}
        <Select value={convenioId ?? "_todos"} onValueChange={(v) => setConvenioId(v === "_todos" ? null : v)}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Convênio" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_todos">Todos os convênios</SelectItem>
            {convenios.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button size="sm" onClick={() => onFiltrar({ dataInicio, dataFim, status, categoria, convenioId, pacienteBusca })} disabled={loading} className="gap-1.5">
          <Search className="h-3.5 w-3.5" />
          {loading ? "Carregando..." : "Filtrar"}
        </Button>
        <Button size="sm" variant="ghost" onClick={limpar} className="gap-1 text-muted-foreground">
          <X className="h-3.5 w-3.5" /> Limpar
        </Button>
      </div>

      {/* Status por badges */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground">Status:</span>
        {TODOS_STATUS.map((s) => (
          <Badge key={s} variant={status.includes(s) ? "default" : "outline"}
            className={cn("cursor-pointer select-none", !status.includes(s) && STATUS_GLOSA_BADGE[s])}
            onClick={() => toggleStatus(s)}>
            {STATUS_GLOSA_LABEL[s]}
          </Badge>
        ))}
      </div>
    </div>
  );
}
