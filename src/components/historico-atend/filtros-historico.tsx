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
import { useFilial } from "@/hooks/useFilial";
import { StatusAgendamento, STATUS_AGENDAMENTO_LABELS } from "@/types/agendamento";
import type { HistoricoFiltros } from "@/types/historico-atendimento";

const STATUS_OPCOES: StatusAgendamento[] = [
  StatusAgendamento.ATENDIDO,
  StatusAgendamento.FALTOU,
  StatusAgendamento.CANCELADO,
];

type Periodo = "7d" | "30d" | "mes" | "custom";

interface FiltrosHistoricoProps {
  profissionais: Array<{ id: string; nome: string }>;
  convenios: Array<{ id: string; nome: string }>;
  procedimentos: Array<{ id: string; nome: string; codigo: string | null }>;
  isAdmin: boolean;
  onFiltrar: (filtros: HistoricoFiltros) => void;
  loading?: boolean;
}

export function FiltrosHistorico({
  profissionais,
  convenios,
  procedimentos,
  isAdmin,
  onFiltrar,
  loading,
}: FiltrosHistoricoProps) {
  const { filiais } = useFilial();
  const hoje = new Date();

  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [dataInicio, setDataInicio] = useState<Date>(subDays(hoje, 29));
  const [dataFim, setDataFim] = useState<Date>(hoje);
  const [statusSel, setStatusSel] = useState<string[]>([
    StatusAgendamento.ATENDIDO,
    StatusAgendamento.FALTOU,
    StatusAgendamento.CANCELADO,
  ]);
  const [profissionalId, setProfissionalId] = useState<string | null>(null);
  const [pacienteBusca, setPacienteBusca] = useState("");
  const [convenioId, setConvenioId] = useState<string | null>(null);
  const [procedimentoId, setProcedimentoId] = useState<string | null>(null);
  const [filialId, setFilialId] = useState<string | null>(null);

  const handlePeriodo = (p: Periodo) => {
    setPeriodo(p);
    const now = new Date();
    if (p === "7d") { setDataInicio(subDays(now, 6)); setDataFim(now); }
    else if (p === "30d") { setDataInicio(subDays(now, 29)); setDataFim(now); }
    else if (p === "mes") { setDataInicio(startOfMonth(now)); setDataFim(endOfMonth(now)); }
  };

  const toggleStatus = (s: string) => {
    setStatusSel((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleFiltrar = () => {
    onFiltrar({
      dataInicio, dataFim,
      status: statusSel,
      profissionalId, pacienteBusca,
      convenioId, procedimentoId, filialId,
    });
  };

  const limparFiltros = () => {
    const now = new Date();
    setPeriodo("30d");
    setDataInicio(subDays(now, 29));
    setDataFim(now);
    setStatusSel([StatusAgendamento.ATENDIDO, StatusAgendamento.FALTOU, StatusAgendamento.CANCELADO]);
    setProfissionalId(null);
    setPacienteBusca("");
    setConvenioId(null);
    setProcedimentoId(null);
    setFilialId(null);
  };

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
      <div className="flex flex-wrap gap-2 items-end">
        {/* Período rápido */}
        <div className="flex gap-1">
          {(["7d", "30d", "mes", "custom"] as Periodo[]).map((p) => (
            <Button key={p} type="button" size="sm"
              variant={periodo === p ? "default" : "outline"}
              onClick={() => handlePeriodo(p)}>
              {p === "7d" ? "7d" : p === "30d" ? "30d" : p === "mes" ? "Mês" : "Custom"}
            </Button>
          ))}
        </div>

        {/* Data início */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-2", periodo !== "custom" && "opacity-70")}>
              <CalendarIcon className="h-3.5 w-3.5" />
              {format(dataInicio, "dd/MM/yyyy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={dataInicio}
              onSelect={(d) => { if (d) { setDataInicio(d); setPeriodo("custom"); } }}
              locale={ptBR} />
          </PopoverContent>
        </Popover>

        <span className="text-sm text-muted-foreground self-center">até</span>

        {/* Data fim */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("gap-2", periodo !== "custom" && "opacity-70")}>
              <CalendarIcon className="h-3.5 w-3.5" />
              {format(dataFim, "dd/MM/yyyy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={dataFim}
              onSelect={(d) => { if (d) { setDataFim(d); setPeriodo("custom"); } }}
              locale={ptBR} />
          </PopoverContent>
        </Popover>

        {/* Busca paciente */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente..."
            value={pacienteBusca}
            onChange={(e) => setPacienteBusca(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleFiltrar(); }}
            className="pl-8 h-9 w-44"
          />
        </div>

        {/* Profissional */}
        <Select value={profissionalId ?? "_todos"} onValueChange={(v) => setProfissionalId(v === "_todos" ? null : v)}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Profissional" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_todos">Todos os profissionais</SelectItem>
            {profissionais.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Convênio */}
        <Select value={convenioId ?? "_todos"} onValueChange={(v) => setConvenioId(v === "_todos" ? null : v)}>
          <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Convênio" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_todos">Todos os convênios</SelectItem>
            {convenios.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Procedimento */}
        <Select value={procedimentoId ?? "_todos"} onValueChange={(v) => setProcedimentoId(v === "_todos" ? null : v)}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Procedimento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_todos">Todos os procedimentos</SelectItem>
            {procedimentos.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.codigo ? `${p.codigo} – ` : ""}{p.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filial (admin) */}
        {isAdmin && filiais.length > 0 && (
          <Select value={filialId ?? "_todas"} onValueChange={(v) => setFilialId(v === "_todas" ? null : v)}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Filial" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_todas">Todas as filiais</SelectItem>
              {filiais.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <Button size="sm" onClick={handleFiltrar} disabled={loading} className="gap-1.5">
          <Search className="h-3.5 w-3.5" />
          {loading ? "Carregando..." : "Filtrar"}
        </Button>

        <Button size="sm" variant="ghost" onClick={limparFiltros} className="gap-1 text-muted-foreground">
          <X className="h-3.5 w-3.5" />
          Limpar
        </Button>
      </div>

      {/* Filtro de status por badges */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground">Status:</span>
        {STATUS_OPCOES.map((s) => (
          <Badge
            key={s}
            variant={statusSel.includes(s) ? "default" : "outline"}
            className="cursor-pointer select-none"
            onClick={() => toggleStatus(s)}
          >
            {STATUS_AGENDAMENTO_LABELS[s]}
          </Badge>
        ))}
      </div>
    </div>
  );
}
