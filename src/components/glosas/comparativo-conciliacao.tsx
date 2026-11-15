"use client";

import { DollarSign, CheckCircle2, TrendingDown, FileX2, Percent, FileCheck2 } from "lucide-react";
import { formatBRL } from "@/lib/preco-procedimento";
import type { ComparativoConciliacao } from "@/types/conciliacao";
import { StatCard } from "@/components/kit";

interface ComparativoConciliacaoProps {
  comparativo: ComparativoConciliacao;
}

export function ComparativoConciliacaoView({ comparativo: c }: ComparativoConciliacaoProps) {
  const pctGlosa = Math.round(c.taxa_glosa * 100);
  const pctConciliacao = c.total_guias > 0 ? Math.round((c.guias_conciliadas / c.total_guias) * 100) : 0;

  return (
    <div className="anim-escalonada grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard
        tom="blue"
        size="sm"
        icone={<DollarSign />}
        rotulo="Faturado (informado)"
        valor={formatBRL(c.valor_informado_total)}
        hint={<>{c.total_demonstrativos} demonstrativo(s)</>}
      />

      <StatCard
        tom="lavender"
        size="sm"
        icone={<CheckCircle2 />}
        rotulo="Liberado (pago)"
        valor={<span className="text-success-ink">{formatBRL(c.valor_liberado_total)}</span>}
        hint="recebido dos convênios"
      />

      <StatCard
        tom="mint"
        size="sm"
        icone={<TrendingDown />}
        rotulo="Glosado"
        valor={<span className="text-danger-ink">{formatBRL(c.valor_glosa_total)}</span>}
        hint="valor recusado"
      />

      <StatCard
        tom="peach"
        size="sm"
        icone={<Percent />}
        rotulo="Taxa de Glosa"
        valor={
          <span
            className={
              pctGlosa <= 5
                ? "text-success-ink"
                : pctGlosa <= 15
                  ? "text-warning-ink"
                  : "text-danger-ink"
            }
          >
            {pctGlosa}%
          </span>
        }
        hint="do faturado"
      />

      <StatCard
        tom="blue"
        size="sm"
        icone={<FileCheck2 />}
        rotulo="Conciliação"
        valor={<>{pctConciliacao}%</>}
        hint={<>{c.guias_conciliadas}/{c.total_guias} guias</>}
      />

      <StatCard
        tom="lavender"
        size="sm"
        icone={<FileX2 />}
        rotulo="Não Conciliadas"
        valor={
          <span
            className={
              c.guias_nao_encontradas > 0 ? "text-danger-ink" : "text-success-ink"
            }
          >
            {c.guias_nao_encontradas}
          </span>
        }
        hint={<>{c.glosas_geradas} glosas geradas</>}
      />
    </div>
  );
}
