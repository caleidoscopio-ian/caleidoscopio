"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { StatusAgendamento } from "@/types/agendamento";
import { horaParaMinutos } from "@/lib/ocupacao";
import { formatBRL } from "@/lib/preco-procedimento";
import type { BlocoGrade } from "@/types/ocupacao-profissional";

const formSchema = z.object({
  id: z.string().optional(),
  pacienteId: z.string().min(1, "Selecione um paciente"),
  profissionalId: z.string().min(1, "Selecione um profissional"),
  data: z.date({ message: "Selecione uma data" }),
  datasAdicionais: z.array(z.date()).optional(),
  dataLimite: z.date().optional(),
  diasDaSemana: z.array(z.number()).optional(),
  horario: z.string().min(1, "Informe o horário de início"),
  horario_fim: z.string().min(1, "Informe o horário de fim"),
  sala: z.string().min(1, "Selecione uma sala"),
  procedimento: z.string().optional(),
  status: z.nativeEnum(StatusAgendamento),
  observacoes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TabelaItem {
  id: string;
  nome_procedimento: string;
  codigo_procedimento: string;
  valor_convenio: number;
  procedimentoId?: string | null;
}

interface NovoAgendamentoFormProps {
  pacientes: Array<{ id: string; nome: string; convenioId?: string | null }>;
  profissionais: Array<{ id: string; nome: string; especialidade: string }>;
  salas: Array<{ id: string; nome: string; cor?: string }>;
  procedimentos: Array<{ id: string; nome: string; codigo?: string | null }>;
  convenios: Array<{ id: string; nome: string }>;
  onSubmit: (data: FormValues) => Promise<void>;
  onCancel: () => void;
  defaultValues?: Partial<FormValues>;
  onFetchGrade?: (profissionalId: string) => Promise<BlocoGrade[]>;
  onFetchTabelaConvenio?: (convenioId: string) => Promise<TabelaItem[]>;
}

function verificarForaDaGrade(grade: BlocoGrade[], diaSemana: number, horario: string, horario_fim: string): boolean {
  if (grade.length === 0) return false;
  const ini = horaParaMinutos(horario);
  const fim = horaParaMinutos(horario_fim);
  return !grade.some(
    (b) => b.diaSemana === diaSemana && horaParaMinutos(b.hora_inicio) <= ini && horaParaMinutos(b.hora_fim) >= fim,
  );
}

export function NovoAgendamentoForm({
  pacientes,
  profissionais,
  salas,
  procedimentos,
  convenios,
  onSubmit,
  onCancel,
  defaultValues,
  onFetchGrade,
  onFetchTabelaConvenio,
}: NovoAgendamentoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modoRecorrente, setModoRecorrente] = useState(false);
  const [diasSemana, setDiasSemana] = useState<number[]>([]);

  // Grade
  const [gradeProf, setGradeProf] = useState<BlocoGrade[]>([]);
  const [foraDaGrade, setForaDaGrade] = useState(false);
  const gradeCache = useRef<Record<string, BlocoGrade[]>>({});

  // Convênio + tabela
  const [selectedConvenioId, setSelectedConvenioId] = useState<string | null>(null);
  const [tabelaItens, setTabelaItens] = useState<TabelaItem[]>([]);
  const [tabelaLoading, setTabelaLoading] = useState(false);
  const [selectedTabelaItem, setSelectedTabelaItem] = useState<TabelaItem | null>(null);

  // Modal de resumo
  const [showResumo, setShowResumo] = useState(false);
  const [pendingData, setPendingData] = useState<FormValues | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: StatusAgendamento.AGENDADO,
      sala: "",
      observacoes: "",
      datasAdicionais: [],
      dataLimite: undefined,
      diasDaSemana: [],
      ...defaultValues,
    },
  });

  const profissionalId = form.watch("profissionalId");
  const horario = form.watch("horario");
  const horario_fim = form.watch("horario_fim");
  const data = form.watch("data");
  const pacienteId = form.watch("pacienteId");

  // Auto-preenche convênio do paciente selecionado
  useEffect(() => {
    if (!pacienteId) return;
    const pac = pacientes.find((p) => p.id === pacienteId);
    if (pac?.convenioId) {
      setSelectedConvenioId(pac.convenioId);
    } else {
      setSelectedConvenioId(null);
      setTabelaItens([]);
      setSelectedTabelaItem(null);
      form.setValue("procedimento", undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  // Busca tabela quando convênio muda
  useEffect(() => {
    if (!selectedConvenioId || !onFetchTabelaConvenio) {
      setTabelaItens([]);
      setSelectedTabelaItem(null);
      return;
    }
    setTabelaLoading(true);
    setSelectedTabelaItem(null);
    form.setValue("procedimento", undefined);
    onFetchTabelaConvenio(selectedConvenioId)
      .then(setTabelaItens)
      .catch(() => setTabelaItens([]))
      .finally(() => setTabelaLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConvenioId]);

  // Busca grade do profissional
  useEffect(() => {
    if (!profissionalId || !onFetchGrade) return;
    if (gradeCache.current[profissionalId]) {
      setGradeProf(gradeCache.current[profissionalId]);
      return;
    }
    onFetchGrade(profissionalId).then((g) => {
      gradeCache.current[profissionalId] = g;
      setGradeProf(g);
    });
  }, [profissionalId, onFetchGrade]);

  // Verifica fora da grade
  useEffect(() => {
    if (!horario || !horario_fim || !data || gradeProf.length === 0) {
      setForaDaGrade(false);
      return;
    }
    setForaDaGrade(verificarForaDaGrade(gradeProf, data.getDay(), horario, horario_fim));
  }, [gradeProf, horario, horario_fim, data]);

  const gerarDatasRecorrentes = (dataInicial: Date, dataLimite: Date, diasDaSemana: number[]): Date[] => {
    const datas: Date[] = [];
    const cur = new Date(dataInicial);
    cur.setDate(cur.getDate() + 1);
    while (cur <= dataLimite) {
      if (diasDaSemana.includes(cur.getDay())) datas.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return datas;
  };

  // Ao submeter o form → abre o resumo em vez de enviar direto
  const handleFormSubmit = (values: FormValues) => {
    if (values.dataLimite && values.diasDaSemana && values.diasDaSemana.length > 0) {
      values.datasAdicionais = gerarDatasRecorrentes(values.data, values.dataLimite, values.diasDaSemana);
    }
    setPendingData(values);
    setShowResumo(true);
  };

  // Confirma o resumo e envia
  const handleConfirmarResumo = async () => {
    if (!pendingData) return;
    setIsSubmitting(true);
    try {
      await onSubmit(pendingData);
      setShowResumo(false);
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gerar opções de horário (10 em 10 minutos)
  const horarios: string[] = [];
  for (let hour = 5; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 10) {
      if (hour === 22 && minute > 0) break;
      horarios.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
  }

  // Dados para o resumo
  const pacienteNome = pacientes.find((p) => p.id === pendingData?.pacienteId)?.nome ?? "—";
  const profissionalInfo = profissionais.find((p) => p.id === pendingData?.profissionalId);
  const salaNome = salas.find((s) => s.id === pendingData?.sala)?.nome ?? "—";
  const convenioNome = selectedConvenioId
    ? (convenios.find((c) => c.id === selectedConvenioId)?.nome ?? "—")
    : "Particular";

  const procedimentoLabel = (() => {
    if (!pendingData?.procedimento) return "Sem procedimento";
    if (selectedTabelaItem) return `${selectedTabelaItem.codigo_procedimento} — ${selectedTabelaItem.nome_procedimento}`;
    const proc = procedimentos.find((p) => p.id === pendingData.procedimento);
    return proc ? `${proc.codigo ? proc.codigo + " — " : ""}${proc.nome}` : "—";
  })();

  const valorResumo = selectedTabelaItem ? selectedTabelaItem.valor_convenio : null;

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">

          {/* Paciente */}
          <FormField control={form.control} name="pacienteId" render={({ field }) => (
            <FormItem>
              <FormLabel>Paciente *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {pacientes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          {/* Profissional */}
          <FormField control={form.control} name="profissionalId" render={({ field }) => (
            <FormItem>
              <FormLabel>Profissional *</FormLabel>
              <Select onValueChange={(v) => { field.onChange(v); setGradeProf([]); setForaDaGrade(false); }} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Selecione o profissional" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {profissionais.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome} — {p.especialidade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          {/* Aviso fora da grade */}
          {foraDaGrade && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" aria-hidden="true" />
              <div>
                <span className="font-medium">Fora da grade deste profissional.</span>
                {" "}O horário selecionado não está dentro dos blocos configurados. O agendamento pode ser salvo mesmo assim.
              </div>
            </div>
          )}

          {/* Data + Horário início */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="data" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus locale={ptBR} />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="horario" render={({ field }) => (
              <FormItem>
                <FormLabel>Horário de Início *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {horarios.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Modo recorrente toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Agendamento Recorrente</div>
              <div className="text-xs text-muted-foreground">Replicar em múltiplas datas</div>
            </div>
            <Switch checked={modoRecorrente} onCheckedChange={(checked) => {
              setModoRecorrente(checked);
              if (!checked) { setDiasSemana([]); form.setValue("datasAdicionais", []); form.setValue("dataLimite", undefined); form.setValue("diasDaSemana", []); }
            }} />
          </div>

          {modoRecorrente && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Limite</label>
                <FormField control={form.control} name="dataLimite" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione a data final</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange}
                          disabled={(d) => d < form.watch("data") || d < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus locale={ptBR} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Dias da Semana</label>
                <div className="grid grid-cols-7 gap-2">
                  {[{ label: "Dom", value: 0 }, { label: "Seg", value: 1 }, { label: "Ter", value: 2 }, { label: "Qua", value: 3 }, { label: "Qui", value: 4 }, { label: "Sex", value: 5 }, { label: "Sáb", value: 6 }].map((dia) => {
                    const isSel = diasSemana.includes(dia.value);
                    return (
                      <Button key={dia.value} type="button" variant={isSel ? "default" : "outline"} size="sm" className="w-full"
                        onClick={() => { const nd = isSel ? diasSemana.filter((d) => d !== dia.value) : [...diasSemana, dia.value].sort(); setDiasSemana(nd); form.setValue("diasDaSemana", nd); }}>
                        {dia.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
              {form.watch("dataLimite") && diasSemana.length > 0 && form.watch("data") && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                  Recorrência:{" "}
                  <strong>{diasSemana.map((d) => ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][d]).join(", ")}</strong>
                  {" "}de {format(form.watch("data"), "dd/MM/yyyy", { locale: ptBR })} até {format(form.watch("dataLimite")!, "dd/MM/yyyy", { locale: ptBR })}.
                </div>
              )}
            </div>
          )}

          {/* Horário término + Sala */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="horario_fim" render={({ field }) => (
              <FormItem>
                <FormLabel>Horário de Término *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {horarios.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="sala" render={({ field }) => (
              <FormItem>
                <FormLabel>Sala *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Selecione uma sala" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {salas.filter((s) => s.id).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          {s.cor && <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.cor }} />}
                          {s.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Convênio */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Convênio</label>
            <Select
              value={selectedConvenioId ?? "_particular"}
              onValueChange={(v) => {
                const id = v === "_particular" ? null : v;
                setSelectedConvenioId(id);
                if (!id) { setTabelaItens([]); setSelectedTabelaItem(null); form.setValue("procedimento", undefined); }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o convênio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_particular">Particular</SelectItem>
                {convenios.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            {pacienteId && pacientes.find((p) => p.id === pacienteId)?.convenioId && (
              <p className="text-xs text-muted-foreground">Convênio do paciente pré-selecionado</p>
            )}
          </div>

          {/* Procedimento — filtrado pela tabela do convênio */}
          <FormField control={form.control} name="procedimento" render={({ field }) => (
            <FormItem>
              <FormLabel>
                Procedimento
                {selectedConvenioId && <span className="ml-1 text-xs text-muted-foreground">(tabela do convênio)</span>}
              </FormLabel>
              {tabelaLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground h-10">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando procedimentos do convênio...
                </div>
              ) : (
                <Select
                  onValueChange={(value) => {
                    if (value === "_none") {
                      field.onChange(undefined);
                      setSelectedTabelaItem(null);
                      return;
                    }
                    if (selectedConvenioId) {
                      const item = tabelaItens.find((t) => t.id === value);
                      setSelectedTabelaItem(item ?? null);
                      field.onChange(item?.procedimentoId ?? undefined);
                    } else {
                      setSelectedTabelaItem(null);
                      field.onChange(value);
                    }
                  }}
                  value={selectedConvenioId
                    ? (selectedTabelaItem?.id ?? "_none")
                    : (field.value || "_none")
                  }
                >
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Selecione um procedimento" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="_none">Sem procedimento</SelectItem>
                    {selectedConvenioId
                      ? tabelaItens.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            <div className="flex flex-col">
                              <span>{t.nome_procedimento}</span>
                              <span className="text-xs text-muted-foreground">
                                {t.codigo_procedimento && <span className="font-mono mr-2">{t.codigo_procedimento}</span>}
                                <span className="text-green-600">{formatBRL(t.valor_convenio)}</span>
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      : procedimentos.filter((p) => p.id).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.codigo ? `${p.codigo} — ` : ""}{p.nome}
                          </SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              )}
              {/* Preview de preço quando há item de tabela selecionado */}
              {selectedTabelaItem && (
                <div className="mt-1.5 flex items-center justify-between rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm">
                  <span className="text-green-800 font-medium">{selectedTabelaItem.nome_procedimento}</span>
                  <span className="text-green-700 font-semibold">{formatBRL(selectedTabelaItem.valor_convenio)}</span>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )} />

          {/* Status */}
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={StatusAgendamento.AGENDADO}>Agendado</SelectItem>
                  <SelectItem value={StatusAgendamento.CONFIRMADO}>Confirmado</SelectItem>
                  <SelectItem value={StatusAgendamento.CANCELADO}>Cancelado</SelectItem>
                  <SelectItem value={StatusAgendamento.ATENDIDO}>Atendido</SelectItem>
                  <SelectItem value={StatusAgendamento.FALTOU}>Faltou</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          {/* Observações */}
          <FormField control={form.control} name="observacoes" render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea placeholder="Observações sobre o agendamento..." className="resize-none" rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button type="submit">Revisar agendamento</Button>
          </div>
        </form>
      </Form>

      {/* Modal de resumo */}
      <Dialog open={showResumo} onOpenChange={(open) => { if (!open && !isSubmitting) setShowResumo(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Confirmar Agendamento
            </DialogTitle>
            <DialogDescription>Revise os dados antes de confirmar.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              <div className="text-muted-foreground">Paciente</div>
              <div className="font-medium">{pacienteNome}</div>

              <div className="text-muted-foreground">Profissional</div>
              <div>
                <div className="font-medium">{profissionalInfo?.nome ?? "—"}</div>
                {profissionalInfo?.especialidade && (
                  <div className="text-xs text-muted-foreground">{profissionalInfo.especialidade}</div>
                )}
              </div>

              <div className="text-muted-foreground">Data</div>
              <div className="font-medium">
                {pendingData?.data ? format(pendingData.data, "dd/MM/yyyy (EEEE)", { locale: ptBR }) : "—"}
              </div>

              <div className="text-muted-foreground">Horário</div>
              <div className="font-medium tabular-nums">
                {pendingData?.horario} — {pendingData?.horario_fim}
              </div>

              <div className="text-muted-foreground">Sala</div>
              <div className="font-medium">{salaNome}</div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              <div className="text-muted-foreground">Convênio</div>
              <div className="font-medium">
                {selectedConvenioId ? (
                  <Badge variant="outline" className="text-blue-700 border-blue-300">{convenioNome}</Badge>
                ) : (
                  <span className="text-muted-foreground">Particular</span>
                )}
              </div>

              <div className="text-muted-foreground">Procedimento</div>
              <div className="font-medium">{procedimentoLabel}</div>

              {valorResumo !== null && (
                <>
                  <div className="text-muted-foreground">Valor</div>
                  <div className="font-semibold text-green-700">{formatBRL(valorResumo)}</div>
                </>
              )}
            </div>

            {pendingData?.status && pendingData.status !== StatusAgendamento.AGENDADO && (
              <>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                  <div className="text-muted-foreground">Status</div>
                  <div className="font-medium">{pendingData.status}</div>
                </div>
              </>
            )}

            {pendingData?.observacoes && (
              <>
                <Separator />
                <div>
                  <div className="text-muted-foreground mb-1">Observações</div>
                  <div className="text-sm bg-muted/50 rounded px-3 py-2">{pendingData.observacoes}</div>
                </div>
              </>
            )}

            {modoRecorrente && pendingData?.datasAdicionais && pendingData.datasAdicionais.length > 0 && (
              <>
                <Separator />
                <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
                  Agendamento recorrente: <strong>{pendingData.datasAdicionais.length + 1}</strong> sessões serão criadas.
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowResumo(false)} disabled={isSubmitting}>
              Editar
            </Button>
            <Button onClick={handleConfirmarResumo} disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar agendamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
