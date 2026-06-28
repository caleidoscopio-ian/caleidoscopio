"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "@/lib/preco-procedimento";
import type { DemonstrativoResumo } from "@/types/conciliacao";

interface ListaDemonstrativosProps {
  demonstrativos: DemonstrativoResumo[];
  onDetalhe: (id: string) => void;
  onExcluir: (id: string) => void;
}

export function ListaDemonstrativos({ demonstrativos, onDetalhe, onExcluir }: ListaDemonstrativosProps) {
  if (demonstrativos.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm border rounded-lg">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
        Nenhum demonstrativo importado ainda. Faça o upload de um XML acima.
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table className="text-xs">
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>Operadora</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Nº Demonstrativo</TableHead>
            <TableHead>Emissão</TableHead>
            <TableHead className="text-right">Informado</TableHead>
            <TableHead className="text-right">Liberado</TableHead>
            <TableHead className="text-right">Glosado</TableHead>
            <TableHead className="text-center">Guias</TableHead>
            <TableHead>Importado</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {demonstrativos.map((d) => (
            <TableRow key={d.id} className="hover:bg-muted/30">
              <TableCell className="font-medium">{d.operadora_nome ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px]">
                  {d.tipo_demonstrativo === "DEMONSTRATIVO_PAGAMENTO" ? "Pagamento" : "Análise de Conta"}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-muted-foreground">{d.numero_demonstrativo ?? "—"}</TableCell>
              <TableCell>{d.data_emissao ? format(new Date(d.data_emissao), "dd/MM/yyyy", { locale: ptBR }) : "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{formatBRL(d.valor_informado_total)}</TableCell>
              <TableCell className="text-right tabular-nums text-green-600">{formatBRL(d.valor_liberado_total)}</TableCell>
              <TableCell className="text-right tabular-nums text-red-600 font-medium">{formatBRL(d.valor_glosa_total)}</TableCell>
              <TableCell className="text-center">
                <span className="text-green-600 font-medium">{d.guias_conciliadas}</span>
                <span className="text-muted-foreground">/{d.total_guias}</span>
                {d.guias_nao_encontradas > 0 && (
                  <Badge variant="outline" className="ml-1 text-[10px] text-red-600 border-red-300">
                    {d.guias_nao_encontradas} ⚠
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                <div>{d.importado_por_nome}</div>
                <div className="text-[10px]">{format(new Date(d.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDetalhe(d.id)} aria-label="Ver detalhes">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onExcluir(d.id)} aria-label="Excluir">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
