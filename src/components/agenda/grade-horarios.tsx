"use client";

import { useEffect, useMemo, useState } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ActionButton, PersonAvatar, StatusPill } from "@/components/kit";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CalendarX2, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { Agendamento } from "@/types/agendamento";
import { GradeHorariosDia } from "./grade-horarios-dia";
import { GradeHorariosSemana } from "./grade-horarios-semana";
import { GradeHorariosMes } from "./grade-horarios-mes";
import { GradeBloco, ProfissionalGrade, contarVagas } from "./grade-horarios-utils";

interface GradeHorariosProps {
  profissionais: ProfissionalGrade[];
  grades: GradeBloco[];
  agendamentos: Agendamento[];
  selectedDate: Date;
  viewMode: "day" | "week" | "month";
  onSlotLivreClick: (profissionalId: string, data: Date, horario: string) => void;
  onAgendamentoClick: (agendamento: Agendamento) => void;
  onDiaClick: (dia: Date) => void;
}

export function GradeHorarios({
  profissionais,
  grades,
  agendamentos,
  selectedDate,
  viewMode,
  onSlotLivreClick,
  onAgendamentoClick,
  onDiaClick,
}: GradeHorariosProps) {
  // Dias considerados no período visível — base da contagem de vagas
  const dias = useMemo(() => {
    if (viewMode === "day") return [selectedDate];
    if (viewMode === "week") {
      return eachDayOfInterval({
        start: startOfWeek(selectedDate, { locale: ptBR }),
        end: endOfWeek(selectedDate, { locale: ptBR }),
      });
    }
    return eachDayOfInterval({
      start: startOfMonth(selectedDate),
      end: endOfMonth(selectedDate),
    });
  }, [selectedDate, viewMode]);

  const idsChave = profissionais.map((p) => p.id).join(",");
  const [abertos, setAbertos] = useState<string[]>([]);

  // Com poucos profissionais, abre tudo; com muitos, começa recolhido e a
  // contagem de vagas no cabeçalho já permite varrer quem tem disponibilidade
  useEffect(() => {
    const ids = idsChave ? idsChave.split(",") : [];
    setAbertos(ids.length <= 3 ? ids : []);
  }, [idsChave]);

  if (profissionais.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarX2 className="mb-3 size-10 text-ink-3" />
        <p className="font-medium">Nenhum profissional encontrado</p>
        <p className="text-sm text-muted-foreground max-w-md">
          Só aparecem aqui profissionais classificados como clínicos. Quem está
          cadastrado sem tipo de vínculo — ou como administrativo, caso da recepção —
          fica de fora, mesmo tendo acesso à agenda.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Ajuste os filtros de filial ou profissional, ou classifique o vínculo em
          Profissionais.
        </p>
      </div>
    );
  }

  const todosAbertos = abertos.length === profissionais.length;

  return (
    <div className="space-y-4">
      {/* Legenda + expandir/recolher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-[0.3rem] bg-success-soft ring-1 ring-success/40" />
            Livre
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-[0.3rem] bg-info-soft ring-1 ring-info/40" />
            Agendado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-[0.3rem] border border-dashed border-warning/70 bg-warning-soft" />
            Fora da grade
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-[0.3rem] bg-surface-sunken" />
            Não atende
          </span>
        </div>

        {profissionais.length > 1 && (
          <ActionButton
            variant="secondary"
            size="sm"
            onClick={() => setAbertos(todosAbertos ? [] : profissionais.map((p) => p.id))}
          >
            {todosAbertos ? <ChevronsDownUp /> : <ChevronsUpDown />}
            {todosAbertos ? "Recolher todos" : "Expandir todos"}
          </ActionButton>
        )}
      </div>

      <Accordion type="multiple" value={abertos} onValueChange={setAbertos} className="space-y-2.5">
        {profissionais.map((prof) => {
          const vagas = contarVagas(grades, agendamentos, prof.id, dias);
          const temGrade = grades.some((g) => g.profissionalId === prof.id);

          return (
            <AccordionItem
              key={prof.id}
              value={prof.id}
              className="rounded-2xl border-none bg-surface-muted px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex flex-1 items-center justify-between gap-3 pr-2">
                  <div className="flex min-w-0 items-center gap-3 text-left">
                    <PersonAvatar nome={prof.nome} />
                    <div className="min-w-0">
                      <p className="truncate text-[0.95rem] font-semibold text-ink">
                        {prof.nome}
                      </p>
                      {prof.especialidade && (
                        <p className="truncate text-xs text-ink-3">{prof.especialidade}</p>
                      )}
                    </div>
                  </div>
                  {temGrade ? (
                    <StatusPill tom={vagas > 0 ? "success" : "neutral"}>
                      {vagas > 0
                        ? `${vagas} horário${vagas > 1 ? "s" : ""} livre${vagas > 1 ? "s" : ""}`
                        : "Sem vaga"}
                    </StatusPill>
                  ) : (
                    <StatusPill tom="neutral">Grade não configurada</StatusPill>
                  )}
                </div>
              </AccordionTrigger>

              <AccordionContent className="pb-4">
                {!temGrade ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Este profissional ainda não tem grade de atendimento configurada. Configure em
                    Taxa de Agendamento → {prof.nome} → Configurar Grade.
                  </p>
                ) : viewMode === "day" ? (
                  <GradeHorariosDia
                    profissionalId={prof.id}
                    grades={grades}
                    agendamentos={agendamentos}
                    dia={selectedDate}
                    onSlotLivreClick={onSlotLivreClick}
                    onAgendamentoClick={onAgendamentoClick}
                  />
                ) : viewMode === "week" ? (
                  <GradeHorariosSemana
                    profissionalId={prof.id}
                    grades={grades}
                    agendamentos={agendamentos}
                    dias={dias}
                    onSlotLivreClick={onSlotLivreClick}
                    onAgendamentoClick={onAgendamentoClick}
                  />
                ) : (
                  <GradeHorariosMes
                    profissionalId={prof.id}
                    grades={grades}
                    agendamentos={agendamentos}
                    selectedDate={selectedDate}
                    onDiaClick={onDiaClick}
                  />
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
