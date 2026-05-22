"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Pencil, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem,
  FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Filial } from "@/types/filial";

const schema = z.object({
  nome:     z.string().min(1, "Nome é obrigatório"),
  cidade:   z.string().optional(),
  endereco: z.string().optional(),
  telefone: z.string().optional(),
  email:    z.string().email("E-mail inválido").optional().or(z.literal("")),
  cor:      z.string().optional(),
  ativo:    z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props { filial: Filial; onSuccess?: () => void }

export function EditarFilialDialog({ filial, onSuccess }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome:     filial.nome,
      cidade:   filial.cidade || "",
      endereco: filial.endereco || "",
      telefone: filial.telefone || "",
      email:    filial.email || "",
      cor:      filial.cor || "#3b82f6",
      ativo:    filial.ativo,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        nome:     filial.nome,
        cidade:   filial.cidade || "",
        endereco: filial.endereco || "",
        telefone: filial.telefone || "",
        email:    filial.email || "",
        cor:      filial.cor || "#3b82f6",
        ativo:    filial.ativo,
      });
    }
  }, [open, filial, form]);

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/filiais", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": btoa(JSON.stringify(user)),
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({ id: filial.id, ...data }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast({ title: "Filial atualizada com sucesso!" });
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Erro ao atualizar filial", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Filial</DialogTitle>
          <DialogDescription>Atualize os dados de <strong>{filial.nome}</strong>.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="nome" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="cidade" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl><Input placeholder="Ex: Extrema - MG" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="telefone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl><Input placeholder="(35) 99999-9999" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="endereco" render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço</FormLabel>
                <FormControl><Input placeholder="Rua, número, bairro..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl><Input placeholder="filial@clinica.com.br" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="cor" render={({ field }) => (
              <FormItem>
                <FormLabel>Cor de Identificação</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <Input type="color" {...field} className="w-16 h-10 p-1" />
                    <Input value={field.value} readOnly className="flex-1" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : <><Save className="mr-2 h-4 w-4" />Salvar</>}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
