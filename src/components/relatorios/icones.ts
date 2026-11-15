// Resolve o nome do ícone declarado no catálogo para o componente lucide.
//
// O catálogo é importado pelo servidor, então não pode carregar componente
// React. Por isso ele guarda uma string e a tradução acontece aqui.

import {
  BarChart3,
  DoorOpen,
  FileText,
  HandCoins,
  Handshake,
  ReceiptText,
  Stethoscope,
  TrendingUp,
  UserX,
  type LucideIcon,
} from "lucide-react";

const MAPA: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  "hand-coins": HandCoins,
  handshake: Handshake,
  "user-x": UserX,
  "trending-up": TrendingUp,
  "door-open": DoorOpen,
  "receipt-text": ReceiptText,
  "file-text": FileText,
};

export function iconeDoRelatorio(nome: string): LucideIcon {
  return MAPA[nome] ?? BarChart3;
}

/** Classes de cor por relatório — mantidas como literais para o Tailwind
 *  conseguir vê-las na varredura das classes. */
export const CORES: Record<string, { texto: string; fundo: string }> = {
  blue: { texto: "text-brand", fundo: "bg-brand-soft" },
  emerald: { texto: "text-success-ink", fundo: "bg-success-soft" },
  violet: { texto: "text-violet-ink", fundo: "bg-violet-soft" },
  amber: { texto: "text-warning-ink", fundo: "bg-warning-soft" },
  orange: { texto: "text-warning-ink", fundo: "bg-warning-soft" },
  cyan: { texto: "text-cyan-600", fundo: "bg-cyan-50" },
  slate: { texto: "text-ink", fundo: "bg-surface-sunken" },
  rose: { texto: "text-danger-ink", fundo: "bg-danger-soft" },
};

export const corDoRelatorio = (cor: string) => CORES[cor] ?? CORES.slate;
