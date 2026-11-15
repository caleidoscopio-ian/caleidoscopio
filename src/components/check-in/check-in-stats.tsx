"use client";

import { Users, Clock, Activity, AlertTriangle } from "lucide-react";
import { StatusAgendamento } from "@/types/agendamento";
import type { AgendamentoCheckIn } from "@/types/check-in";
import { StatCard, type TomKpi } from "@/components/kit";

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

  // Tons na ordem do v2 nesta tela: azul, lavanda, pêssego e **branco** na
  // última. Falta não ganha pastel — o cartão que conta ausência é o único
  // sóbrio da fileira, e isso é do original.
  const stats: {
    label: string;
    value: number;
    icon: typeof Users;
    color: string;
    tom: TomKpi;
  }[] = [
    { label: "Total do Dia", value: total, icon: Users, color: "text-ink-3", tom: "blue" },
    { label: "Aguardando", value: aguardando, icon: Clock, color: "text-brand", tom: "lavender" },
    { label: "Em Atendimento", value: emAtendimento, icon: Activity, color: "text-warning-ink", tom: "peach" },
    { label: "Faltas", value: faltas, icon: AlertTriangle, color: "text-danger-ink", tom: "white" },
  ];

  return (
    <div className="anim-escalonada grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, color, tom }) => (
        <StatCard
          key={label}
          tom={tom}
          // A cor é do estado da recepção (aguardando, em atendimento, falta),
          // então vai no ícone: a classe do svg vence a do chip.
          icone={<Icon className={color} />}
          rotulo={label}
          valor={value}
        />
      ))}
    </div>
  );
}
