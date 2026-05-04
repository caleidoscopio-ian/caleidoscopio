"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { format, addDays, parseISO } from "date-fns";

interface Profissional { id: string; nome: string }
interface Sala { id: string; nome: string }

export interface CheckInFilters {
  data: string;
  search: string;
  profissionalId: string;
  salaId: string;
}

interface CheckInFiltersProps {
  filters: CheckInFilters;
  profissionais: Profissional[];
  salas: Sala[];
  loading: boolean;
  onChange: (filters: CheckInFilters) => void;
  onRefresh: () => void;
}

export function CheckInFiltersBar({
  filters, profissionais, salas, loading, onChange, onRefresh,
}: CheckInFiltersProps) {
  const set = (patch: Partial<CheckInFilters>) => onChange({ ...filters, ...patch });

  const changeDay = (delta: number) => {
    const next = addDays(parseISO(filters.data), delta);
    set({ data: format(next, "yyyy-MM-dd") });
  };

  return (
    <div className="flex flex-wrap gap-3 mb-4 items-center">
      {/* Navegação de data — exibe dd/mm/yyyy para usuários BR */}
      <div className="flex items-center border rounded-md h-9">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-r-none border-r" onClick={() => changeDay(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-3 text-sm font-medium w-28 text-center tabular-nums">
          {format(parseISO(filters.data), "dd/MM/yyyy")}
        </span>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-l-none border-l" onClick={() => changeDay(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost" size="icon" className="h-9 w-9 ml-1 rounded-md border"
          onClick={() => set({ data: todayStr() })}
          title="Hoje"
        >
          <CalendarDays className="h-4 w-4" />
        </Button>
      </div>
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar paciente..."
          className="pl-9"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
        />
      </div>
      <Select value={filters.profissionalId || "_all"} onValueChange={(v) => set({ profissionalId: v === "_all" ? "" : v })}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Profissional" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos</SelectItem>
          {profissionais.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.salaId || "_all"} onValueChange={(v) => set({ salaId: v === "_all" ? "" : v })}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Sala" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todas</SelectItem>
          {salas.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading}>
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
}

export function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}
