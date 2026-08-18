"use client";

import { Agendamento, StatusAgendamento, STATUS_AGENDAMENTO_LABELS } from "@/types/agendamento";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getStatusCardBg, minutesOfDay, fmtMin } from "@/components/agenda/agenda-grid-utils";

interface AgendamentosListaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  agendamentos: Agendamento[];
  onAgendamentoClick: (agendamento: Agendamento) => void;
  // Mostra a data de cada item — útil quando a lista cobre mais de um dia
  mostrarData?: boolean;
}

const getStatusText = (status: StatusAgendamento) =>
  STATUS_AGENDAMENTO_LABELS[status] ?? "Agendado";

// Lista compacta de agendamentos dentro de um modal, reaproveitada pelas
// visões "resumo" (Dia/Semana/Mês com Todos os profissionais) — clicar num
// item abre o dialog de detalhes completo de sempre.
export function AgendamentosListaDialog({
  open,
  onOpenChange,
  titulo,
  agendamentos,
  onAgendamentoClick,
  mostrarData = false,
}: AgendamentosListaDialogProps) {
  const ordenados = [...agendamentos].sort(
    (a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {ordenados.length} agendamento{ordenados.length !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {ordenados.map((a) => {
            const ini = minutesOfDay(a.data_hora);
            const fim = minutesOfDay(a.horario_fim);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onAgendamentoClick(a)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border-l-4 transition-colors",
                  getStatusCardBg(a.status as StatusAgendamento)
                )}
                style={{ borderLeftColor: a.paciente?.cor_agenda || "#3b82f6" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm truncate">{a.paciente?.nome}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">
                    {mostrarData &&
                      `${new Date(a.data_hora).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })} · `}
                    {fmtMin(ini)}–{fmtMin(fim)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {a.profissional?.nome}
                  {a.profissional?.especialidade ? ` · ${a.profissional.especialidade}` : ""}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {a.salaRelacao && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      {a.salaRelacao.cor && (
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: a.salaRelacao.cor }}
                        />
                      )}
                      {a.salaRelacao.nome}
                    </span>
                  )}
                  <span className="text-[11px] font-medium opacity-70">
                    {getStatusText(a.status as StatusAgendamento)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
