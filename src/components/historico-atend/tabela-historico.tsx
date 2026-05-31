"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Clock, AlertCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { STATUS_AGENDAMENTO_LABELS, STATUS_AGENDAMENTO_BADGE } from "@/types/agendamento";
import { formatBRL } from "@/lib/preco-procedimento";
import type { AtendimentoHistorico } from "@/types/historico-atendimento";

function fmtDt(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "dd/MM/yyyy", { locale: ptBR });
}

function fmtHr(iso: string | null): string {
  if (!iso) return "—";
  return format(new Date(iso), "HH:mm");
}

function fmtMin(min: number | null): string {
  if (min === null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

interface TabelaHistoricoProps {
  linhas: AtendimentoHistorico[];
  total: number;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
  onRegistrarGlosa?: (l: AtendimentoHistorico) => void;
}

export function TabelaHistorico({ linhas, total, page, pageSize, onPage, onRegistrarGlosa }: TabelaHistoricoProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <div className="rounded-md border overflow-x-auto">
          <Table className="text-xs min-w-[1600px]">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-24">Data</TableHead>
                <TableHead className="w-24">Horário</TableHead>
                <TableHead className="w-20">Duração</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="min-w-[140px]">Paciente</TableHead>
                <TableHead className="min-w-[140px]">Profissional</TableHead>
                <TableHead className="min-w-[130px]">Procedimento</TableHead>
                <TableHead className="w-28">Convênio</TableHead>
                <TableHead className="w-24 text-right">Valor</TableHead>
                <TableHead className="w-24">Sala</TableHead>
                <TableHead className="w-24">Filial</TableHead>
                <TableHead className="w-16">Chegada</TableHead>
                <TableHead className="w-16">In. Real</TableHead>
                <TableHead className="w-16">Fi. Real</TableHead>
                <TableHead className="w-20">Espera</TableHead>
                <TableHead className="w-20">Dur. Real</TableHead>
                <TableHead className="min-w-[120px]">Motivo / Obs.</TableHead>
                {onRegistrarGlosa && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={17} className="text-center py-12 text-muted-foreground">
                    Nenhum atendimento encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
              {linhas.map((l) => {
                const badgeClass = STATUS_AGENDAMENTO_BADGE[l.status] ?? "bg-gray-50 border-gray-300 text-gray-800";
                const temObsOuMotivo = l.motivo_falta || l.observacoes;
                return (
                  <TableRow key={l.id} className="hover:bg-muted/30">
                    {/* Data */}
                    <TableCell className="font-medium whitespace-nowrap">
                      {fmtDt(l.data_hora)}
                    </TableCell>

                    {/* Horário */}
                    <TableCell className="whitespace-nowrap tabular-nums">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        {fmtHr(l.data_hora)}–{fmtHr(l.horario_fim)}
                      </div>
                    </TableCell>

                    {/* Duração */}
                    <TableCell className="tabular-nums text-muted-foreground">
                      {fmtMin(l.duracao_minutos)}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("text-xs px-1.5 py-0.5 border", badgeClass)}
                      >
                        {STATUS_AGENDAMENTO_LABELS[l.status] ?? l.status}
                      </Badge>
                    </TableCell>

                    {/* Paciente */}
                    <TableCell className="font-medium">{l.paciente.nome}</TableCell>

                    {/* Profissional */}
                    <TableCell>
                      <div>{l.profissional.nome}</div>
                      {l.profissional.especialidade && (
                        <div className="text-muted-foreground text-[10px]">{l.profissional.especialidade}</div>
                      )}
                    </TableCell>

                    {/* Procedimento */}
                    <TableCell>
                      {l.procedimento ? (
                        <div>
                          <div>{l.procedimento.nome}</div>
                          {l.procedimento.codigo && (
                            <div className="text-muted-foreground font-mono text-[10px]">{l.procedimento.codigo}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Convênio */}
                    <TableCell>
                      {l.convenio ? (
                        <span className="text-blue-700 font-medium">{l.convenio.nome}</span>
                      ) : (
                        <span className="text-muted-foreground">Particular</span>
                      )}
                    </TableCell>

                    {/* Valor */}
                    <TableCell className="text-right tabular-nums">
                      {l.valor !== null ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-semibold cursor-help">
                              {formatBRL(l.valor)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {l.origem_valor === "convenio" ? "Tabela do convênio"
                              : l.origem_valor === "particular" ? "Valor particular"
                              : "Valor padrão"}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Sala */}
                    <TableCell className="text-muted-foreground">{l.sala ?? "—"}</TableCell>

                    {/* Filial */}
                    <TableCell className="text-muted-foreground">{l.filial ?? "—"}</TableCell>

                    {/* Chegada */}
                    <TableCell className="tabular-nums text-muted-foreground">
                      {fmtHr(l.hora_chegada)}
                    </TableCell>

                    {/* Início real */}
                    <TableCell className="tabular-nums text-muted-foreground">
                      {fmtHr(l.hora_inicio_real)}
                    </TableCell>

                    {/* Fim real */}
                    <TableCell className="tabular-nums text-muted-foreground">
                      {fmtHr(l.hora_fim_real)}
                    </TableCell>

                    {/* Espera */}
                    <TableCell className="tabular-nums">
                      {l.tempo_espera_min !== null && l.tempo_espera_min > 15 ? (
                        <span className="text-amber-600 font-medium">{fmtMin(l.tempo_espera_min)}</span>
                      ) : (
                        <span className="text-muted-foreground">{fmtMin(l.tempo_espera_min)}</span>
                      )}
                    </TableCell>

                    {/* Duração real */}
                    <TableCell className="tabular-nums text-muted-foreground">
                      {fmtMin(l.duracao_real_min)}
                    </TableCell>

                    {/* Motivo / Obs */}
                    <TableCell>
                      {temObsOuMotivo ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-help max-w-[110px]">
                              <AlertCircle className="h-3 w-3 text-orange-500 flex-shrink-0" />
                              <span className="truncate text-muted-foreground">
                                {l.motivo_falta ?? l.observacoes}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[240px]">
                            {l.motivo_falta && <p><strong>Motivo:</strong> {l.motivo_falta}</p>}
                            {l.observacoes && <p><strong>Obs:</strong> {l.observacoes}</p>}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Atalho: registrar glosa (só ATENDIDO) */}
                    {onRegistrarGlosa && (
                      <TableCell className="text-center">
                        {l.status === "ATENDIDO" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => onRegistrarGlosa(l)}
                                aria-label="Registrar glosa"
                              >
                                <AlertTriangle className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Registrar glosa</TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>
            {total === 0 ? "0 registros" : `${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, total)} de ${total} registros`}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="icon" className="h-7 w-7"
              onClick={() => onPage(page - 1)}
              disabled={page <= 1}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline" size="icon" className="h-7 w-7"
              onClick={() => onPage(page + 1)}
              disabled={page >= totalPages}
              aria-label="Próxima página"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
