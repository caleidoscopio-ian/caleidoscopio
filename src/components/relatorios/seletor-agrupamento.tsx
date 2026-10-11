"use client";

// Seletor de agrupamento em até 3 níveis, no modelo do Feegow.
//
// Cada nível é um dropdown. Uma dimensão já usada não reaparece nos níveis
// seguintes, e limpar um nível descarta os de baixo — "agrupar por nada e
// depois por profissional" não significa nada.

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layers, X } from "lucide-react";
import { MAX_NIVEIS } from "@/lib/relatorios/agregacao";
import type { Dimensao } from "@/types/relatorio";

const NENHUM = "__nenhum__";

interface Props {
  dimensoes: Dimensao[];
  valor: string[];
  onChange: (niveis: string[]) => void;
  desabilitado?: boolean;
}

export function SeletorAgrupamento({ dimensoes, valor, onChange, desabilitado }: Props) {
  // Um dropdown por nível já escolhido, mais um vazio para acrescentar
  const slots = Math.min(valor.length + 1, MAX_NIVEIS);

  const alterar = (indice: number, chave: string) => {
    if (chave === NENHUM) {
      // limpar um nível descarta os seguintes
      onChange(valor.slice(0, indice));
      return;
    }
    const novo = [...valor.slice(0, indice), chave];
    onChange(novo.slice(0, MAX_NIVEIS));
  };

  const rotulo = (chave: string) => dimensoes.find((d) => d.chave === chave)?.rotulo ?? chave;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-1.5 self-center pt-5 text-sm text-muted-foreground">
        <Layers className="h-4 w-4" />
        Agrupar por
      </div>

      {Array.from({ length: slots }).map((_, i) => {
        const atual = valor[i] ?? null;
        // não repetir dimensão já usada em outro nível
        const disponiveis = dimensoes.filter(
          (d) => d.chave === atual || !valor.includes(d.chave)
        );
        return (
          <div key={i} className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {i === 0 ? "Nível 1" : i === 1 ? "Nível 2" : "Nível 3"}
            </Label>
            <Select
              value={atual ?? NENHUM}
              onValueChange={(v) => alterar(i, v)}
              disabled={desabilitado}
            >
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Escolher" />
              </SelectTrigger>
              <SelectContent>
                {i > 0 && <SelectItem value={NENHUM}>(nenhum)</SelectItem>}
                {disponiveis.map((d) => (
                  <SelectItem key={d.chave} value={d.chave}>
                    {d.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}

      {valor.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          className="self-end"
          disabled={desabilitado}
          onClick={() => onChange(valor.slice(0, 1))}
          title={`Manter só o agrupamento por ${rotulo(valor[0])}`}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Só nível 1
        </Button>
      )}
    </div>
  );
}
