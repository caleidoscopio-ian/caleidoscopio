"use client";

// Pílula de status (Módulo 28).
//
// Texto em `--{tom}-ink` e fundo em `--{tom}-soft`. No v2 os dois saem do mesmo
// token, e por isso três dos seis tons reprovam no contraste (2.47:1 no
// warning). Aqui o preenchimento continua sendo a cor do v2 e só o TEXTO usa a
// versão escurecida — ver `src/styles/tokens-ajustes.css`.
//
// O mapa de status é o mesmo da auditoria do v2, para a mesma palavra ter a
// mesma cor nas duas aplicações.

import * as React from "react";
import { cn } from "@/lib/utils";

export type TomStatus = "info" | "success" | "warning" | "danger" | "neutral" | "violet";

const TONS: Record<TomStatus, string> = {
  info: "bg-info-soft text-info-ink",
  success: "bg-success-soft text-success-ink",
  warning: "bg-warning-soft text-warning-ink",
  danger: "bg-danger-soft text-danger-ink",
  violet: "bg-violet-soft text-violet-ink",
  neutral: "bg-surface-sunken text-ink-3",
};

/** Status do sistema → tom. Fora desta lista, cai em `neutral`. */
const POR_STATUS: Record<string, TomStatus> = {
  agendado: "info",
  confirmado: "violet",
  em_atendimento: "warning",
  "em atendimento": "warning",
  em_andamento: "warning",
  "em andamento": "warning",
  pendente: "warning",
  aberta: "warning",
  atendido: "success",
  finalizada: "success",
  concluída: "success",
  concluida: "success",
  ativo: "success",
  ativa: "success",
  recuperada: "success",
  faltou: "danger",
  perdida: "danger",
  cancelado: "neutral",
  cancelada: "neutral",
  rascunho: "neutral",
  inativo: "neutral",
  inativa: "neutral",
  em_recurso: "violet",
  "em recurso": "violet",
};

export const tomDoStatus = (status?: string | null): TomStatus =>
  POR_STATUS[(status ?? "").toLowerCase().trim()] ?? "neutral";

interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tom?: TomStatus;
  /** quando passado, o tom sai do mapa de status */
  status?: string | null;
  ponto?: boolean;
}

export function StatusPill({
  tom,
  status,
  ponto = false,
  className,
  children,
  ...props
}: StatusPillProps) {
  const cor = tom ?? tomDoStatus(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] font-medium whitespace-nowrap",
        TONS[cor],
        className
      )}
      {...props}
    >
      {ponto && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children ?? status}
    </span>
  );
}
