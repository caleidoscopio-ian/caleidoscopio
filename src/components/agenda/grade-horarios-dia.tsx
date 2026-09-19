"use client";

import { Agendamento } from "@/types/agendamento";
import { fmtMin } from "./agenda-grid-utils";
import {
  GradeBloco,
  SLOT_STATUS_CLASS,
  blocosDoDia,
  faixaDeSlots,
  mesmoDia,
  montarSlotsDoDia,
  ocupaAgenda,
  resumoBlocos,
} from "./grade-horarios-utils";

interface GradeHorariosDiaProps {
  profissionalId: string;
  grades: GradeBloco[];
  agendamentos: Agendamento[];
  dia: Date;
  onSlotLivreClick: (profissionalId: string, data: Date, horario: string) => void;
  onAgendamentoClick: (agendamento: Agendamento) => void;
}

export function GradeHorariosDia({
  profissionalId,
  grades,
  agendamentos,
  dia,
  onSlotLivreClick,
  onAgendamentoClick,
}: GradeHorariosDiaProps) {
  const blocos = blocosDoDia(grades, profissionalId, dia.getDay());
  const doProfissional = agendamentos.filter((a) => a.profissionalId === profissionalId);
  const doDia = doProfissional.filter((a) => ocupaAgenda(a) && mesmoDia(a.data_hora, dia));

  const slots = faixaDeSlots(blocos, doDia);

  if (blocos.length === 0 && doDia.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Sem grade configurada para este dia da semana.
      </p>
    );
  }

  const infos = montarSlotsDoDia(blocos, doProfissional, dia, slots).filter(
    (s) => s.status !== "fora"
  );

  return (
    <div className="space-y-3">
      {blocos.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Grade do dia: <span className="font-medium">{resumoBlocos(blocos)}</span>
        </p>
      )}

      <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(130px,1fr))]">
        {infos.map((slot) => {
          const horario = fmtMin(slot.min);
          const agendamento = slot.agendamentos[0];

          if (!agendamento) {
            return (
              <button
                key={slot.min}
                type="button"
                onClick={() => onSlotLivreClick(profissionalId, dia, horario)}
                className={`rounded-md border px-2 py-1.5 text-left transition-colors ${SLOT_STATUS_CLASS.livre}`}
                aria-label={`Agendar às ${horario}`}
              >
                <div className="text-sm font-semibold">{horario}</div>
                <div className="text-xs">Livre</div>
              </button>
            );
          }

          return (
            <button
              key={slot.min}
              type="button"
              onClick={() => onAgendamentoClick(agendamento)}
              className={`rounded-md border px-2 py-1.5 text-left transition-colors ${SLOT_STATUS_CLASS[slot.status]}`}
              aria-label={`Ver agendamento das ${horario}`}
            >
              <div className="text-sm font-semibold">{horario}</div>
              <div className="text-xs truncate">
                {agendamento.paciente?.nome ?? "Agendado"}
                {slot.agendamentos.length > 1 && ` +${slot.agendamentos.length - 1}`}
              </div>
              {slot.status === "extra" && (
                <div className="text-[10px] uppercase tracking-wide">fora da grade</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
