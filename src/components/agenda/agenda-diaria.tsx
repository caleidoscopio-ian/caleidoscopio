/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Clock, Plus } from "lucide-react";
import { Agendamento, StatusAgendamento } from "@/types/agendamento";
import { cn } from "@/lib/utils";

interface AgendaDiariaProps {
  agendamentos: Agendamento[];
  profissionais: Array<{ id: string; nome: string; especialidade: string }>;
  selectedDate: Date;
  onNovoAgendamento: (profissionalId: string, horario: string) => void;
  onAgendamentoClick: (agendamento: Agendamento) => void;
  showMultipleProfessionals?: boolean;
}

// Gerar slots de 10 minutos das 05:00 às 22:00
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 5; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 10) {
      if (hour === 22 && minute > 0) break; // Parar em 22:00
      const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      slots.push(time);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

export function AgendaDiaria({
  agendamentos,
  profissionais,
  selectedDate,
  onNovoAgendamento,
  onAgendamentoClick,
  showMultipleProfessionals = false,
}: AgendaDiariaProps) {
  // Agrupar agendamentos por profissional
  const agendamentosPorProfissional = useMemo(() => {
    const map = new Map<string, Agendamento[]>();

    profissionais.forEach((prof) => {
      map.set(prof.id, []);
    });

    agendamentos.forEach((agendamento) => {
      const profAgendamentos = map.get(agendamento.profissionalId) || [];
      profAgendamentos.push(agendamento);
      map.set(agendamento.profissionalId, profAgendamentos);
    });

    return map;
  }, [agendamentos, profissionais]);

  // Calcular quantos slots de 10min o agendamento ocupa
  const calculateSlots = (inicio: Date | string, fim: Date | string) => {
    const dataInicio = new Date(inicio);
    const dataFim = new Date(fim);
    const duracaoMinutos = (dataFim.getTime() - dataInicio.getTime()) / 60000;
    return Math.ceil(duracaoMinutos / 10); // Slots de 10 minutos
  };

  // Verificar se um slot está ocupado
  const isSlotOccupied = (
    profissionalId: string,
    slotTime: string
  ): Agendamento | null => {
    const agendamentosDoProfissional =
      agendamentosPorProfissional.get(profissionalId) || [];

    const [slotHour, slotMinute] = slotTime.split(":").map(Number);
    const slotDate = new Date(selectedDate);
    slotDate.setHours(slotHour, slotMinute, 0, 0);

    for (const agendamento of agendamentosDoProfissional) {
      const agendamentoDate = new Date(agendamento.data_hora);
      const agendamentoEnd = new Date(agendamento.horario_fim);

      if (slotDate >= agendamentoDate && slotDate < agendamentoEnd) {
        return agendamento;
      }
    }

    return null;
  };

  // Verificar se é o início do agendamento
  const isStartSlot = (agendamento: Agendamento, slotTime: string): boolean => {
    const agendamentoDate = new Date(agendamento.data_hora);
    const [slotHour, slotMinute] = slotTime.split(":").map(Number);

    return (
      agendamentoDate.getHours() === slotHour &&
      agendamentoDate.getMinutes() === slotMinute
    );
  };

  const getStatusColor = (status: StatusAgendamento) => {
    switch (status) {
      case StatusAgendamento.CONFIRMADO:
        return "bg-green-50 border-green-300 hover:bg-green-100";
      case StatusAgendamento.AGENDADO:
        return "bg-blue-50 border-blue-300 hover:bg-blue-100";
      case StatusAgendamento.CANCELADO:
        return "bg-red-50 border-red-300 hover:bg-red-100";
      case StatusAgendamento.ATENDIDO:
        return "bg-purple-50 border-purple-300 hover:bg-purple-100";
      case StatusAgendamento.FALTOU:
        return "bg-gray-50 border-gray-300 hover:bg-gray-100";
      default:
        return "bg-gray-50 border-gray-300 hover:bg-gray-100";
    }
  };

  const getStatusBadgeColor = (status: StatusAgendamento) => {
    switch (status) {
      case StatusAgendamento.CONFIRMADO:
        return "bg-green-100 text-green-800";
      case StatusAgendamento.AGENDADO:
        return "bg-blue-100 text-blue-800";
      case StatusAgendamento.CANCELADO:
        return "bg-red-100 text-red-800";
      case StatusAgendamento.ATENDIDO:
        return "bg-purple-100 text-purple-800";
      case StatusAgendamento.FALTOU:
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: StatusAgendamento) => {
    switch (status) {
      case StatusAgendamento.CONFIRMADO:
        return "Confirmado";
      case StatusAgendamento.AGENDADO:
        return "Agendado";
      case StatusAgendamento.CANCELADO:
        return "Cancelado";
      case StatusAgendamento.ATENDIDO:
        return "Atendido";
      case StatusAgendamento.FALTOU:
        return "Faltou";
      default:
        return "Agendado";
    }
  };

  // Profissionais a exibir
  const profissionaisExibir = showMultipleProfessionals
    ? profissionais
    : profissionais.slice(0, 1);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header com profissionais */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `80px repeat(${profissionaisExibir.length}, 1fr)`,
        }}
      >
        {/* Coluna de horários */}
        <div className="bg-muted p-4 border-r border-b font-semibold text-sm">
          <Clock className="h-4 w-4" />
        </div>

        {/* Colunas dos profissionais */}
        {profissionaisExibir.map((prof) => (
          <div
            key={prof.id}
            className="bg-muted p-4 border-r last:border-r-0 border-b"
          >
            <div className="font-semibold text-sm">{prof.nome}</div>
            <div className="text-xs text-muted-foreground">
              {prof.especialidade}
            </div>
          </div>
        ))}
      </div>

      {/* Grade de horários */}
      <div className="overflow-y-auto max-h-[600px]">
        {TIME_SLOTS.map((slot, slotIndex) => (
          <div
            key={slot}
            className="grid border-b last:border-b-0"
            style={{
              gridTemplateColumns: `80px repeat(${profissionaisExibir.length}, 1fr)`,
            }}
          >
            {/* Coluna de horário */}
            <div className="p-2 border-r text-sm text-muted-foreground text-center flex items-start justify-center pt-1">
              {slot}
            </div>

            {/* Células de cada profissional */}
            {profissionaisExibir.map((prof) => {
              const agendamento = isSlotOccupied(prof.id, slot);
              const isStart = agendamento
                ? isStartSlot(agendamento, slot)
                : false;

              // Se há agendamento mas não é o slot inicial, não renderizar (já foi renderizado no slot inicial)
              if (agendamento && !isStart) {
                return (
                  <div
                    key={`${prof.id}-${slot}`}
                    className="border-r last:border-r-0"
                  />
                );
              }

              // Se é o slot inicial, renderizar o card do agendamento
              if (agendamento && isStart) {
                const slotsOcupados = calculateSlots(
                  agendamento.data_hora,
                  agendamento.horario_fim
                );
                const altura = slotsOcupados * 60; // cada slot tem ~60px

                return (
                  <div
                    key={`${prof.id}-${slot}`}
                    className="border-r last:border-r-0 p-1 relative"
                    style={{ minHeight: "60px" }}
                  >
                    <div
                      className={cn(
                        "absolute inset-1 border-l-4 rounded-md p-2 cursor-pointer transition-colors overflow-hidden",
                        getStatusColor(agendamento.status as StatusAgendamento)
                      )}
                      style={{
                        height: `${altura - 8}px`,
                        borderLeftColor:
                          agendamento.paciente?.cor_agenda || "#3b82f6",
                        zIndex: 10,
                      }}
                      onClick={() => onAgendamentoClick(agendamento)}
                    >
                      <div className="space-y-1 h-full overflow-hidden">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-6 w-6 flex-shrink-0">
                            <AvatarImage
                              src={agendamento.paciente?.foto || ""}
                            />
                            <AvatarFallback
                              className="text-xs"
                              style={{
                                backgroundColor:
                                  agendamento.paciente?.cor_agenda || "#3b82f6",
                                color: "white",
                              }}
                            >
                              {agendamento.paciente?.nome
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-semibold text-sm truncate flex-1 min-w-0">
                            {agendamento.paciente?.nome}
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {new Date(agendamento.data_hora).toLocaleTimeString(
                              "pt-BR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}{" "}
                            -{" "}
                            {new Date(agendamento.horario_fim).toLocaleTimeString(
                              "pt-BR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>

                        {agendamento.salaRelacao && slotsOcupados > 1 && (
                          <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            {agendamento.salaRelacao.cor && (
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: agendamento.salaRelacao.cor }}
                              />
                            )}
                            <span className="truncate">{agendamento.salaRelacao.nome}</span>
                          </div>
                        )}

                        {slotsOcupados > 1 && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs inline-block",
                              getStatusBadgeColor(
                                agendamento.status as StatusAgendamento
                              )
                            )}
                          >
                            {getStatusText(
                              agendamento.status as StatusAgendamento
                            )}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Slot vazio - permitir criar novo agendamento
              return (
                <div
                  key={`${prof.id}-${slot}`}
                  className="border-r last:border-r-0 p-2 hover:bg-muted/50 cursor-pointer transition-colors group"
                  style={{ minHeight: "60px" }}
                  onClick={() => onNovoAgendamento(prof.id, slot)}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
