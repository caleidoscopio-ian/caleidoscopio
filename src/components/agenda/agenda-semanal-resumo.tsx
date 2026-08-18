"use client";

import { useMemo, useState } from "react";
import { Clock, Plus } from "lucide-react";
import { Agendamento } from "@/types/agendamento";
import { cn } from "@/lib/utils";
import { addDays, startOfWeek, format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  SLOT_PX, PX_PER_MIN, minutesOfDay, fmtMin, computeRange,
} from "@/components/agenda/agenda-grid-utils";
import { Badge } from "@/components/ui/badge";
import { AgendamentosListaDialog } from "@/components/agenda/agendamentos-lista-dialog";

interface AgendaSemanalResumoProps {
  agendamentos: Agendamento[];
  selectedDate: Date;
  onNovoAgendamento: (data: Date, horario: string) => void;
  onAgendamentoClick: (agendamento: Agendamento) => void;
}

interface SlotSelecionado {
  dia: Date;
  minuto: number;
}

// Visão "Todos os profissionais" da semana — cada célula dia×horário mostra a
// quantidade de agendamentos que se sobrepõem, em vez de posicionar cada cartão
// individualmente (inviável com muitos profissionais atendendo em paralelo).
export function AgendaSemanalResumo({
  agendamentos,
  selectedDate,
  onNovoAgendamento,
  onAgendamentoClick,
}: AgendaSemanalResumoProps) {
  const [slotAberto, setSlotAberto] = useState<SlotSelecionado | null>(null);

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { locale: ptBR });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const { startMin, endMin, slots } = useMemo(() => computeRange(agendamentos), [agendamentos]);
  const gridHeight = (endMin - startMin) * PX_PER_MIN;
  const weekCols = "52px repeat(7, minmax(0, 1fr))";

  // Chave "yyyy-MM-dd|minuto" -> agendamentos que se sobrepõem aquele dia+slot
  const agsPorDiaSlot = useMemo(() => {
    const map = new Map<string, Agendamento[]>();
    agendamentos.forEach((a) => {
      const dia = format(new Date(a.data_hora), "yyyy-MM-dd");
      const ini = minutesOfDay(a.data_hora);
      const fim = minutesOfDay(a.horario_fim);
      slots.forEach((m) => {
        const fimSlot = m + 30;
        if (ini < fimSlot && fim > m) {
          const key = `${dia}|${m}`;
          const arr = map.get(key) ?? [];
          arr.push(a);
          map.set(key, arr);
        }
      });
    });
    return map;
  }, [agendamentos, slots]);

  const handleSlotClick = (dia: Date, m: number) => {
    const key = `${format(dia, "yyyy-MM-dd")}|${m}`;
    const ags = agsPorDiaSlot.get(key);
    if (ags && ags.length > 0) {
      setSlotAberto({ dia, minuto: m });
    } else {
      onNovoAgendamento(dia, fmtMin(m));
    }
  };

  const agsDoSlotAberto = slotAberto
    ? agsPorDiaSlot.get(`${format(slotAberto.dia, "yyyy-MM-dd")}|${slotAberto.minuto}`) ?? []
    : [];

  return (
    <>
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

            {weekDays.map((day) => (
              <div key={day.toISOString()} className="relative border-r last:border-r-0" style={{ height: gridHeight }}>
                {slots.map((m) => {
                  const key = `${format(day, "yyyy-MM-dd")}|${m}`;
                  const ags = agsPorDiaSlot.get(key) ?? [];
                  return (
                    <div
                      key={m}
                      className={cn(
                        "absolute left-0 right-0 border-t hover:bg-muted/40 cursor-pointer group flex items-center justify-center px-1",
                        m % 60 === 0 ? "border-border" : "border-dashed border-border/40"
                      )}
                      style={{ top: (m - startMin) * PX_PER_MIN, height: SLOT_PX }}
                      onClick={() => handleSlotClick(day, m)}
                    >
                      {ags.length > 0 ? (
                        <Badge variant="secondary" className="text-[11px] font-medium px-1.5">
                          {ags.length}
                        </Badge>
                      ) : (
                        <Plus className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <AgendamentosListaDialog
        open={slotAberto !== null}
        onOpenChange={(open) => !open && setSlotAberto(null)}
        titulo={
          slotAberto
            ? `Agendamentos — ${format(slotAberto.dia, "dd/MM")} às ${fmtMin(slotAberto.minuto)}`
            : ""
        }
        agendamentos={agsDoSlotAberto}
        onAgendamentoClick={(a) => {
          setSlotAberto(null);
          onAgendamentoClick(a);
        }}
      />
    </>
  );
}
