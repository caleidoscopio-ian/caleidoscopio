"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Clock, User, MapPin, Stethoscope, CheckCircle2,
  LogIn, Play, Flag, RotateCcw, Loader2, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StatusAgendamento } from "@/types/agendamento";
import {
  STATUS_LABELS, STATUS_BADGE, ACOES_POR_STATUS,
  calcularAtrasoMinutos, type AgendamentoCheckIn, type CheckInAction,
} from "@/types/check-in";
import { NoShowDialog } from "./no-show-dialog";

const ACAO_ICONS: Record<CheckInAction, React.ComponentType<{ className?: string }>> = {
  confirmar:  CheckCircle2,
  checkin:    LogIn,
  iniciar:    Play,
  finalizar:  Flag,
  "no-show":  AlertCircle,
  reabrir:    RotateCcw,
};

const ACAO_LABELS: Record<CheckInAction, string> = {
  confirmar: "Confirmar",
  checkin:   "Check-in",
  iniciar:   "Iniciar",
  finalizar: "Finalizar",
  "no-show": "No-show",
  reabrir:   "Reabrir",
};

const ACAO_VARIANT: Record<CheckInAction, "default" | "secondary" | "destructive" | "outline"> = {
  confirmar: "default",
  checkin:   "default",
  iniciar:   "default",
  finalizar: "default",
  "no-show": "destructive",
  reabrir:   "outline",
};

interface CheckInCardProps {
  agendamento: AgendamentoCheckIn;
  canEdit: boolean;
  onAction: (id: string, action: CheckInAction, motivo?: string) => Promise<void>;
}

export function CheckInCard({ agendamento, canEdit, onAction }: CheckInCardProps) {
  const [loading, setLoading] = useState<CheckInAction | null>(null);
  const [noShowOpen, setNoShowOpen] = useState(false);

  const atrasoMin = calcularAtrasoMinutos(agendamento);
  const acoes = ACOES_POR_STATUS[agendamento.status as StatusAgendamento] ?? [];

  const handleAction = async (action: CheckInAction, motivo?: string) => {
    setLoading(action);
    try {
      await onAction(agendamento.id, action, motivo);
    } finally {
      setLoading(null);
    }
  };

  const hora = format(new Date(agendamento.data_hora), "HH:mm", { locale: ptBR });
  const horaFim = format(new Date(agendamento.horario_fim), "HH:mm", { locale: ptBR });

  const semCheckIn = !agendamento.hora_chegada &&
    (agendamento.status === StatusAgendamento.AGENDADO || agendamento.status === StatusAgendamento.CONFIRMADO);

  return (
    <>
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-3">
            {/* Cor do paciente */}
            <div
              className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: agendamento.paciente.cor_agenda ?? "#94a3b8" }}
            >
              {agendamento.paciente.nome.charAt(0).toUpperCase()}
            </div>

            {/* Dados */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm truncate">{agendamento.paciente.nome}</p>
                <Badge variant="outline" className={`text-xs px-1.5 ${STATUS_BADGE[agendamento.status as StatusAgendamento]}`}>
                  {STATUS_LABELS[agendamento.status as StatusAgendamento]}
                </Badge>
                {/* Badge de atraso */}
                {semCheckIn && atrasoMin > 0 && (
                  <Badge
                    variant="outline"
                    className={`text-xs px-1.5 ${atrasoMin >= 15 ? "bg-red-50 text-red-600 border-red-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}`}
                  >
                    {atrasoMin}min {atrasoMin >= 15 ? "— provável falta" : "atrasado"}
                  </Badge>
                )}
                {agendamento.hora_chegada && agendamento.status === StatusAgendamento.CONFIRMADO && (
                  <Badge variant="outline" className="text-xs px-1.5 bg-green-50 text-green-700 border-green-200">
                    <LogIn className="h-2.5 w-2.5 mr-1" />
                    Chegou {format(new Date(agendamento.hora_chegada), "HH:mm")}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {hora} — {horaFim}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {agendamento.profissional.nome}
                </span>
                {agendamento.salaRelacao && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {agendamento.salaRelacao.nome}
                  </span>
                )}
                {agendamento.procedimento && (
                  <span className="flex items-center gap-1">
                    <Stethoscope className="h-3 w-3" />
                    {agendamento.procedimento.nome}
                  </span>
                )}
              </div>

              {agendamento.motivo_falta && (
                <p className="text-xs text-red-500 mt-1">Motivo: {agendamento.motivo_falta}</p>
              )}
            </div>

            {/* Ações */}
            {canEdit && acoes.length > 0 && (
              <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                {acoes.map((acao) => {
                  const Icon = ACAO_ICONS[acao];
                  if (acao === "no-show") {
                    return (
                      <Button
                        key={acao}
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs px-2"
                        onClick={() => setNoShowOpen(true)}
                        disabled={!!loading}
                      >
                        <Icon className="h-3 w-3 mr-1" />
                        {ACAO_LABELS[acao]}
                      </Button>
                    );
                  }
                  return (
                    <Button
                      key={acao}
                      size="sm"
                      variant={ACAO_VARIANT[acao]}
                      className="h-7 text-xs px-2"
                      onClick={() => handleAction(acao)}
                      disabled={!!loading}
                    >
                      {loading === acao
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Icon className="h-3 w-3 mr-1" />}
                      {ACAO_LABELS[acao]}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <NoShowDialog
        open={noShowOpen}
        pacienteNome={agendamento.paciente.nome}
        onConfirm={async (motivo) => { setNoShowOpen(false); await handleAction("no-show", motivo); }}
        onCancel={() => setNoShowOpen(false)}
      />
    </>
  );
}
