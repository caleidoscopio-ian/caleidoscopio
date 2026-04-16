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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import {
  convenioTabelaSchema,
  type ConvenioTabelaFormData,
  type ConvenioTabela,
  TIPO_GUIA_TISS_LABELS,
} from "@/types/convenio";

interface ConvenioTabelaFormProps {
  convenioId: string;
  item?: ConvenioTabela | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ConvenioTabelaForm({
  convenioId,
  item,
  open,
  onOpenChange,
  onSuccess,
}: ConvenioTabelaFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isEditing = !!item;

  const form = useForm<ConvenioTabelaFormData>({
    resolver: zodResolver(convenioTabelaSchema),
    defaultValues: { valor_convenio: 0 },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        codigo_procedimento: item.codigo_procedimento,
        nome_procedimento: item.nome_procedimento,
        codigo_tiss: item.codigo_tiss || "",
        valor_convenio: item.valor_convenio,
        valor_particular: item.valor_particular ?? null,
        valor_co_participacao: item.valor_co_participacao ?? null,
        tipo_guia: item.tipo_guia ?? null,
        tipo_tabela: item.tipo_tabela || "",
        grau_participacao: item.grau_participacao || "",
      });
    } else {
      form.reset({ valor_convenio: 0 });
    }
  }, [item, form]);

  const onSubmit = async (data: ConvenioTabelaFormData) => {
    if (!user) return;
    setLoading(true);
    try {
      const url = `/api/convenios/${convenioId}/tabela`;
      const method = isEditing ? "PUT" : "POST";
      const body = isEditing ? { itemId: item!.id, ...data } : data;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": btoa(JSON.stringify(user)),
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao salvar");

      toast({ title: isEditing ? "Procedimento atualizado!" : "Procedimento adicionado!" });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Procedimento" : "Adicionar Procedimento"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="codigo_procedimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 50000470" {...field} disabled={isEditing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="codigo_tiss"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código TISS</FormLabel>
                    <FormControl>
                      <Input placeholder="Código TISS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nome_procedimento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Procedimento *</FormLabel>
                  <FormControl>
                    <Input placeholder="Descrição do procedimento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="valor_convenio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Convênio (R$) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valor_particular"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Particular (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valor_co_participacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Co-participação (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo_guia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Guia</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Padrão do convênio</SelectItem>
                        {Object.entries(TIPO_GUIA_TISS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo_tabela"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo Tabela</FormLabel>
                    <FormControl>
                      <Input placeholder='Ex: "22" (TUSS)' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
