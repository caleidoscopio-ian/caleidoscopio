"use client";

import { CalendarCheck, DollarSign, TrendingDown, XCircle, ReceiptText } from "lucide-react";
import { formatBRL } from "@/lib/preco-procedimento";
import type { HistoricoResumo } from "@/types/historico-atendimento";
import { StatCard } from "@/components/kit";

interface ResumoHistoricoProps {
  resumo: HistoricoResumo;
}

export function ResumoHistorico({ resumo }: ResumoHistoricoProps) {
  const absenteismoTotal = resumo.faltas + resumo.cancelamentos;
  const pctAbsenteismo =
    resumo.total_registros > 0
      ? Math.round((absenteismoTotal / resumo.total_registros) * 100)
      : 0;

  return (
    <div className="anim-escalonada grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard
        tom="blue"
        size="sm"
        icone={<CalendarCheck />}
        rotulo="Atendimentos Realizados"
        valor={<span className="text-success-ink">{resumo.total_atendimentos}</span>}
        hint={<>de {resumo.total_registros} registros</>}
      />

      <StatCard
        tom="lavender"
        size="sm"
        icone={<DollarSign />}
        rotulo="Valor Total Faturado"
        valor={formatBRL(resumo.valor_total)}
        hint="atendimentos realizados"
      />

      <StatCard
        tom="mint"
        size="sm"
        icone={<ReceiptText />}
        rotulo="Ticket Médio"
        valor={formatBRL(resumo.ticket_medio)}
        hint="por atendimento realizado"
      />

      <StatCard
        tom="peach"
        size="sm"
        icone={<TrendingDown />}
        rotulo="Faltas"
        valor={<span className="text-warning-ink">{resumo.faltas}</span>}
        hint="ausências no período"
      />

      <StatCard
        tom="blue"
        size="sm"
        icone={<XCircle />}
        rotulo="Cancelamentos"
        valor={<span className="text-danger-ink">{resumo.cancelamentos}</span>}
        hint={<>{pctAbsenteismo}% de absenteísmo total</>}
      />
    </div>
  );
}
