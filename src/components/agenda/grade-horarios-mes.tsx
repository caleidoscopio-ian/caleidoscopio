"use client";

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Agendamento } from "@/types/agendamento";
import {
  GradeBloco,
  blocosDoDia,
  faixaDeSlots,
  mesmoDia,
  montarSlotsDoDia,
  ocupaAgenda,
} from "./grade-horarios-utils";

interface GradeHorariosMesProps {
  profissionalId: string;
  grades: GradeBloco[];
  agendamentos: Agendamento[];
  selectedDate: Date;
  onDiaClick: (dia: Date) => void;
}

const CABECALHO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function GradeHorariosMes({
  profissionalId,
  grades,
  agendamentos,
  selectedDate,
  onDiaClick,
}: GradeHorariosMesProps) {
  const doProfissional = agendamentos.filter((a) => a.profissionalId === profissionalId);

  const dias = eachDayOfInterval({
    start: startOfWeek(startOfMonth(selectedDate), { locale: ptBR }),
    end: endOfWeek(endOfMonth(selectedDate), { locale: ptBR }),
  });

  const hoje = new Date();

  return (
    <div className="grid grid-cols-7 gap-1">
      {CABECALHO.map((d) => (
        <div key={d} className="text-center text-xs font-medium text-muted-foreground pb-1">
          {d}
        </div>
      ))}

      {dias.map((dia) => {
        const blocos = blocosDoDia(grades, profissionalId, dia.getDay());
        const doDia = doProfissional.filter(
          (a) => ocupaAgenda(a) && mesmoDia(a.data_hora, dia)
        );
        const slots = faixaDeSlots(blocos, []);
        const infos = montarSlotsDoDia(blocos, doProfissional, dia, slots);
        const livres = infos.filter((s) => s.status === "livre").length;
        const ocupados = doDia.length;
        const noMes = isSameMonth(dia, selectedDate);
        const temGrade = blocos.length > 0;

        return (
          <button
            key={dia.toISOString()}
            type="button"
            onClick={() => onDiaClick(dia)}
            className={`min-h-[68px] rounded border p-1 text-left transition-colors hover:bg-accent ${
              noMes ? "bg-background" : "bg-muted/30 opacity-60"
            } ${mesmoDia(hoje, dia) ? "border-primary" : "border-border"}`}
            aria-label={`Ver ${format(dia, "dd 'de' MMMM", { locale: ptBR })}`}
          >
            <div className="text-xs font-semibold">{format(dia, "d")}</div>

            {!temGrade ? (
              <div className="mt-1 text-[10px] text-muted-foreground">—</div>
            ) : (
              <div className="mt-1 space-y-0.5">
                <div
                  className={`text-[11px] font-medium ${
                    livres > 0 ? "text-green-700" : "text-muted-foreground"
                  }`}
                >
                  {livres > 0 ? `${livres} livre${livres > 1 ? "s" : ""}` : "Lotado"}
                </div>
                {ocupados > 0 && (
                  <div className="text-[10px] text-blue-700">
                    {ocupados} agendado{ocupados > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
