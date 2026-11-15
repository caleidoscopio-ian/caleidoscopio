import { Badge } from "@/components/ui/badge";

const FASE_CONFIG: Record<string, { label: string; color: string }> = {
  LINHA_BASE: { label: "Linha de Base", color: "bg-surface-muted" },
  INTERVENCAO: { label: "Intervenção", color: "bg-brand" },
  MANUTENCAO: { label: "Manutenção", color: "bg-success" },
  GENERALIZACAO: { label: "Generalização", color: "bg-warning" },
};

export const FASE_LABELS = FASE_CONFIG;

interface FaseBadgeProps {
  fase: string;
  size?: "sm" | "default";
}

export function FaseBadge({ fase, size = "default" }: FaseBadgeProps) {
  const config = FASE_CONFIG[fase] || { label: fase, color: "bg-surface-muted" };
  return (
    <Badge
      className={`${config.color} text-white ${size === "sm" ? "text-xs px-2 py-0" : ""}`}
    >
      {config.label}
    </Badge>
  );
}
