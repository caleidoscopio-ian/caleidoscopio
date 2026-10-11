"use client";

// Seletor das filiais em que um usuário opera (Módulo 26).
//
// Substitui o seletor de filial única: a mesma pessoa — uma secretária, por
// exemplo — pode atender a recepção de mais de uma unidade.
//
// Duas coisas que o componente precisa deixar explícitas:
//
//  1. **Lista vazia = SEM RESTRIÇÃO**, não "nenhuma filial". É o comportamento
//     que o sistema sempre teve com `filialId = null`. Como esvaziar AMPLIA o
//     acesso, essa transição específica pede confirmação.
//  2. **Uma das filiais é a principal.** É ela que vai para
//     `UsuarioRole.filialId` (compatibilidade) e que aparece como padrão nas
//     telas que ainda assumem unidade única.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building2, ChevronDown, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilialOpcao {
  id: string;
  nome: string;
  cor?: string | null;
}

interface Props {
  filiais: FilialOpcao[];
  selecionadas: string[];
  principalId: string | null;
  desabilitado?: boolean;
  salvando?: boolean;
  onSalvar: (filialIds: string[], principalId: string | null) => void;
}

export function SeletorFiliaisUsuario({
  filiais,
  selecionadas,
  principalId,
  desabilitado,
  salvando,
  onSalvar,
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<string[]>(selecionadas);
  const [principal, setPrincipal] = useState<string | null>(principalId);
  const [confirmandoLiberar, setConfirmandoLiberar] = useState(false);

  // Reabrir sempre parte do que está salvo, não de um rascunho abandonado
  useEffect(() => {
    if (aberto) {
      setRascunho(selecionadas);
      setPrincipal(principalId);
    }
  }, [aberto, selecionadas, principalId]);

  const alternar = (id: string, marcado: boolean) => {
    setRascunho((atual) => {
      const proximo = marcado ? [...atual, id] : atual.filter((f) => f !== id);
      // Desmarcar a principal passa o posto para a primeira que sobrou
      setPrincipal((p) => (p === id && !marcado ? (proximo[0] ?? null) : (p ?? proximo[0] ?? null)));
      return proximo;
    });
  };

  const mudou =
    rascunho.length !== selecionadas.length ||
    rascunho.some((f) => !selecionadas.includes(f)) ||
    (rascunho.length > 0 && principal !== principalId);

  const aplicar = () => {
    const principalFinal = principal && rascunho.includes(principal) ? principal : (rascunho[0] ?? null);
    onSalvar(rascunho, principalFinal);
    setAberto(false);
  };

  const confirmarOuAplicar = () => {
    // Esvaziar amplia o acesso: o usuário passa a ver todas as unidades
    if (rascunho.length === 0 && selecionadas.length > 0) {
      setConfirmandoLiberar(true);
      return;
    }
    aplicar();
  };

  const resumo = () => {
    if (salvando) return "Salvando...";
    if (selecionadas.length === 0) return "Todas as filiais";
    if (selecionadas.length === 1) {
      return filiais.find((f) => f.id === selecionadas[0])?.nome ?? "1 filial";
    }
    return `${selecionadas.length} filiais`;
  };

  const coresSelecionadas = filiais
    .filter((f) => selecionadas.includes(f.id))
    .slice(0, 3)
    .map((f) => f.cor ?? "#6b7280");

  return (
    <>
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-40 justify-between px-2 text-xs font-normal"
            disabled={desabilitado || salvando}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {salvando ? (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
              ) : selecionadas.length === 0 ? (
                <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
              ) : (
                <span className="flex shrink-0 -space-x-0.5">
                  {coresSelecionadas.map((cor, i) => (
                    <span
                      key={i}
                      className="inline-block h-2 w-2 rounded-full ring-1 ring-background"
                      style={{ backgroundColor: cor }}
                    />
                  ))}
                </span>
              )}
              <span
                className={cn("truncate", selecionadas.length === 0 && "text-muted-foreground")}
              >
                {resumo()}
              </span>
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-64">
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Filiais em que opera</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                A estrela marca a filial principal.
              </p>
            </div>

            <div className="space-y-2">
              {filiais.map((f) => {
                const marcado = rascunho.includes(f.id);
                return (
                  <div key={f.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`fil-${f.id}`}
                      checked={marcado}
                      onCheckedChange={(v) => alternar(f.id, v === true)}
                    />
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: f.cor ?? "#6b7280" }}
                    />
                    <Label
                      htmlFor={`fil-${f.id}`}
                      className="flex-1 cursor-pointer text-sm font-normal"
                    >
                      {f.nome}
                    </Label>
                    {marcado && (
                      <button
                        type="button"
                        onClick={() => setPrincipal(f.id)}
                        title={
                          principal === f.id ? "É a filial principal" : "Tornar filial principal"
                        }
                        aria-label={
                          principal === f.id
                            ? `${f.nome} é a filial principal`
                            : `Tornar ${f.nome} a filial principal`
                        }
                        className="rounded p-0.5 hover:bg-muted"
                      >
                        <Star
                          className={cn(
                            "h-3.5 w-3.5",
                            principal === f.id
                              ? "fill-amber-400 text-amber-500"
                              : "text-muted-foreground"
                          )}
                        />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {rascunho.length === 0 && (
              <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
                Sem filial marcada, o usuário enxerga <strong>todas</strong> as unidades.
              </p>
            )}

            <Separator />

            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={confirmarOuAplicar} disabled={!mudou}>
                Salvar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog open={confirmandoLiberar} onOpenChange={setConfirmandoLiberar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Liberar acesso a todas as filiais?</AlertDialogTitle>
            <AlertDialogDescription>
              Sem nenhuma filial marcada, este usuário passa a enxergar e agendar em{" "}
              <strong>todas as unidades da clínica</strong>. Isso amplia o acesso dele.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmandoLiberar(false);
                aplicar();
              }}
            >
              Liberar todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
