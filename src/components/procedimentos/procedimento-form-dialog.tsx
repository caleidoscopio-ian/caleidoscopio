"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { ColorPicker } from "@/components/ui/color-picker";
import { IconPicker } from "@/components/ui/icon-picker";
import { procedimentoSchema, type ProcedimentoFormData, type Procedimento, ESPECIALIDADES } from "@/types/procedimento";

interface ProcedimentoFormDialogProps {
  procedimento?: Procedimento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ProcedimentoFormDialog({ procedimento, open, onOpenChange, onSuccess }: ProcedimentoFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEditing = !!procedimento;

  const authHeaders = () => ({
    "X-User-Data": btoa(JSON.stringify(user)),
    "X-Auth-Token": user!.token,
    "Content-Type": "application/json",
  });

  const form = useForm<ProcedimentoFormData>({
    resolver: zodResolver(procedimentoSchema),
    defaultValues: {
      nome: "",
      codigo: "",
      descricao: "",
      valor: "" as unknown as number,
      valor_particular: "" as unknown as number,
      duracao_padrao: "" as unknown as number,
      tempo_minimo: "" as unknown as number,
      tempo_maximo: "" as unknown as number,
      especialidade: null,
      requer_autorizacao: false,
      observacoes: "",
      cor: null,
      icone: null,
    },
  });

  useEffect(() => {
    if (procedimento) {
      form.reset({
        nome: procedimento.nome,
        codigo: procedimento.codigo || "",
        descricao: procedimento.descricao || "",
        valor: procedimento.valor != null ? Number(procedimento.valor) : "" as unknown as number,
        valor_particular: procedimento.valor_particular != null ? Number(procedimento.valor_particular) : "" as unknown as number,
        duracao_padrao: procedimento.duracao_padrao ?? ("" as unknown as number),
        tempo_minimo: procedimento.tempo_minimo ?? ("" as unknown as number),
        tempo_maximo: procedimento.tempo_maximo ?? ("" as unknown as number),
        especialidade: procedimento.especialidade || null,
        requer_autorizacao: procedimento.requer_autorizacao,
        observacoes: procedimento.observacoes || "",
        cor: procedimento.cor || null,
        icone: procedimento.icone || null,
      });
    } else {
      form.reset({
        nome: "", codigo: "", descricao: "",
        valor: "" as unknown as number,
        valor_particular: "" as unknown as number,
        duracao_padrao: "" as unknown as number,
        tempo_minimo: "" as unknown as number,
        tempo_maximo: "" as unknown as number,
        especialidade: null, requer_autorizacao: false,
        observacoes: "", cor: null, icone: null,
      });
    }
  }, [procedimento, open, form]);

  const onSubmit = async (data: ProcedimentoFormData) => {
    if (!user) return;
    setLoading(true);
    try {
      const url = "/api/procedimentos";
      const method = isEditing ? "PUT" : "POST";
      const body = isEditing ? { id: procedimento!.id, ...data } : data;

      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      const result = await res.json();

      if (!result.success) {
        toast({ title: isEditing ? "Erro ao atualizar" : "Erro ao criar", description: result.error, variant: "destructive" });
        return;
      }

      toast({ title: isEditing ? "Procedimento atualizado" : "Procedimento criado" });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Procedimento" : "Novo Procedimento"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Identificação */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Identificação</p>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="nome" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nome *</FormLabel>
                    <FormControl><Input placeholder="Ex: Sessão de Fonoaudiologia" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="codigo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código (TUSS)</FormLabel>
                    <FormControl><Input placeholder="Ex: 22.01.01.40-6" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="especialidade" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especialidade</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "_none" ? null : v)} value={field.value ?? "_none"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="_none">Nenhuma</SelectItem>
                        {ESPECIALIDADES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Visual */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Identificação Visual</p>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="cor" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <FormControl><ColorPicker value={field.value ?? null} onChange={field.onChange} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="icone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ícone</FormLabel>
                    <FormControl><IconPicker value={field.value ?? null} onChange={field.onChange} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Valores */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valores</p>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="valor" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Padrão (R$)</FormLabel>
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
              </div>
            </div>

            {/* Duração */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Duração (minutos)</p>
              <div className="grid grid-cols-3 gap-3">
                <FormField control={form.control} name="duracao_padrao" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Padrão</FormLabel>
                    <FormControl><Input type="number" min="1" placeholder="45" {...numericField(field)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="tempo_minimo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mínimo</FormLabel>
                    <FormControl><Input type="number" min="1" placeholder="30" {...numericField(field)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="tempo_maximo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Máximo</FormLabel>
                    <FormControl><Input type="number" min="1" placeholder="60" {...numericField(field)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Controle */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Controle</p>
              <FormField control={form.control} name="requer_autorizacao" render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl><Switch checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="!mt-0">Requer autorização prévia</FormLabel>
                </FormItem>
              )} />
              <FormField control={form.control} name="descricao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="Descrição do procedimento..." {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="observacoes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações internas</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="Observações para uso interno..." {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Salvar alterações" : "Criar procedimento"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
