"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
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
  convenioTissSchema,
  type ConvenioTissFormData,
  type Convenio,
  TIPO_GUIA_TISS_LABELS,
  REGIME_ATENDIMENTO_LABELS,
  CARATER_ATENDIMENTO_LABELS,
} from "@/types/convenio";

interface ConvenioTissFormProps {
  convenio: Convenio;
  onSuccess: () => void;
}

export function ConvenioTissForm({ convenio, onSuccess }: ConvenioTissFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<ConvenioTissFormData>({
    resolver: zodResolver(convenioTissSchema),
    defaultValues: {
      versao_tiss: convenio.versao_tiss || "",
      tipo_guia_padrao: convenio.tipo_guia_padrao ?? null,
      regime_atendimento: convenio.regime_atendimento ?? null,
      carater_atendimento: convenio.carater_atendimento ?? null,
      codigo_operadora: convenio.codigo_operadora || "",
      codigo_prestador: convenio.codigo_prestador || "",
      numero_lote_padrao: convenio.numero_lote_padrao || "",
    },
  });

  const onSubmit = async (data: ConvenioTissFormData) => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch("/api/convenios", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": btoa(JSON.stringify(user)),
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({ id: convenio.id, ...data }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao salvar");

      toast({ title: "Parâmetros TISS atualizados!" });
      onSuccess();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Identificação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identificação TISS</CardTitle>
            <CardDescription>Códigos de identificação junto à operadora</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="versao_tiss"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Versão TISS</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 4.01.00" {...field} />
                  </FormControl>
                  <FormDescription>Versão do padrão TISS da operadora</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="codigo_operadora"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código da Operadora (ANS)</FormLabel>
                  <FormControl>
                    <Input placeholder="Código ANS" {...field} />
                  </FormControl>
                  <FormDescription>Registro da operadora na ANS</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="codigo_prestador"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código do Prestador</FormLabel>
                  <FormControl>
                    <Input placeholder="Código na operadora" {...field} />
                  </FormControl>
                  <FormDescription>Código da clínica junto ao convênio</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="numero_lote_padrao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prefixo de Lote</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: LOT" {...field} />
                  </FormControl>
                  <FormDescription>Prefixo padrão para numeração de lotes</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Parâmetros de Guia */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parâmetros Padrão de Guia</CardTitle>
            <CardDescription>Configurações aplicadas por padrão nas guias TISS</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="tipo_guia_padrao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Guia Padrão</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === "_none" ? null : v)} value={field.value || "_none"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none">Não definido</SelectItem>
                      {Object.entries(TIPO_GUIA_TISS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Tipo de guia mais utilizado neste convênio</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="regime_atendimento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Regime de Atendimento</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === "_none" ? null : v)} value={field.value || "_none"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none">Não definido</SelectItem>
                      {Object.entries(REGIME_ATENDIMENTO_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Regime padrão do atendimento</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="carater_atendimento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caráter de Atendimento</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === "_none" ? null : v)} value={field.value || "_none"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="_none">Não definido</SelectItem>
                      {Object.entries(CARATER_ATENDIMENTO_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Eletivo ou urgência/emergência</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Parâmetros TISS
          </Button>
        </div>
      </form>
    </Form>
  );
}
