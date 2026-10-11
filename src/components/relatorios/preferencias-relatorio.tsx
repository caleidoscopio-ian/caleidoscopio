"use client";

// Painel de preferências do relatório (Fase 5): colunas visíveis e gráfico.
// O agrupamento tem seu próprio seletor, porque é usado a toda hora; aqui ficam
// as escolhas que a pessoa ajusta uma vez e esquece.

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { RotateCcw, Settings2 } from "lucide-react";
import type { DefinicaoRelatorio } from "@/lib/relatorios/definicoes";
import type { PreferenciasRelatorio, TipoGrafico } from "@/hooks/usePreferenciasRelatorio";

const GRAFICOS: { valor: TipoGrafico; rotulo: string }[] = [
  { valor: "barras", rotulo: "Barras" },
  { valor: "barras-empilhadas", rotulo: "Barras empilhadas" },
  { valor: "pizza", rotulo: "Pizza" },
  { valor: "nenhum", rotulo: "Sem gráfico" },
];

interface Props {
  definicao: DefinicaoRelatorio;
  preferencias: PreferenciasRelatorio;
  onAlterar: (p: Partial<PreferenciasRelatorio>) => void;
  onRestaurar: () => void;
  ehPadrao: boolean;
}

export function PreferenciasRelatorioPainel({
  definicao,
  preferencias,
  onAlterar,
  onRestaurar,
  ehPadrao,
}: Props) {
  const alternarColuna = (chave: string, marcado: boolean) => {
    const atual = new Set(preferencias.colunas);
    if (marcado) atual.add(chave);
    else atual.delete(chave);
    // Mantém a ordem do catálogo, não a ordem dos cliques
    const colunas = definicao.metricas.map((m) => m.chave).filter((c) => atual.has(c));
    // Desmarcar tudo deixaria a tabela só com os rótulos: o hook volta ao
    // padrão nesse caso, então aqui só impedimos o clique que esvazia.
    if (colunas.length === 0) return;
    onAlterar({ colunas });
  };

  const total = definicao.metricas.length;
  const marcadas = preferencias.colunas.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Settings2 className="mr-2 h-4 w-4" />
          Preferências
          {!ehPadrao && <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-primary" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between">
              <Label className="text-sm font-medium">Colunas</Label>
              <span className="text-xs text-muted-foreground">
                {marcadas} de {total}
              </span>
            </div>
            <div className="mt-2 space-y-2">
              {definicao.metricas.map((m) => {
                const marcado = preferencias.colunas.includes(m.chave);
                const ultima = marcado && marcadas === 1;
                return (
                  <div key={m.chave} className="flex items-center gap-2">
                    <Checkbox
                      id={`col-${m.chave}`}
                      checked={marcado}
                      disabled={ultima}
                      onCheckedChange={(v) => alternarColuna(m.chave, v === true)}
                    />
                    <Label
                      htmlFor={`col-${m.chave}`}
                      className="text-sm font-normal cursor-pointer"
                      title={ultima ? "Pelo menos uma coluna precisa ficar visível" : undefined}
                    >
                      {m.rotulo}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          <div>
            <Label className="text-sm font-medium">Gráfico</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Mostra o primeiro nível do agrupamento.
            </p>
            <Select
              value={preferencias.grafico}
              onValueChange={(v) => onAlterar({ grafico: v as TipoGrafico })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRAFICOS.map((g) => (
                  <SelectItem key={g.valor} value={g.valor}>
                    {g.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Salvo neste navegador, só para você.
            </p>
            <Button variant="ghost" size="sm" onClick={onRestaurar} disabled={ehPadrao}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Padrão
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
