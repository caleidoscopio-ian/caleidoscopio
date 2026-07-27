"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import { Agendamento } from "@/types/agendamento";
import { cn } from "@/lib/utils";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { getStatusCardBg } from "@/components/agenda/agenda-grid-utils";
import { StatusAgendamento } from "@/types/agendamento";

interface AgendaMensalProps {
  agendamentos: Agendamento[];
  profissionalId?: string;
  selectedDate: Date;
  onNovoAgendamento: (data: Date, horario: string) => void;
  onAgendamentoClick: (agendamento: Agendamento) => void;
}

const MAX_CHIPS_VISIVEIS = 3;
const HORARIO_PADRAO_NOVO = "08:00";

export function AgendaMensal({
  agendamentos,
  profissionalId,
  selectedDate,
  onNovoAgendamento,
  onAgendamentoClick,
}: AgendaMensalProps) {
  // Grade completa do mês (inclui dias do mês anterior/seguinte pra fechar as semanas)
  const dias = useMemo(() => {
    const inicioMes = startOfMonth(selectedDate);
    const fimMes = endOfMonth(selectedDate);
    const inicioGrade = startOfWeek(inicioMes, { locale: ptBR });
    const fimGrade = endOfWeek(fimMes, { locale: ptBR });
    return eachDayOfInterval({ start: inicioGrade, end: fimGrade });
  }, [selectedDate]);

  const agsFiltrados = useMemo(
    () => agendamentos.filter((a) => !profissionalId || a.profissionalId === profissionalId),
    [agendamentos, profissionalId]
  );

  const agsPorDia = useMemo(() => {
    const map = new Map<string, Agendamento[]>();
    agsFiltrados.forEach((a) => {
      const key = format(new Date(a.data_hora), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    });
    // Ordenar cada dia por horário
    map.forEach((arr) =>
      arr.sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
    );
    return map;
  }, [agsFiltrados]);

  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 border-b bg-muted">
        {diasSemana.map((dia) => (
          <div key={dia} className="p-2 text-center text-sm font-semibold border-r last:border-r-0">
            {dia}
          </div>
        ))}
      </div>

      {/* Grade do mês */}
      <div className="grid grid-cols-7">
        {dias.map((dia) => {
          const key = format(dia, "yyyy-MM-dd");
          const ags = agsPorDia.get(key) ?? [];
          const dentroDoMes = isSameMonth(dia, selectedDate);
          const hoje = isToday(dia);
          const visiveis = ags.slice(0, MAX_CHIPS_VISIVEIS);
          const restantes = ags.length - visiveis.length;

          return (
            <div
              key={key}
              className={cn(
                "min-h-[110px] border-b border-r p-1.5 group relative",
                !dentroDoMes && "bg-muted/30",
                hoje && "bg-primary/5"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-xs font-medium",
                    !dentroDoMes && "text-muted-foreground",
                    hoje && "text-primary font-bold"
                  )}
                >
                  {format(dia, "d")}
                </span>
                <button
                  type="button"
                  onClick={() => onNovoAgendamento(dia, HORARIO_PADRAO_NOVO)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-muted"
                  title="Novo agendamento"
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-1">
                {visiveis.map((ag) => (
                  <button
                    key={ag.id}
                    type="button"
                    onClick={() => onAgendamentoClick(ag)}
                    className={cn(
                      "w-full text-left text-[11px] leading-tight px-1.5 py-1 rounded border truncate block",
                      getStatusCardBg(ag.status as StatusAgendamento)
                    )}
                    title={`${format(new Date(ag.data_hora), "HH:mm")} - ${ag.paciente?.nome ?? "Paciente"}`}
                  >
                    <span className="font-medium">{format(new Date(ag.data_hora), "HH:mm")}</span>
                    {" "}
                    {ag.paciente?.nome ?? "Paciente"}
                  </button>
                ))}
                {restantes > 0 && (
                  <div className="text-[11px] text-muted-foreground px-1.5">
                    +{restantes} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
