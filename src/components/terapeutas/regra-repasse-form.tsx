"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import {
  regraRepasseSchema,
  type RegraRepasseFormData,
  type RegraRepasse,
  TIPO_REPASSE_LABELS,
} from "@/types/profissional";

interface ConvenioOption {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
}

interface ProcedimentoOption {
  id: string;
  nome: string;
  codigo: string | null;
}

interface RegraRepasseFormProps {
  profissionalId: string;
  regra?: RegraRepasse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RegraRepasseForm({
  profissionalId,
  regra,
  open,
  onOpenChange,
  onSuccess,
}: RegraRepasseFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [convenios, setConvenios] = useState<ConvenioOption[]>([]);
  const [procedimentos, setProcedimentos] = useState<ProcedimentoOption[]>([]);
  const isEditing = !!regra;

  const authHeaders = () => ({
    "X-User-Data": btoa(JSON.stringify(user)),
    "X-Auth-Token": user!.token,
  });

  const form = useForm<RegraRepasseFormData>({
    resolver: zodResolver(regraRepasseSchema),
    defaultValues: {
      tipo: "PERCENTUAL",
      valor: "" as unknown as number,
      descricao: "",
      convenioId: null,
      procedimentoId: null,
      vigencia_inicio: new Date().toISOString().slice(0, 10),
      vigencia_fim: null,
      prioridade: 0,
    },
  });

  const tipoSelecionado = form.watch("tipo");

  useEffect(() => {
    if (!open || !user) return;

    // Carregar convênios e procedimentos disponíveis
    const headers = authHeaders();

    fetch("/api/convenios?status=ATIVO", { headers })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setConvenios(data.data);
      })
      .catch(() => {/* silencioso */});

    fetch("/api/procedimentos", { headers })
      .then((r) => r.json())
      .then((data) => {
        if (data.success || Array.isArray(data)) {
          const list = data.success ? data.data : data;
          setProcedimentos(list);
        }
      })
      .catch(() => {/* silencioso */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  useEffect(() => {
    if (regra) {
      form.reset({
        tipo: regra.tipo,
        valor: Number(regra.valor),
        descricao: regra.descricao || "",
        convenioId: regra.convenioId || null,
        procedimentoId: regra.procedimentoId || null,
        vigencia_inicio: regra.vigencia_inicio.slice(0, 10),
        vigencia_fim: regra.vigencia_fim ? regra.vigencia_fim.slice(0, 10) : null,
        prioridade: regra.prioridade,
      });
    } else {
      form.reset({
        tipo: "PERCENTUAL",
        valor: "" as unknown as number,
        descricao: "",
        convenioId: null,
        procedimentoId: null,
        vigencia_inicio: new Date().toISOString().slice(0, 10),
        vigencia_fim: null,
        prioridade: 0,
      });
    }
  }, [regra, form]);

  const onSubmit = async (data: RegraRepasseFormData) => {
    if (!user) return;
    setLoading(true);

    try {
      const url = `/api/terapeutas/${profissionalId}/regras-repasse`;
      const method = isEditing ? "PUT" : "POST";
      const body = isEditing ? { regraId: regra!.id, ...data } : data;

      const response = await fetch(url, {
        method,
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!result.success) {
        toast({
          title: isEditing ? "Erro ao atualizar" : "Erro ao criar",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: isEditing ? "Regra atualizada" : "Regra criada",
        description: isEditing
          ? "Regra de repasse atualizada com sucesso."
          : "Regra de repasse criada com sucesso.",
      });

      onOpenChange(false);
      onSuccess();
    } catch {
      toast({ title: "Erro inesperado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const valorLabel = tipoSelecionado === "PERCENTUAL" ? "Valor (%)" : "Valor (R$)";
  const valorMax = tipoSelecionado === "PERCENTUAL" ? 100 : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Regra de Repasse" : "Nova Regra de Repasse"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo */}
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Repasse</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(TIPO_REPASSE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Valor */}
            <FormField
              control={form.control}
              name="valor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{valorLabel}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={valorMax}
                      placeholder={tipoSelecionado === "PERCENTUAL" ? "Ex: 40" : "Ex: 80.00"}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? "" : e.target.valueAsNumber
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Convênio */}
            <FormField
              control={form.control}
              name="convenioId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Convênio (opcional)</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "_todos" ? null : v)}
                    value={field.value ?? "_todos"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os convênios" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_todos">Todos os convênios</SelectItem>
                      {convenios.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome_fantasia || c.razao_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Procedimento */}
            <FormField
              control={form.control}
              name="procedimentoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Procedimento (opcional)</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "_todos" ? null : v)}
                    value={field.value ?? "_todos"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os procedimentos" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_todos">Todos os procedimentos</SelectItem>
                      {procedimentos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.codigo ? `[${p.codigo}] ` : ""}{p.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descrição */}
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Repasse padrão, Repasse convênio X..."
                      rows={2}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Vigência */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vigencia_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vigência Início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vigencia_fim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vigência Fim (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Prioridade */}
            <FormField
              control={form.control}
              name="prioridade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridade</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Regras com maior prioridade prevalecem em caso de conflito.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Salvar alterações" : "Criar regra"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
