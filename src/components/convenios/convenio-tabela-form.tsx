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
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2, FileText } from "lucide-react";
import {
  convenioTabelaSchema,
  type ConvenioTabelaFormData,
  type ConvenioTabela,
  TIPO_GUIA_TISS_LABELS,
} from "@/types/convenio";

interface ProcedimentoOption {
  id: string;
  nome: string;
  codigo: string | null;
  valor: number | null;
  valor_particular: number | null;
  especialidade: string | null;
}

interface ConvenioTabelaFormProps {
  convenioId: string;
  item?: ConvenioTabela | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type Modo = "clinica" | "manual";

const formatBRL = (v: number | null) =>
  v != null
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)
    : null;

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
  const [modo, setModo] = useState<Modo>("clinica");
  const [procedimentos, setProcedimentos] = useState<ProcedimentoOption[]>([]);
  const [procLoading, setProcLoading] = useState(false);
  const [selectedProc, setSelectedProc] = useState<ProcedimentoOption | null>(null);
  const isEditing = !!item;

  const form = useForm<ConvenioTabelaFormData>({
    resolver: zodResolver(convenioTabelaSchema),
    defaultValues: { valor_convenio: 0 },
  });

  // Pré-preencher ao editar
  useEffect(() => {
    if (!open) return;
    if (item) {
      // Se tem procedimentoId vinculado, modo clínica; caso contrário, manual
      setModo(item.procedimentoId ? "clinica" : "manual");
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
        procedimentoId: item.procedimentoId ?? null,
      });
      if (item.procedimento) {
        setSelectedProc({
          id: item.procedimentoId!,
          nome: item.procedimento.nome,
          codigo: item.procedimento.codigo,
          valor: item.procedimento.valor,
          valor_particular: item.procedimento.valor_particular,
          especialidade: null,
        });
      }
    } else {
      setModo("clinica");
      setSelectedProc(null);
      form.reset({ valor_convenio: 0 });
    }
  }, [item, open, form]);

  // Carregar lista de procedimentos da clínica
  useEffect(() => {
    if (!open || !user || modo !== "clinica") return;
    setProcLoading(true);
    fetch("/api/procedimentos?ativo=true&limit=200", {
      headers: {
        "X-User-Data": btoa(JSON.stringify(user)),
        "X-Auth-Token": user.token,
      },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setProcedimentos(d.data ?? []);
      })
      .catch(() => {})
      .finally(() => setProcLoading(false));
  }, [open, user, modo]);

  const handleProcedimentoSelect = (id: string) => {
    const proc = procedimentos.find((p) => p.id === id);
    if (!proc) return;
    setSelectedProc(proc);
    form.setValue("procedimentoId", proc.id);
    form.setValue("codigo_procedimento", proc.codigo || proc.id.slice(0, 8));
    form.setValue("nome_procedimento", proc.nome);
    // Sugerir valor padrão do procedimento (editável pelo usuário)
    if (proc.valor != null) {
      form.setValue("valor_convenio", proc.valor);
    }
    if (proc.valor_particular != null) {
      form.setValue("valor_particular", proc.valor_particular);
    }
  };

  const handleModoChange = (novoModo: Modo) => {
    setModo(novoModo);
    setSelectedProc(null);
    form.reset({ valor_convenio: 0 });
  };

  const onSubmit = async (data: ConvenioTabelaFormData) => {
    if (!user) return;
    setLoading(true);
    try {
      const url = `/api/convenios/${convenioId}/tabela`;
      const method = isEditing ? "PUT" : "POST";
      const payload =
        modo === "clinica"
          ? { ...data, procedimentoId: data.procedimentoId || null }
          : { ...data, procedimentoId: null };

      const body = isEditing ? { itemId: item!.id, ...payload } : payload;

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
          <DialogTitle>
            {isEditing ? "Editar Procedimento" : "Adicionar Procedimento"}
          </DialogTitle>
        </DialogHeader>

        {/* Toggle modo */}
        {!isEditing && (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={modo === "clinica" ? "default" : "outline"}
              onClick={() => handleModoChange("clinica")}
              className="flex-1 gap-2"
            >
              <Link2 className="h-4 w-4" />
              Procedimento da clínica
            </Button>
            <Button
              type="button"
              size="sm"
              variant={modo === "manual" ? "default" : "outline"}
              onClick={() => handleModoChange("manual")}
              className="flex-1 gap-2"
            >
              <FileText className="h-4 w-4" />
              Código manual
            </Button>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Seletor de procedimento da clínica */}
            {modo === "clinica" && !isEditing && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Procedimento *</label>
                {procLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando procedimentos...
                  </div>
                ) : (
                  <Select
                    onValueChange={handleProcedimentoSelect}
                    value={selectedProc?.id ?? ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um procedimento..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {procedimentos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{p.nome}</span>
                            <span className="text-xs text-muted-foreground">
                              {p.codigo && <span className="font-mono mr-2">{p.codigo}</span>}
                              {p.especialidade && p.especialidade}
                              {p.valor != null && (
                                <span className="ml-2 text-green-600">
                                  {formatBRL(p.valor)}
                                </span>
                              )}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedProc && (
                  <div className="rounded-md bg-muted/50 px-3 py-2 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{selectedProc.nome}</span>
                      <Badge variant="outline" className="text-xs">vinculado</Badge>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {selectedProc.codigo && <span className="font-mono">Cód: {selectedProc.codigo}</span>}
                      {selectedProc.valor != null && <span>Valor padrão: {formatBRL(selectedProc.valor)}</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Edição: mostrar procedimento vinculado */}
            {isEditing && item?.procedimento && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.procedimento.nome}</span>
                  <Badge variant="outline" className="text-xs">vinculado à clínica</Badge>
                </div>
                {item.procedimento.valor != null && (
                  <p className="text-xs text-muted-foreground">
                    Valor atual do procedimento: {formatBRL(item.procedimento.valor)}
                  </p>
                )}
              </div>
            )}

            {/* Código manual */}
            {modo === "manual" && (
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
            )}

            {modo === "manual" && (
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
            )}

            {/* Código TISS (modo clínica) */}
            {modo === "clinica" && (
              <FormField
                control={form.control}
                name="codigo_tiss"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código TISS (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Código TISS específico" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Valores */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="valor_convenio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Convênio (R$) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
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
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? null : Number(e.target.value))
                        }
                      />
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
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? null : Number(e.target.value))
                        }
                      />
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
                    <Select
                      onValueChange={(v) => field.onChange(v === "_padrao" ? null : v)}
                      value={field.value ?? "_padrao"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="_padrao">Padrão do convênio</SelectItem>
                        {Object.entries(TIPO_GUIA_TISS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
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
              <Button
                type="submit"
                disabled={loading || (modo === "clinica" && !isEditing && !selectedProc)}
              >
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
