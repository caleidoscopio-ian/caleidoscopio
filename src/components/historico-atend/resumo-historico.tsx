"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, DollarSign, TrendingDown, XCircle, ReceiptText } from "lucide-react";
import { formatBRL } from "@/lib/preco-procedimento";
import type { HistoricoResumo } from "@/types/historico-atendimento";

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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
            <CalendarCheck className="h-3.5 w-3.5" />
            Atendimentos Realizados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{resumo.total_atendimentos}</div>
          <p className="text-xs text-muted-foreground mt-0.5">de {resumo.total_registros} registros</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            Valor Total Faturado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatBRL(resumo.valor_total)}</div>
          <p className="text-xs text-muted-foreground mt-0.5">atendimentos realizados</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
            <ReceiptText className="h-3.5 w-3.5" />
            Ticket Médio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatBRL(resumo.ticket_medio)}</div>
          <p className="text-xs text-muted-foreground mt-0.5">por atendimento realizado</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
            <TrendingDown className="h-3.5 w-3.5" />
            Faltas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{resumo.faltas}</div>
          <p className="text-xs text-muted-foreground mt-0.5">ausências no período</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" />
            Cancelamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{resumo.cancelamentos}</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pctAbsenteismo}% de absenteísmo total
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
