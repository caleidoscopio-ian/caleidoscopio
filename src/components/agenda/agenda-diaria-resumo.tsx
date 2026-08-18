"use client";

import { useMemo, useState } from "react";
import { Clock, Plus, Users } from "lucide-react";
import { Agendamento } from "@/types/agendamento";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  SLOT_PX, PX_PER_MIN, minutesOfDay, fmtMin, computeRange,
} from "@/components/agenda/agenda-grid-utils";
import { AgendamentosListaDialog } from "@/components/agenda/agendamentos-lista-dialog";

interface AgendaDiariaResumoProps {
  agendamentos: Agendamento[];
  selectedDate: Date;
  onNovoAgendamento: (data: Date, horario: string) => void;
  onAgendamentoClick: (agendamento: Agendamento) => void;
}

// Visão "Todos os profissionais" do dia — em vez de uma coluna por profissional
// (inviável com dezenas deles lado a lado), mostra uma única coluna com a
// quantidade de agendamentos por slot de horário; clicar abre a lista.
export function AgendaDiariaResumo({
  agendamentos,
  selectedDate,
  onNovoAgendamento,
  onAgendamentoClick,
}: AgendaDiariaResumoProps) {
  const [slotAberto, setSlotAberto] = useState<number | null>(null);

  const { startMin, endMin, slots } = useMemo(() => computeRange(agendamentos), [agendamentos]);
  const gridHeight = (endMin - startMin) * PX_PER_MIN;

  // Agendamentos que se sobrepõem a cada slot de 30 min (mesmo critério de conflito usado no backend)
  const agsPorSlot = useMemo(() => {
    const map = new Map<number, Agendamento[]>();
    slots.forEach((m) => {
      const fimSlot = m + 30;
      const ags = agendamentos.filter((a) => {
        const ini = minutesOfDay(a.data_hora);
        const fim = minutesOfDay(a.horario_fim);
        return ini < fimSlot && fim > m;
      });
      if (ags.length) map.set(m, ags);
    });
    return map;
  }, [agendamentos, slots]);

  const ordenarPorHorario = (ags: Agendamento[]) =>
    [...ags].sort((a, b) => minutesOfDay(a.data_hora) - minutesOfDay(b.data_hora));

  const handleSlotClick = (m: number) => {
    const ags = agsPorSlot.get(m);
    if (ags && ags.length > 0) {
      setSlotAberto(m);
    } else {
      onNovoAgendamento(selectedDate, fmtMin(m));
    }
  };

  const agsDoSlotAberto = slotAberto !== null ? ordenarPorHorario(agsPorSlot.get(slotAberto) ?? []) : [];

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        {/* Cabeçalho */}
        <div className="grid border-b" style={{ gridTemplateColumns: "52px 1fr" }}>
          <div className="bg-muted p-2 border-r flex items-center justify-center">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="bg-muted p-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Todos os profissionais</span>
          </div>
        </div>

        {/* Corpo rolável */}
        <div className="overflow-y-auto max-h-[640px]">
          <div className="grid pt-3" style={{ gridTemplateColumns: "52px 1fr" }}>
            {/* Coluna de horários — rótulo só na hora cheia */}
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

            {/* Coluna única com a contagem por slot */}
            <div className="relative" style={{ height: gridHeight }}>
              {slots.map((m) => {
                const ags = agsPorSlot.get(m) ?? [];
                return (
                  <div
                    key={m}
                    className={cn(
                      "absolute left-0 right-0 border-t hover:bg-muted/40 cursor-pointer group flex items-center px-2",
                      m % 60 === 0 ? "border-border" : "border-dashed border-border/40"
                    )}
                    style={{ top: (m - startMin) * PX_PER_MIN, height: SLOT_PX }}
                    onClick={() => handleSlotClick(m)}
                  >
                    {ags.length > 0 ? (
                      <Badge variant="secondary" className="text-xs font-medium">
                        {ags.length} agendamento{ags.length > 1 ? "s" : ""}
                      </Badge>
                    ) : (
                      <Plus className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: lista de agendamentos do slot selecionado */}
      <AgendamentosListaDialog
        open={slotAberto !== null}
        onOpenChange={(open) => !open && setSlotAberto(null)}
        titulo={`Agendamentos às ${slotAberto !== null ? fmtMin(slotAberto) : ""}`}
        agendamentos={agsDoSlotAberto}
        onAgendamentoClick={(a) => {
          setSlotAberto(null);
          onAgendamentoClick(a);
        }}
      />
    </>
  );
}
