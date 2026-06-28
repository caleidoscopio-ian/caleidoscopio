"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Plus } from "lucide-react";
import { Agendamento, StatusAgendamento, STATUS_AGENDAMENTO_LABELS } from "@/types/agendamento";
import { cn } from "@/lib/utils";
import {
  SLOT_PX, PX_PER_MIN, minutesOfDay, fmtMin, computeRange, layoutColunas, getStatusCardBg,
} from "@/components/agenda/agenda-grid-utils";

interface AgendaDiariaProps {
  agendamentos: Agendamento[];
  profissionais: Array<{ id: string; nome: string; especialidade: string }>;
  selectedDate: Date;
  onNovoAgendamento: (profissionalId: string, horario: string) => void;
  onAgendamentoClick: (agendamento: Agendamento) => void;
  showMultipleProfessionals?: boolean;
}

const getStatusText = (status: StatusAgendamento) =>
  STATUS_AGENDAMENTO_LABELS[status] ?? "Agendado";

export function AgendaDiaria({
  agendamentos,
  profissionais,
  onNovoAgendamento,
  onAgendamentoClick,
  showMultipleProfessionals = false,
}: AgendaDiariaProps) {
  const profissionaisExibir = showMultipleProfessionals
    ? profissionais
    : profissionais.slice(0, 1);

  // Agendamentos por profissional
  const agsPorProf = useMemo(() => {
    const map = new Map<string, Agendamento[]>();
    profissionais.forEach((p) => map.set(p.id, []));
    agendamentos.forEach((a) => {
      const arr = map.get(a.profissionalId) || [];
      arr.push(a);
      map.set(a.profissionalId, arr);
    });
    return map;
  }, [agendamentos, profissionais]);

  // Faixa de horários: 07:00–20:00 por padrão, expandida p/ caber todos os agendamentos
  const { startMin, endMin, slots } = useMemo(() => computeRange(agendamentos), [agendamentos]);

  const gridHeight = (endMin - startMin) * PX_PER_MIN;
  const gridCols = `52px repeat(${profissionaisExibir.length}, minmax(0, 1fr))`;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Cabeçalho: gutter + profissionais */}
      <div className="grid border-b" style={{ gridTemplateColumns: gridCols }}>
        <div className="bg-muted p-2 border-r flex items-center justify-center">
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>
        {profissionaisExibir.map((prof) => (
          <div key={prof.id} className="bg-muted p-2 border-r last:border-r-0 min-w-0">
            <div className="font-semibold text-sm truncate">{prof.nome}</div>
            <div className="text-xs text-muted-foreground truncate">{prof.especialidade}</div>
          </div>
        ))}
      </div>

      {/* Corpo rolável */}
      <div className="overflow-y-auto max-h-[640px]">
        <div className="grid pt-3" style={{ gridTemplateColumns: gridCols }}>
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

          {/* Colunas dos profissionais */}
          {profissionaisExibir.map((prof) => {
            const ags = agsPorProf.get(prof.id) || [];
            const layout = layoutColunas(ags);

            return (
              <div key={prof.id} className="relative border-r last:border-r-0" style={{ height: gridHeight }}>
                {/* Linhas de slot (fundo, clicáveis p/ criar) — hora forte, meia-hora fraca */}
                {slots.map((m) => (
                  <div
                    key={m}
                    className={cn(
                      "absolute left-0 right-0 border-t hover:bg-muted/40 cursor-pointer group",
                      m % 60 === 0 ? "border-border" : "border-dashed border-border/40"
                    )}
                    style={{ top: (m - startMin) * PX_PER_MIN, height: SLOT_PX }}
                    onClick={() => onNovoAgendamento(prof.id, fmtMin(m))}
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity absolute top-1 left-1" />
                  </div>
                ))}

                {/* Agendamentos posicionados pela hora/duração reais */}
                {ags.map((a) => {
                  const ini = minutesOfDay(a.data_hora);
                  const fim = minutesOfDay(a.horario_fim);
                  const top = (ini - startMin) * PX_PER_MIN;
                  const height = Math.max((fim - ini) * PX_PER_MIN, 22);
                  const { col, cols } = layout.get(a.id) ?? { col: 0, cols: 1 };
                  const widthPct = 100 / cols;
                  const compact = height < 40;

                  return (
                    <div
                      key={a.id}
                      className={cn(
                        "absolute border-l-4 rounded-md px-1.5 py-1 cursor-pointer transition-colors overflow-hidden shadow-sm",
                        getStatusCardBg(a.status as StatusAgendamento)
                      )}
                      style={{
                        top,
                        height: height - 2,
                        left: `calc(${col * widthPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                        borderLeftColor: a.paciente?.cor_agenda || "#3b82f6",
                        zIndex: 10,
                      }}
                      onClick={() => onAgendamentoClick(a)}
                      title={`${a.paciente?.nome ?? ""} · ${fmtMin(ini)}–${fmtMin(fim)}`}
                    >
                      {compact ? (
                        <div className="flex items-center gap-1 min-w-0 text-[11px] leading-tight">
                          <span className="font-semibold truncate">{a.paciente?.nome}</span>
                          <span className="text-muted-foreground flex-shrink-0">{fmtMin(ini)}</span>
                        </div>
                      ) : (
                        <div className="space-y-0.5 h-full overflow-hidden">
                          <div className="flex items-center gap-1 min-w-0">
                            <Avatar className="h-5 w-5 flex-shrink-0">
                              <AvatarImage src={a.paciente?.foto || ""} />
                              <AvatarFallback
                                className="text-[9px]"
                                style={{ backgroundColor: a.paciente?.cor_agenda || "#3b82f6", color: "white" }}
                              >
                                {a.paciente?.nome?.split(" ").map((n) => n[0]).join("").substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-xs truncate flex-1 min-w-0">{a.paciente?.nome}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                            <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                            <span className="truncate">{fmtMin(ini)}–{fmtMin(fim)}</span>
                          </div>
                          {height >= 70 && a.salaRelacao && (
                            <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                              {a.salaRelacao.cor && (
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: a.salaRelacao.cor }} />
                              )}
                              <span className="truncate">{a.salaRelacao.nome}</span>
                            </div>
                          )}
                          {height >= 90 && (
                            <span className="text-[10px] font-medium opacity-70">
                              {getStatusText(a.status as StatusAgendamento)}
                            </span>
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
