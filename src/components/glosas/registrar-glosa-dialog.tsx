"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Search, ArrowLeft } from "lucide-react";
import { format, subMonths, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/preco-procedimento";
import { CATEGORIA_GLOSA_LABEL } from "@/types/glosa";
import type { CategoriaGlosa } from "@/types/glosa";

const CATEGORIAS = Object.keys(CATEGORIA_GLOSA_LABEL) as CategoriaGlosa[];

const schema = z.object({
  valor_cobrado: z.number().min(0.01, "Informe o valor cobrado"),
  valor_glosado: z.number().min(0.01, "Informe o valor glosado"),
  categoria: z.enum(CATEGORIAS as [CategoriaGlosa, ...CategoriaGlosa[]]),
  codigo_glosa: z.string().optional(),
  motivo: z.string().min(5, "Descreva o motivo (mín. 5 caracteres)"),
  data_glosa: z.string().min(1, "Informe a data da glosa"),
  observacoes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export interface AgendamentoParaGlosa {
  id: string;
  data_hora: string;
  pacienteNome: string;
  profissionalNome?: string | null;
  procedimentoNome?: string | null;
  convenioNome?: string | null;
  valorSugerido?: number | null;
}

interface AtendimentoResultado {
  id: string;
  data_hora: string;
  paciente: { nome: string };
  profissional: { nome: string } | null;
  procedimento: { nome: string; codigo: string | null } | null;
  convenio: { nome: string } | null;
  valor: number | null;
}

interface RegistrarGlosaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamento: AgendamentoParaGlosa | null;
  onSuccess: () => void;
}

export function RegistrarGlosaDialog({ open, onOpenChange, agendamento, onSuccess }: RegistrarGlosaDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Etapa 1 (busca de atendimento) — só aparece quando agendamento não vem pré-selecionado
  const [etapa, setEtapa] = useState<"buscar" | "preencher">(agendamento ? "preencher" : "buscar");
  const [busca, setBusca] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<AtendimentoResultado[]>([]);
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState<AgendamentoParaGlosa | null>(agendamento);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoria: "ADMINISTRATIVA",
      data_glosa: format(new Date(), "yyyy-MM-dd"),
      valor_cobrado: undefined as unknown as number,
      valor_glosado: undefined as unknown as number,
    },
  });

  // Ao abrir/fechar reset
  useEffect(() => {
    if (!open) return;
    if (agendamento) {
      setEtapa("preencher");
      setAgendamentoSelecionado(agendamento);
      form.reset({
        valor_cobrado: agendamento.valorSugerido && agendamento.valorSugerido > 0 ? agendamento.valorSugerido : undefined as unknown as number,
        valor_glosado: undefined as unknown as number,
        categoria: "ADMINISTRATIVA",
        codigo_glosa: "",
        motivo: "",
        data_glosa: format(new Date(), "yyyy-MM-dd"),
        observacoes: "",
      });
    } else {
      setEtapa("buscar");
      setAgendamentoSelecionado(null);
      setBusca("");
      setResultados([]);
    }
  }, [open, agendamento, form]);

  const buscarAtendimentos = async () => {
    if (!user) return;
    setBuscando(true);
    try {
      // Busca os últimos 6 meses de atendimentos ATENDIDO
      const params = new URLSearchParams({
        status: "ATENDIDO",
        pageSize: "30",
        page: "1",
        dataInicio: startOfDay(subMonths(new Date(), 6)).toISOString(),
        dataFim: endOfDay(new Date()).toISOString(),
      });
      if (busca.trim()) params.set("busca", busca.trim());

      const res = await fetch(`/api/relatorios/historico-atendimentos?${params}`, {
        headers: {
          "X-User-Data": btoa(JSON.stringify(user)),
          "X-Auth-Token": user.token,
        },
      });
      const data = await res.json();
      if (data.success) {
        setResultados(data.data ?? []);
      } else {
        console.error("Erro ao buscar atendimentos:", data.error);
        setResultados([]);
      }
    } catch (err) {
      console.error("Erro na busca de atendimentos:", err);
      setResultados([]);
    } finally {
      setBuscando(false);
    }
  };

  // Carregar ao abrir etapa buscar
  useEffect(() => {
    if (open && etapa === "buscar" && !agendamento) {
      buscarAtendimentos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, etapa]);

  const handleSelecionarAtendimento = (at: AtendimentoResultado) => {
    const ag: AgendamentoParaGlosa = {
      id: at.id,
      data_hora: at.data_hora,
      pacienteNome: at.paciente.nome,
      profissionalNome: at.profissional?.nome ?? null,
      procedimentoNome: at.procedimento?.nome ?? null,
      convenioNome: at.convenio?.nome ?? null,
      valorSugerido: at.valor,
    };
    setAgendamentoSelecionado(ag);
    setEtapa("preencher");
    form.reset({
      valor_cobrado: at.valor && at.valor > 0 ? at.valor : undefined as unknown as number,
      valor_glosado: undefined as unknown as number,
      categoria: "ADMINISTRATIVA",
      codigo_glosa: "",
      motivo: "",
      data_glosa: format(new Date(), "yyyy-MM-dd"),
      observacoes: "",
    });
  };

  const onSubmit = async (data: FormValues) => {
    if (!user || !agendamentoSelecionado) {
      // Segurança extra: não deveria acontecer, mas registra no log
      console.error("Tentativa de submit sem agendamento selecionado");
      toast({ title: "Selecione um atendimento primeiro", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/glosas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": btoa(JSON.stringify(user)),
          "X-Auth-Token": user.token,
        },
        body: JSON.stringify({
          agendamentoId: agendamentoSelecionado.id,
          valor_cobrado: data.valor_cobrado,
          valor_glosado: data.valor_glosado,
          categoria: data.categoria,
          codigo_glosa: data.codigo_glosa || undefined,
          motivo: data.motivo,
          data_glosa: data.data_glosa,
          observacoes: data.observacoes || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao registrar glosa");
      toast({ title: "Glosa registrada com sucesso!" });
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast({ title: "Erro ao registrar glosa", description: err instanceof Error ? err.message : "Tente novamente", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Registrar Glosa
          </DialogTitle>
          <DialogDescription>
            {etapa === "buscar"
              ? "Selecione o atendimento a ser glosado"
              : agendamentoSelecionado
                ? `Atendimento de ${agendamentoSelecionado.pacienteNome} em ${format(new Date(agendamentoSelecionado.data_hora), "dd/MM/yyyy", { locale: ptBR })}`
                : "Preencha os dados da glosa"}
          </DialogDescription>
        </DialogHeader>

        {/* ── ETAPA 1: Buscar atendimento ── */}
        {etapa === "buscar" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome do paciente..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") buscarAtendimentos(); }}
                  className="pl-8"
                />
              </div>
              <Button variant="outline" size="sm" onClick={buscarAtendimentos} disabled={buscando} className="gap-1.5">
                {buscando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Buscar
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Atendimentos finalizados nos últimos 6 meses. Digite o nome do paciente e clique em Buscar para filtrar.
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5">
              {buscando && (
                <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />Buscando...
                </div>
              )}
              {!buscando && resultados.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  Nenhum atendimento encontrado. Tente outro nome ou período.
                </div>
              )}
              {!buscando && resultados.map((at) => (
                <button
                  key={at.id}
                  type="button"
                  onClick={() => handleSelecionarAtendimento(at)}
                  className="w-full text-left rounded-md border p-3 hover:bg-muted/60 transition-colors text-sm space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{at.paciente.nome}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {format(new Date(at.data_hora), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {at.profissional && <span>{at.profissional.nome}</span>}
                    {at.procedimento && <span>{at.procedimento.nome}</span>}
                    {at.convenio && <Badge variant="outline" className="text-[10px] h-4 text-blue-700 border-blue-300">{at.convenio.nome}</Badge>}
                    {at.valor !== null && <span className="text-green-700 font-medium">{formatBRL(at.valor)}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── ETAPA 2: Preencher glosa ── */}
        {etapa === "preencher" && agendamentoSelecionado && (
          <>
            {/* Box com dados do atendimento selecionado */}
            <div className="rounded-md bg-muted/40 px-3 py-2 text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">{agendamentoSelecionado.pacienteNome}</span>
                {/* Voltar para seleção apenas quando não veio pré-selecionado */}
                {!agendamento && (
                  <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 text-xs text-muted-foreground"
                    onClick={() => { setEtapa("buscar"); setAgendamentoSelecionado(null); }}>
                    <ArrowLeft className="h-3 w-3" />Trocar
                  </Button>
                )}
              </div>
              {agendamentoSelecionado.profissionalNome && (
                <div className="text-muted-foreground">Profissional: <span className="text-foreground">{agendamentoSelecionado.profissionalNome}</span></div>
              )}
              {agendamentoSelecionado.procedimentoNome && (
                <div className="text-muted-foreground">Procedimento: <span className="text-foreground">{agendamentoSelecionado.procedimentoNome}</span></div>
              )}
              {agendamentoSelecionado.convenioNome && (
                <div className="text-muted-foreground">Convênio: <span className="text-blue-700 font-medium">{agendamentoSelecionado.convenioNome}</span></div>
              )}
              {agendamentoSelecionado.valorSugerido !== null && agendamentoSelecionado.valorSugerido !== undefined && agendamentoSelecionado.valorSugerido > 0 && (
                <div className="text-muted-foreground">Valor cobrado sugerido: <span className="text-green-700 font-medium">{formatBRL(agendamentoSelecionado.valorSugerido)}</span></div>
              )}
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="valor_cobrado" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Cobrado (R$) *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0.01" placeholder="0,00"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="valor_glosado" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Glosado (R$) *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0.01" placeholder="0,00"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="categoria" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{CATEGORIA_GLOSA_LABEL[c]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="codigo_glosa" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código da Glosa</FormLabel>
                      <FormControl><Input placeholder="Ex: GL-001" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="data_glosa" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da Glosa *</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="motivo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo da Glosa *</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descreva o motivo informado pelo convênio..." rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="observacoes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações internas</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Notas internas sobre esta glosa..." rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                  <Button type="submit" disabled={loading} className="gap-2">
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Registrar Glosa
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
