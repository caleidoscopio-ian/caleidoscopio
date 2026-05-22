"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Loader2 } from "lucide-react";
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

const schema = z.object({
  nome:     z.string().min(1, "Nome é obrigatório"),
  cidade:   z.string().optional(),
  endereco: z.string().optional(),
  telefone: z.string().optional(),
  email:    z.string().email("E-mail inválido").optional().or(z.literal("")),
  cor:      z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props { onSuccess?: () => void }

export function NovaFilialDialog({ onSuccess }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nome: "", cidade: "", endereco: "", telefone: "", email: "", cor: "#3b82f6" },
  });

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/filiais", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": btoa(JSON.stringify(user)),
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      toast({ title: "Filial criada com sucesso!" });
      setOpen(false);
      form.reset();
      onSuccess?.();
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Erro ao criar filial", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />Nova Filial</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastrar Nova Filial</DialogTitle>
          <DialogDescription>Preencha os dados da unidade. Campos com * são obrigatórios.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="nome" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl><Input placeholder="Ex: Extrema, Bragança..." {...field} /></FormControl>
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
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : <><Plus className="mr-2 h-4 w-4" />Criar Filial</>}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
