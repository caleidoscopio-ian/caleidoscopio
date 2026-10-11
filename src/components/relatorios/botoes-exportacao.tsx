"use client";

// Botão de exportação da central (Fase 4).
//
// Exporta a partir do resultado já em tela — o arquivo e a tela mostram
// obrigatoriamente o mesmo número. Usado no topo (relatório inteiro) e em cada
// grupo (recorte daquele subtotal), como nos prints do Feegow.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  exportarDetalheCSV,
  exportarPDF,
  exportarResumoCSV,
  temDetalhe,
  type ContextoExportacao,
} from "@/lib/relatorios/exportacao";

interface Props {
  contexto: ContextoExportacao;
  desabilitado?: boolean;
  /** compacto = o botão discreto que aparece na linha de cada grupo */
  compacto?: boolean;
}

export function BotoesExportacao({ contexto, desabilitado, compacto }: Props) {
  const { toast } = useToast();
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const vazio = contexto.total.linhas === 0;
  const comDetalhe = temDetalhe(contexto.grupos);

  const falhou = (o: unknown) =>
    toast({
      title: "Não foi possível gerar o arquivo",
      description: o instanceof Error ? o.message : undefined,
      variant: "destructive",
    });

  const resumoCsv = () => {
    try {
      exportarResumoCSV(contexto);
    } catch (o) {
      falhou(o);
    }
  };

  const detalheCsv = () => {
    try {
      exportarDetalheCSV(contexto);
    } catch (o) {
      falhou(o);
    }
  };

  const pdf = async () => {
    setGerandoPdf(true);
    try {
      await exportarPDF(contexto);
    } catch (o) {
      falhou(o);
    } finally {
      setGerandoPdf(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compacto ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-muted-foreground hover:text-foreground"
            disabled={desabilitado || vazio}
            onClick={(e) => e.stopPropagation()}
            title={`Exportar só "${contexto.sufixo ?? ""}"`}
            aria-label={`Exportar ${contexto.sufixo ?? "grupo"}`}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button variant="outline" disabled={desabilitado || vazio}>
            {gerandoPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Exportar
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {contexto.sufixo ? `Recorte: ${contexto.sufixo}` : "Relatório inteiro"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={resumoCsv}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          CSV — resumo agrupado
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={detalheCsv} disabled={!comDetalhe}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          CSV — linha a linha
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={pdf} disabled={gerandoPdf}>
          <FileText className="mr-2 h-4 w-4" />
          PDF — resumo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
