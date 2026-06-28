"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { formatBRL } from "@/lib/preco-procedimento";
import {
  STATUS_CONCILIACAO_LABEL, STATUS_CONCILIACAO_BADGE,
} from "@/types/conciliacao";
import type { DemonstrativoDetalhe, StatusConciliacao } from "@/types/conciliacao";

interface ConciliacaoDetalheProps {
  demonstrativoId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FiltroStatus = "TODAS" | StatusConciliacao;

export function ConciliacaoDetalhe({ demonstrativoId, open, onOpenChange }: ConciliacaoDetalheProps) {
  const { user } = useAuth();
  const [dem, setDem] = useState<DemonstrativoDetalhe | null>(null);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState<FiltroStatus>("TODAS");

  useEffect(() => {
    if (!open || !demonstrativoId || !user) return;
    setLoading(true);
    setFiltro("TODAS");
    fetch(`/api/glosas/demonstrativos/${demonstrativoId}`, {
      headers: { "X-User-Data": btoa(JSON.stringify(user)), "X-Auth-Token": user.token },
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setDem(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, demonstrativoId, user]);

  const guiasFiltradas = dem?.guias.filter((g) => filtro === "TODAS" || g.status_conciliacao === filtro) ?? [];

  const contagem = (s: StatusConciliacao) => dem?.guias.filter((g) => g.status_conciliacao === s).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhe da Conciliação</DialogTitle>
          <DialogDescription>
            {dem ? `${dem.operadora_nome ?? "Demonstrativo"} · ${dem.numero_demonstrativo ?? ""}` : "Carregando..."}
          </DialogDescription>
        </DialogHeader>

        {loading && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

        {dem && !loading && (
          <div className="space-y-4">
            {/* Totais */}
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted/40 text-center">
                <div className="text-xs text-muted-foreground">Informado</div>
                <div className="font-semibold">{formatBRL(dem.valor_informado_total)}</div>
              </div>
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-center">
                <div className="text-xs text-green-600">Liberado</div>
                <div className="font-semibold text-green-700">{formatBRL(dem.valor_liberado_total)}</div>
              </div>
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-center">
                <div className="text-xs text-red-600">Glosado</div>
                <div className="font-semibold text-red-700">{formatBRL(dem.valor_glosa_total)}</div>
              </div>
            </div>

            {/* Filtro por status */}
            <div className="flex flex-wrap gap-2">
              {(["TODAS", "CONCILIADO", "CONCILIADO_GLOSA", "NAO_ENCONTRADO"] as FiltroStatus[]).map((s) => (
                <Badge
                  key={s}
                  variant={filtro === s ? "default" : "outline"}
                  className="cursor-pointer select-none"
                  onClick={() => setFiltro(s)}
                >
                  {s === "TODAS" ? `Todas (${dem.guias.length})` : `${STATUS_CONCILIACAO_LABEL[s]} (${contagem(s)})`}
                </Badge>
              ))}
            </div>

            {/* Tabela de guias */}
            <div className="rounded-md border overflow-x-auto">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Status</TableHead>
                    <TableHead>Senha</TableHead>
                    <TableHead>Guia</TableHead>
                    <TableHead>Atendimento (paciente)</TableHead>
                    <TableHead className="text-right">Informado</TableHead>
                    <TableHead className="text-right">Liberado</TableHead>
                    <TableHead className="text-right">Glosado</TableHead>
                    <TableHead>Motivo da Glosa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guiasFiltradas.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma guia neste filtro.</TableCell></TableRow>
                  )}
                  {guiasFiltradas.map((g) => (
                    <TableRow key={g.id} className="hover:bg-muted/30">
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] border", STATUS_CONCILIACAO_BADGE[g.status_conciliacao])}>
                          {STATUS_CONCILIACAO_LABEL[g.status_conciliacao]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{g.senha ?? "—"}</TableCell>
                      <TableCell className="font-mono text-muted-foreground">{g.numero_guia_prestador ?? "—"}</TableCell>
                      <TableCell>
                        {g.agendamento ? (
                          <div>
                            <div className="font-medium">{g.agendamento.paciente}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {format(new Date(g.agendamento.data_hora), "dd/MM/yyyy", { locale: ptBR })}
                              {g.agendamento.procedimento ? ` · ${g.agendamento.procedimento}` : ""}
                            </div>
                          </div>
                        ) : (
                          <span className="text-red-500 text-[11px]">sem atendimento</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatBRL(g.valor_informado)}</TableCell>
                      <TableCell className="text-right tabular-nums text-green-600">{formatBRL(g.valor_liberado)}</TableCell>
                      <TableCell className="text-right tabular-nums text-red-600 font-medium">
                        {g.valor_glosa > 0 ? formatBRL(g.valor_glosa) : "—"}
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        {g.descricao_glosa ? (
                          <span className="text-amber-700">
                            {g.codigo_glosa && <span className="font-mono mr-1">{g.codigo_glosa}</span>}
                            {g.descricao_glosa}
                          </span>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
