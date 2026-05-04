"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { ColorPicker } from "@/components/ui/color-picker";
import { pacoteSchema, type PacoteFormData, type Pacote, TIPO_PACOTE_LABELS } from "@/types/pacote";
import type { Procedimento } from "@/types/procedimento";
import { formatBRL } from "@/types/procedimento";

interface ConvenioOption { id: string; razao_social: string; nome_fantasia: string | null }

interface PacoteFormDialogProps {
  pacote?: Pacote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PacoteFormDialog({ pacote, open, onOpenChange, onSuccess }: PacoteFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [procedimentos, setProcedimentos] = useState<Procedimento[]>([]);
  const [convenios, setConvenios] = useState<ConvenioOption[]>([]);
  const [selectedProc, setSelectedProc] = useState<string>("");
  const isEditing = !!pacote;

  const authHeaders = () => ({
    "X-User-Data": btoa(JSON.stringify(user)),
    "X-Auth-Token": user!.token,
    "Content-Type": "application/json",
  });

  const form = useForm<PacoteFormData>({
    resolver: zodResolver(pacoteSchema),
    defaultValues: {
      nome: "", descricao: "", tipo: "COMBO_MISTO",
      valor_total: "" as unknown as number,
      valor_particular: "" as unknown as number,
      total_sessoes: "" as unknown as number,
      validade_dias: "" as unknown as number,
      cor: null, icone: null, convenioId: null, observacoes: "",
      procedimentos: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "procedimentos" });

  const watchProcedimentos = form.watch("procedimentos");
  const valorTotal = form.watch("valor_total");

  // Calcular valor original a partir dos procedimentos selecionados
  const valorOriginal = watchProcedimentos.reduce((acc, item) => {
    const proc = procedimentos.find((p) => p.id === item.procedimentoId);
    if (proc?.valor) return acc + Number(proc.valor) * item.quantidade;
    return acc;
  }, 0);

  const desconto = valorOriginal > 0 && valorTotal
    ? Math.round((1 - Number(valorTotal) / valorOriginal) * 100)
    : 0;

  useEffect(() => {
    if (!open || !user) return;
    const h = authHeaders();

    fetch("/api/procedimentos", { headers: h })
      .then((r) => r.json())
      .then((d) => { if (d.success) setProcedimentos(d.data); })
      .catch(() => {});

    fetch("/api/convenios?status=ATIVO", { headers: h })
      .then((r) => r.json())
      .then((d) => { if (d.success) setConvenios(d.data); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  useEffect(() => {
    if (pacote) {
      form.reset({
        nome: pacote.nome,
        descricao: pacote.descricao || "",
        tipo: pacote.tipo,
        valor_total: Number(pacote.valor_total),
        valor_particular: pacote.valor_particular != null ? Number(pacote.valor_particular) : ("" as unknown as number),
        total_sessoes: pacote.total_sessoes ?? ("" as unknown as number),
        validade_dias: pacote.validade_dias ?? ("" as unknown as number),
        cor: pacote.cor || null,
        icone: null,
        convenioId: pacote.convenioId || null,
        observacoes: pacote.observacoes || "",
        procedimentos: pacote.procedimentos?.map((p) => ({
          procedimentoId: p.procedimentoId,
          quantidade: p.quantidade,
          observacoes: p.observacoes || "",
        })) ?? [],
      });
    } else {
      form.reset({
        nome: "", descricao: "", tipo: "COMBO_MISTO",
        valor_total: "" as unknown as number,
        valor_particular: "" as unknown as number,
        total_sessoes: "" as unknown as number,
        validade_dias: "" as unknown as number,
        cor: null, icone: null, convenioId: null, observacoes: "",
        procedimentos: [],
      });
    }
  }, [pacote, open, form]);

  const addProcedimento = () => {
    if (!selectedProc) return;
    const already = fields.some((f) => f.procedimentoId === selectedProc);
    if (already) { toast({ title: "Procedimento já adicionado", variant: "destructive" }); return; }
    append({ procedimentoId: selectedProc, quantidade: 1, observacoes: "" });
    setSelectedProc("");
  };

  const onSubmit = async (data: PacoteFormData) => {
    if (!user) return;
    setLoading(true);
    try {
      const url = isEditing ? `/api/pacotes/${pacote!.id}` : "/api/pacotes";
      const method = isEditing ? "PUT" : "POST";
      const body = { ...data, valor_original: valorOriginal > 0 ? valorOriginal : null };

      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      const result = await res.json();

      if (!result.success) {
        toast({ title: "Erro", description: result.error, variant: "destructive" });
        return;
      }

      toast({ title: isEditing ? "Pacote atualizado" : "Pacote criado" });
      onOpenChange(false);
      onSuccess();
    } catch {
      toast({ title: "Erro inesperado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const numericField = (field: { value: number | null | undefined; onChange: (v: number | string) => void }) => ({
    value: field.value ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      field.onChange(e.target.value === "" ? ("" as unknown as number) : e.target.valueAsNumber),
  });

  const availableProcs = procedimentos.filter((p) => !fields.some((f) => f.procedimentoId === p.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Pacote" : "Novo Pacote de Atendimento"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Dados básicos */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados Básicos</p>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="nome" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nome *</FormLabel>
                    <FormControl><Input placeholder="Ex: Combo 10 sessões Fonoaudiologia" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="tipo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(TIPO_PACOTE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="convenioId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Convênio (opcional)</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "_none" ? null : v)} value={field.value ?? "_none"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="_none">Todos os convênios</SelectItem>
                        {convenios.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Valores */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valores</p>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="valor_total" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Total (R$) *</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" placeholder="0,00" {...numericField(field)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="valor_particular" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Particular (R$)</FormLabel>
                    <FormControl><Input type="number" step="0.01" min="0" placeholder="0,00" {...numericField(field)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="total_sessoes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total de Sessões</FormLabel>
                    <FormControl><Input type="number" min="1" placeholder="10" {...numericField(field)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="validade_dias" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validade (dias)</FormLabel>
                    <FormControl><Input type="number" min="1" placeholder="90" {...numericField(field)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="cor" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor de identificação</FormLabel>
                  <FormControl><ColorPicker value={field.value ?? null} onChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
            </div>

            {/* Composição */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Composição *</p>
              <div className="flex gap-2">
                <Select value={selectedProc} onValueChange={setSelectedProc}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecionar procedimento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProcs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}{p.valor ? ` — ${formatBRL(p.valor)}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" size="sm" onClick={addProcedimento} disabled={!selectedProc}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {form.formState.errors.procedimentos && (
                <p className="text-sm text-destructive">{form.formState.errors.procedimentos.message ?? form.formState.errors.procedimentos.root?.message}</p>
              )}

              {fields.length > 0 && (
                <div className="rounded-md border divide-y">
                  {fields.map((field, index) => {
                    const proc = procedimentos.find((p) => p.id === field.procedimentoId);
                    const subtotal = proc?.valor ? Number(proc.valor) * (watchProcedimentos[index]?.quantidade || 1) : null;
                    return (
                      <div key={field.id} className="flex items-center gap-3 p-2">
                        {proc?.cor && (
                          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: proc.cor }} />
                        )}
                        <span className="flex-1 text-sm font-medium">{proc?.nome || "—"}</span>
                        <Input
                          type="number"
                          min="1"
                          className="w-16 h-7 text-xs text-center"
                          value={watchProcedimentos[index]?.quantidade ?? 1}
                          onChange={(e) => form.setValue(`procedimentos.${index}.quantidade`, e.target.valueAsNumber || 1)}
                        />
                        <span className="text-xs text-muted-foreground w-20 text-right">
                          {subtotal ? formatBRL(subtotal) : "—"}
                        </span>
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(index)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {fields.length > 0 && (
                <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Valor original (soma):</span>
                    <span>{valorOriginal > 0 ? formatBRL(valorOriginal) : "—"}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Valor do pacote:</span>
                    <span>{valorTotal ? formatBRL(Number(valorTotal)) : "—"}</span>
                  </div>
                  {desconto > 0 && (
                    <div className="flex justify-between">
                      <span className="text-green-600">Desconto:</span>
                      <Badge variant="secondary" className="text-green-700 bg-green-100">{desconto}% off</Badge>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            <FormField control={form.control} name="observacoes" render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl><Textarea rows={2} placeholder="Observações internas..." {...field} value={field.value ?? ""} /></FormControl>
              </FormItem>
            )} />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Salvar alterações" : "Criar pacote"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
