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
  blue: { texto: "text-blue-600", fundo: "bg-blue-50" },
  emerald: { texto: "text-emerald-600", fundo: "bg-emerald-50" },
  violet: { texto: "text-violet-600", fundo: "bg-violet-50" },
  amber: { texto: "text-amber-600", fundo: "bg-amber-50" },
  orange: { texto: "text-orange-600", fundo: "bg-orange-50" },
  cyan: { texto: "text-cyan-600", fundo: "bg-cyan-50" },
  slate: { texto: "text-slate-600", fundo: "bg-slate-100" },
  rose: { texto: "text-rose-600", fundo: "bg-rose-50" },
};

export const corDoRelatorio = (cor: string) => CORES[cor] ?? CORES.slate;
