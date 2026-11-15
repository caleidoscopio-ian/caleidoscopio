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
    <div className="space-y-4">
      {/* Linha do dinheiro: o faturado manda, o ticket acompanha */}
      <div className="anim-escalonada grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <StatCard
          tom="blue"
          size="hero"
          icone={<DollarSign />}
          rotulo="Valor Total Faturado"
          valor={formatBRL(resumo.valor_total)}
          hint="atendimentos realizados"
        />
        <StatCard
          icone={<ReceiptText />}
          rotulo="Ticket Médio"
          valor={formatBRL(resumo.ticket_medio)}
          hint="por atendimento realizado"
        />
      </div>

      {/* Linha da contagem */}
      <div className="anim-escalonada grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          tom="mint"
          icone={<CalendarCheck />}
          rotulo="Atendimentos Realizados"
          valor={resumo.total_atendimentos}
          hint={<>de {resumo.total_registros} registros</>}
        />
        <StatCard
          tom="peach"
          icone={<TrendingDown />}
          rotulo="Faltas"
          valor={resumo.faltas}
          hint="ausências no período"
        />
        <StatCard
          tom="lavender"
          icone={<XCircle />}
          rotulo="Cancelamentos"
          valor={resumo.cancelamentos}
          hint={
            <span className={pctAbsenteismo >= 30 ? "text-danger-ink" : undefined}>
              {pctAbsenteismo}% de absenteísmo total
            </span>
          }
        />
      </div>
    </div>
  );
}
