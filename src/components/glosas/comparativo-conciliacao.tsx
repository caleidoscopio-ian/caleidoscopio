"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CheckCircle2, TrendingDown, FileX2, Percent, FileCheck2 } from "lucide-react";
import { formatBRL } from "@/lib/preco-procedimento";
import type { ComparativoConciliacao } from "@/types/conciliacao";

interface ComparativoConciliacaoProps {
  comparativo: ComparativoConciliacao;
}

export function ComparativoConciliacaoView({ comparativo: c }: ComparativoConciliacaoProps) {
  const pctGlosa = Math.round(c.taxa_glosa * 100);
  const pctConciliacao = c.total_guias > 0 ? Math.round((c.guias_conciliadas / c.total_guias) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />Faturado (informado)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{formatBRL(c.valor_informado_total)}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{c.total_demonstrativos} demonstrativo(s)</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />Liberado (pago)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-green-600">{formatBRL(c.valor_liberado_total)}</div>
          <p className="text-xs text-muted-foreground mt-0.5">recebido dos convênios</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
            <TrendingDown className="h-3.5 w-3.5" />Glosado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-red-600">{formatBRL(c.valor_glosa_total)}</div>
          <p className="text-xs text-muted-foreground mt-0.5">valor recusado</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
            <Percent className="h-3.5 w-3.5" />Taxa de Glosa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-xl font-bold ${pctGlosa <= 5 ? "text-green-600" : pctGlosa <= 15 ? "text-amber-600" : "text-red-600"}`}>
            {pctGlosa}%
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">do faturado</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
            <FileCheck2 className="h-3.5 w-3.5" />Conciliação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold">{pctConciliacao}%</div>
          <p className="text-xs text-muted-foreground mt-0.5">{c.guias_conciliadas}/{c.total_guias} guias</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
            <FileX2 className="h-3.5 w-3.5" />Não Conciliadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-xl font-bold ${c.guias_nao_encontradas > 0 ? "text-red-600" : "text-green-600"}`}>
            {c.guias_nao_encontradas}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{c.glosas_geradas} glosas geradas</p>
        </CardContent>
      </Card>
    </div>
  );
}
