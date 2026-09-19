"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Agendamento } from "@/types/agendamento";
import { SLOT_MIN, fmtMin, minutesOfDay } from "./agenda-grid-utils";
import {
  GradeBloco,
  SLOT_STATUS_CLASS,
  blocosDoDia,
  faixaDeSlots,
  mesmoDia,
  montarSlotsDoDia,
  ocupaAgenda,
} from "./grade-horarios-utils";

interface GradeHorariosSemanaProps {
  profissionalId: string;
  grades: GradeBloco[];
  agendamentos: Agendamento[];
  dias: Date[];
  onSlotLivreClick: (profissionalId: string, data: Date, horario: string) => void;
  onAgendamentoClick: (agendamento: Agendamento) => void;
}

export function GradeHorariosSemana({
  profissionalId,
  grades,
  agendamentos,
  dias,
  onSlotLivreClick,
  onAgendamentoClick,
}: GradeHorariosSemanaProps) {
  const doProfissional = agendamentos.filter((a) => a.profissionalId === profissionalId);

  // Faixa única para toda a semana, para as linhas ficarem alinhadas entre os dias
  const blocosDaSemana = dias.flatMap((d) => blocosDoDia(grades, profissionalId, d.getDay()));
  const agsDaSemana = doProfissional.filter(
    (a) => ocupaAgenda(a) && dias.some((d) => mesmoDia(a.data_hora, d))
  );
  const slots = faixaDeSlots(blocosDaSemana, agsDaSemana);

  if (slots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Nenhuma grade de atendimento configurada para esta semana.
      </p>
    );
  }

  const porDia = dias.map((dia) => ({
    dia,
    blocos: blocosDoDia(grades, profissionalId, dia.getDay()),
    slots: montarSlotsDoDia(
      blocosDoDia(grades, profissionalId, dia.getDay()),
      doProfissional,
      dia,
      slots
    ),
  }));

  const hoje = new Date();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-background w-16 p-1 text-xs font-medium text-muted-foreground text-left">
              Horário
            </th>
            {porDia.map(({ dia, blocos }) => (
              <th key={dia.toISOString()} className="p-1 text-center">
                <div
                  className={`text-xs font-semibold capitalize ${
                    mesmoDia(hoje, dia) ? "text-primary" : ""
                  }`}
                >
                  {format(dia, "EEE dd/MM", { locale: ptBR })}
                </div>
                {blocos.length === 0 && (
                  <div className="text-[10px] font-normal text-muted-foreground">sem grade</div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((min, linha) => (
            <tr key={min}>
              <td className="sticky left-0 z-10 bg-background p-1 align-top text-xs text-muted-foreground whitespace-nowrap">
                {min % 60 === 0 || linha === 0 ? fmtMin(min) : ""}
              </td>
              {porDia.map(({ dia, slots: slotsDoDia }) => {
                const slot = slotsDoDia[linha];
                const horario = fmtMin(min);
                const agendamento = slot.agendamentos[0];

                if (slot.status === "fora") {
                  return (
                    <td key={dia.toISOString()} className="p-0.5">
                      <div className="h-8 rounded bg-muted/40" />
                    </td>
                  );
                }

                if (!agendamento) {
                  return (
                    <td key={dia.toISOString()} className="p-0.5">
                      <button
                        type="button"
                        onClick={() => onSlotLivreClick(profissionalId, dia, horario)}
                        className={`h-8 w-full rounded border text-xs transition-colors ${SLOT_STATUS_CLASS.livre}`}
                        aria-label={`Agendar ${format(dia, "dd/MM", { locale: ptBR })} às ${horario}`}
                      >
                        Livre
                      </button>
                    </td>
                  );
                }

                const iniciaAqui = minutesOfDay(agendamento.data_hora) >= min &&
                  minutesOfDay(agendamento.data_hora) < min + SLOT_MIN;

                return (
                  <td key={dia.toISOString()} className="p-0.5">
                    <button
                      type="button"
                      onClick={() => onAgendamentoClick(agendamento)}
                      className={`h-8 w-full rounded border px-1 text-xs truncate transition-colors ${SLOT_STATUS_CLASS[slot.status]}`}
                      title={agendamento.paciente?.nome ?? "Agendado"}
                    >
                      {iniciaAqui ? (agendamento.paciente?.nome ?? "Agendado") : "↳"}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
