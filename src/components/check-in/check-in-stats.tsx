"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, Clock, Activity, AlertTriangle } from "lucide-react";
import { StatusAgendamento } from "@/types/agendamento";
import type { AgendamentoCheckIn } from "@/types/check-in";

interface CheckInStatsProps {
  agendamentos: AgendamentoCheckIn[];
}

export function CheckInStats({ agendamentos }: CheckInStatsProps) {
  const total = agendamentos.length;
  const aguardando = agendamentos.filter(
    (a) => a.status === StatusAgendamento.AGENDADO || a.status === StatusAgendamento.CONFIRMADO
  ).length;
  const emAtendimento = agendamentos.filter(
    (a) => a.status === StatusAgendamento.EM_ATENDIMENTO
  ).length;
  const faltas = agendamentos.filter(
    (a) => a.status === StatusAgendamento.FALTOU
  ).length;

  const stats = [
    { label: "Total do Dia", value: total, icon: Users, color: "text-muted-foreground" },
    { label: "Aguardando", value: aguardando, icon: Clock, color: "text-blue-600" },
    { label: "Em Atendimento", value: emAtendimento, icon: Activity, color: "text-amber-600" },
    { label: "Faltas", value: faltas, icon: AlertTriangle, color: "text-red-600" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <Card key={label}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
