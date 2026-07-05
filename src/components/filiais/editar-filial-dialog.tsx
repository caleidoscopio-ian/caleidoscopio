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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Filial } from "@/types/filial";
import { formatCNPJ, formatCEP, isValidCNPJ, UF_OPTIONS } from "@/lib/masks";
import { buscarEnderecoPorCep } from "@/lib/viacep";

const schema = z.object({
  nome:                  z.string().min(1, "Nome fantasia é obrigatório"),
  razao_social:          z.string().optional(),
  cnpj:                  z.string().optional().refine((val) => !val || isValidCNPJ(val), "CNPJ inválido"),
  cnes:                  z.string().optional(),
  tipo_estabelecimento:  z.string().optional(),
  cep:                   z.string().optional(),
  logradouro:            z.string().optional(),
  numero:                z.string().optional(),
  complemento:           z.string().optional(),
  bairro:                z.string().optional(),
  cidade:                z.string().optional(),
  estado:                z.string().optional(),
  endereco:              z.string().optional(),
  telefone:              z.string().optional(),
  email:                 z.string().email("E-mail inválido").optional().or(z.literal("")),
  cor:                   z.string().optional(),
  ativo:                 z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props { filial: Filial; onSuccess?: () => void }

function buildDefaultValues(filial: Filial): FormData {
  return {
    nome:                 filial.nome,
    razao_social:         filial.razao_social || "",
    cnpj:                 filial.cnpj || "",
    cnes:                 filial.cnes || "",
    tipo_estabelecimento: filial.tipo_estabelecimento || "",
    cep:                  filial.cep || "",
    logradouro:           filial.logradouro || "",
    numero:               filial.numero || "",
    complemento:          filial.complemento || "",
    bairro:               filial.bairro || "",
    cidade:               filial.cidade || "",
    estado:               filial.estado || "",
    endereco:             filial.endereco || "",
    telefone:             filial.telefone || "",
    email:                filial.email || "",
    cor:                  filial.cor || "#3b82f6",
    ativo:                filial.ativo,
  };
}

export function EditarFilialDialog({ filial, onSuccess }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(filial),
  });

  useEffect(() => {
    if (open) {
      form.reset(buildDefaultValues(filial));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filial]);

  const handleCepBlur = async (cep: string) => {
    const endereco = await buscarEnderecoPorCep(cep);
    if (endereco) {
      form.setValue("logradouro", endereco.logradouro);
      form.setValue("bairro", endereco.bairro);
      form.setValue("cidade", endereco.localidade);
      form.setValue("estado", endereco.uf);
    }
  };

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Filial</DialogTitle>
          <DialogDescription>Atualize os dados de <strong>{filial.nome}</strong>.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Fantasia *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="razao_social" render={({ field }) => (
                <FormItem>
                  <FormLabel>Razão Social</FormLabel>
                  <FormControl><Input placeholder="Razão social da unidade" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField control={form.control} name="cnpj" render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="00.000.000/0000-00"
                      {...field}
                      onChange={(e) => field.onChange(formatCNPJ(e.target.value))}
                      maxLength={18}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cnes" render={({ field }) => (
                <FormItem>
                  <FormLabel>CNES</FormLabel>
                  <FormControl><Input placeholder="0000000" {...field} maxLength={7} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="tipo_estabelecimento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Estabelecimento</FormLabel>
                  <FormControl><Input placeholder="Ex: Clínica" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField control={form.control} name="cep" render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="00000-000"
                      {...field}
                      onChange={(e) => field.onChange(formatCEP(e.target.value))}
                      onBlur={(e) => { field.onBlur(); handleCepBlur(e.target.value); }}
                      maxLength={9}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="logradouro" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Logradouro</FormLabel>
                  <FormControl><Input placeholder="Rua, Avenida..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField control={form.control} name="numero" render={({ field }) => (
                <FormItem>
                  <FormLabel>Número</FormLabel>
                  <FormControl><Input placeholder="Ex: 123 ou S/N" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="complemento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Complemento</FormLabel>
                  <FormControl><Input placeholder="Sala, bloco..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="bairro" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro</FormLabel>
                  <FormControl><Input placeholder="Bairro" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField control={form.control} name="cidade" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Cidade</FormLabel>
                  <FormControl><Input placeholder="Ex: Extrema" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="estado" render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {UF_OPTIONS.map((uf) => (
                        <SelectItem key={uf.value} value={uf.value}>{uf.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="telefone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl><Input placeholder="(35) 99999-9999" {...field} /></FormControl>
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
            </div>

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
