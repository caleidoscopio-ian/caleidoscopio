"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Plus } from "lucide-react";
import { Agendamento, StatusAgendamento } from "@/types/agendamento";
import { cn } from "@/lib/utils";
import { addDays, startOfWeek, format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  SLOT_PX, PX_PER_MIN, minutesOfDay, fmtMin, computeRange, layoutColunas, getStatusCardBg,
} from "@/components/agenda/agenda-grid-utils";

interface AgendaSemanalProps {
  agendamentos: Agendamento[];
  profissionalId?: string;
  selectedDate: Date;
  onNovoAgendamento: (data: Date, horario: string) => void;
  onAgendamentoClick: (agendamento: Agendamento) => void;
}

export function AgendaSemanal({
  agendamentos,
  profissionalId,
  selectedDate,
  onNovoAgendamento,
  onAgendamentoClick,
}: AgendaSemanalProps) {
  // 7 dias da semana
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { locale: ptBR });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  // Agendamentos filtrados por profissional (se houver) e agrupados por dia
  const agsFiltrados = useMemo(
    () => agendamentos.filter((a) => !profissionalId || a.profissionalId === profissionalId),
    [agendamentos, profissionalId]
  );

  const agsPorDia = useMemo(() => {
    const map = new Map<string, Agendamento[]>();
    weekDays.forEach((day) => map.set(format(day, "yyyy-MM-dd"), []));
    agsFiltrados.forEach((a) => {
      const key = format(new Date(a.data_hora), "yyyy-MM-dd");
      const arr = map.get(key);
      if (arr) arr.push(a);
    });
    return map;
  }, [agsFiltrados, weekDays]);

  const { startMin, endMin, slots } = useMemo(() => computeRange(agsFiltrados), [agsFiltrados]);
  const gridHeight = (endMin - startMin) * PX_PER_MIN;
  const weekCols = "52px repeat(7, minmax(0, 1fr))";

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Cabeçalho: gutter + dias */}
      <div className="grid border-b" style={{ gridTemplateColumns: weekCols }}>
        <div className="bg-muted p-2 border-r flex items-center justify-center">
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={cn("bg-muted p-2 border-r last:border-r-0 text-center", isToday(day) && "bg-primary/10")}
          >
            <div className="font-semibold text-sm capitalize">{format(day, "EEE", { locale: ptBR })}</div>
            <div className={cn("text-xs text-muted-foreground", isToday(day) && "text-primary font-semibold")}>
              {format(day, "dd/MM")}
            </div>
          </div>
        ))}
      </div>

      {/* Corpo rolável */}
      <div className="overflow-y-auto max-h-[640px]">
        <div className="grid pt-3" style={{ gridTemplateColumns: weekCols }}>
          {/* Coluna de horários — rótulo só na hora cheia (estilo Teams) */}
          <div className="relative border-r" style={{ height: gridHeight }}>
            {slots.filter((m) => m % 60 === 0).map((m) => (
              <div
                key={m}
                className="absolute right-0 text-sm font-medium text-muted-foreground text-right pr-2 -translate-y-1/2 tabular-nums"
                style={{ top: (m - startMin) * PX_PER_MIN }}
              >
                {fmtMin(m)}
              </div>
            ))}
          </div>

          {/* Colunas dos dias */}
          {weekDays.map((day) => {
            const ags = agsPorDia.get(format(day, "yyyy-MM-dd")) || [];
            const layout = layoutColunas(ags);

            return (
              <div
                key={day.toISOString()}
                className={cn("relative border-r last:border-r-0", isToday(day) && "bg-primary/5")}
                style={{ height: gridHeight }}
              >
                {/* Linhas de slot (fundo, clicáveis p/ criar) — hora forte, meia-hora fraca */}
                {slots.map((m) => (
                  <div
                    key={m}
                    className={cn(
                      "absolute left-0 right-0 border-t hover:bg-muted/40 cursor-pointer group",
                      m % 60 === 0 ? "border-border" : "border-dashed border-border/40"
                    )}
                    style={{ top: (m - startMin) * PX_PER_MIN, height: SLOT_PX }}
                    onClick={() => onNovoAgendamento(day, fmtMin(m))}
                  >
                    <Plus className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity absolute top-0.5 left-0.5" />
                  </div>
                ))}

                {/* Agendamentos posicionados pela hora/duração reais */}
                {ags.map((a) => {
                  const ini = minutesOfDay(a.data_hora);
                  const fim = minutesOfDay(a.horario_fim);
                  const top = (ini - startMin) * PX_PER_MIN;
                  const height = Math.max((fim - ini) * PX_PER_MIN, 20);
                  const { col, cols } = layout.get(a.id) ?? { col: 0, cols: 1 };
                  const widthPct = 100 / cols;
                  const compact = height < 38;

                  return (
                    <div
                      key={a.id}
                      className={cn(
                        "absolute border-l-4 rounded px-1 py-0.5 cursor-pointer transition-colors overflow-hidden shadow-sm text-xs",
                        getStatusCardBg(a.status as StatusAgendamento)
                      )}
                      style={{
                        top,
                        height: height - 2,
                        left: `calc(${col * widthPct}% + 1px)`,
                        width: `calc(${widthPct}% - 2px)`,
                        borderLeftColor: a.paciente?.cor_agenda || "#3b82f6",
                        zIndex: 10,
                      }}
                      onClick={() => onAgendamentoClick(a)}
                      title={`${a.paciente?.nome ?? ""} · ${fmtMin(ini)}–${fmtMin(fim)}`}
                    >
                      {compact ? (
                        <div className="font-semibold truncate text-[11px] leading-tight">
                          {a.paciente?.nome?.split(" ")[0]}
                        </div>
                      ) : (
                        <div className="space-y-0.5 overflow-hidden">
                          <div className="flex items-center gap-1 min-w-0">
                            <Avatar className="h-4 w-4 flex-shrink-0">
                              <AvatarImage src={a.paciente?.foto || ""} />
                              <AvatarFallback
                                className="text-[8px]"
                                style={{ backgroundColor: a.paciente?.cor_agenda || "#3b82f6", color: "white" }}
                              >
                                {a.paciente?.nome?.split(" ").map((n) => n[0]).join("").substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold truncate flex-1 min-w-0 text-[11px]">
                              {a.paciente?.nome?.split(" ")[0]}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {fmtMin(ini)}–{fmtMin(fim)}
                          </div>
                          {height >= 64 && a.salaRelacao && (
                            <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                              {a.salaRelacao.cor && (
                                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.salaRelacao.cor }} />
                              )}
                              <span className="truncate">{a.salaRelacao.nome}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
