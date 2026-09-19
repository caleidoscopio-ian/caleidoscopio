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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
        <CalendarX2 className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="font-medium">Nenhum profissional encontrado</p>
        <p className="text-sm text-muted-foreground">
          Ajuste os filtros de filial ou profissional para ver a grade de horários.
        </p>
      </div>
    );
  }

  const todosAbertos = abertos.length === profissionais.length;

  return (
    <div className="space-y-4 p-4">
      {/* Legenda + expandir/recolher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm border border-green-300 bg-green-50" />
            Livre
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm border border-blue-300 bg-blue-50" />
            Agendado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm border border-dashed border-amber-400 bg-amber-50" />
            Fora da grade
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-muted" />
            Não atende
          </span>
        </div>

        {profissionais.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAbertos(todosAbertos ? [] : profissionais.map((p) => p.id))}
          >
            {todosAbertos ? (
              <ChevronsDownUp className="mr-2 h-4 w-4" />
            ) : (
              <ChevronsUpDown className="mr-2 h-4 w-4" />
            )}
            {todosAbertos ? "Recolher todos" : "Expandir todos"}
          </Button>
        )}
      </div>

      <Accordion type="multiple" value={abertos} onValueChange={setAbertos} className="space-y-2">
        {profissionais.map((prof) => {
          const vagas = contarVagas(grades, agendamentos, prof.id, dias);
          const temGrade = grades.some((g) => g.profissionalId === prof.id);

          return (
            <AccordionItem key={prof.id} value={prof.id} className="rounded-lg border px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex flex-1 items-center justify-between gap-3 pr-2">
                  <div className="text-left">
                    <div className="font-medium">{prof.nome}</div>
                    {prof.especialidade && (
                      <div className="text-xs text-muted-foreground">{prof.especialidade}</div>
                    )}
                  </div>
                  {temGrade ? (
                    <Badge
                      variant="outline"
                      className={
                        vagas > 0
                          ? "border-green-300 bg-green-50 text-green-800"
                          : "border-muted text-muted-foreground"
                      }
                    >
                      {vagas > 0 ? `${vagas} horário${vagas > 1 ? "s" : ""} livre${vagas > 1 ? "s" : ""}` : "Sem vaga"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Grade não configurada
                    </Badge>
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
