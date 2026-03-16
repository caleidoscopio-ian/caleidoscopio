import { Badge } from "@/components/ui/badge";

const FASE_CONFIG: Record<string, { label: string; color: string }> = {
  LINHA_BASE: { label: "Linha de Base", color: "bg-gray-500" },
  INTERVENCAO: { label: "Intervenção", color: "bg-blue-500" },
  MANUTENCAO: { label: "Manutenção", color: "bg-green-500" },
  GENERALIZACAO: { label: "Generalização", color: "bg-amber-500" },
};

export const FASE_LABELS = FASE_CONFIG;

interface FaseBadgeProps {
  fase: string;
  size?: "sm" | "default";
}

export function FaseBadge({ fase, size = "default" }: FaseBadgeProps) {
  const config = FASE_CONFIG[fase] || { label: fase, color: "bg-gray-400" };
  return (
    <Badge
      className={`${config.color} text-white ${size === "sm" ? "text-xs px-2 py-0" : ""}`}
    >
      {config.label}
    </Badge>
  );
}
