"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CATEGORIA_GLOSA_LABEL, STATUS_GLOSA_LABEL, STATUS_GLOSA_BADGE } from "@/types/glosa";
import { formatBRL } from "@/lib/preco-procedimento";
import type { Glosa } from "@/types/glosa";

function fmtDt(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "dd/MM/yyyy", { locale: ptBR });
}

interface TabelaGlosasProps {
  glosas: Glosa[];
  total: number;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
  onDetalhe: (g: Glosa) => void;
  onExcluir: (id: string) => void;
}

export function TabelaGlosas({ glosas, total, page, pageSize, onPage, onDetalhe, onExcluir }: TabelaGlosasProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <div className="rounded-md border overflow-x-auto">
          <Table className="text-xs min-w-[1100px]">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-24">Data Glosa</TableHead>
                <TableHead className="w-24">Dt. Atend.</TableHead>
                <TableHead className="min-w-[140px]">Paciente</TableHead>
                <TableHead className="min-w-[120px]">Profissional</TableHead>
                <TableHead className="min-w-[120px]">Procedimento</TableHead>
                <TableHead className="w-28">Convênio</TableHead>
                <TableHead className="w-28">Categoria</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-24 text-right">Cobrado</TableHead>
                <TableHead className="w-24 text-right">Glosado</TableHead>
                <TableHead className="w-24 text-right">Recuperado</TableHead>
                <TableHead className="w-20 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {glosas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                    Nenhuma glosa encontrada para os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
              {glosas.map((g) => {
                const badgeClass = STATUS_GLOSA_BADGE[g.status] ?? "bg-gray-50 border-gray-300 text-gray-700";
                const saldoPendente = g.valor_recuperado === null && g.status !== "ACATADA" && g.status !== "NEGADA";

                return (
                  <TableRow key={g.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{fmtDt(g.data_glosa)}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtDt(g.data_atendimento)}</TableCell>
                    <TableCell className="font-medium">{g.paciente.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{g.profissional?.nome ?? "—"}</TableCell>
                    <TableCell>
                      {g.procedimento ? (
                        <div>
                          <div>{g.procedimento.nome}</div>
                          {g.procedimento.codigo && <div className="font-mono text-[10px] text-muted-foreground">{g.procedimento.codigo}</div>}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-blue-700">{g.convenio?.nome ?? <span className="text-muted-foreground">Particular</span>}</TableCell>
                    <TableCell>
                      <span className="text-xs">{CATEGORIA_GLOSA_LABEL[g.categoria]}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs px-1.5 py-0.5 border", badgeClass)}>
                        {STATUS_GLOSA_LABEL[g.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatBRL(g.valor_cobrado)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-red-600">{formatBRL(g.valor_glosado)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {g.valor_recuperado !== null ? (
                        <span className="text-green-600 font-medium">{formatBRL(g.valor_recuperado)}</span>
                      ) : saldoPendente ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className="text-gray-400">R$ 0,00</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDetalhe(g)} aria-label="Ver detalhes">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver detalhes / recurso</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => onExcluir(g.id)} aria-label="Excluir glosa">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir glosa</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            {total === 0 ? "0 registros" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Anterior">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onPage(page + 1)} disabled={page >= totalPages} aria-label="Próxima">
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
