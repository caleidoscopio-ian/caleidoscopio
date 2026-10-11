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
import { Input } from "@/components/ui/input";
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
import { formatBRL } from "@/lib/preco-procedimento";
import type { BlocoGrade } from "@/types/ocupacao-profissional";
import {
  foraDaGrade as calcularForaDaGrade,
  temGrade,
  gerarHorarios,
  horariosInicioDisponiveis,
  horariosFimDisponiveis,
  resumoBlocosDoDia,
  datasForaDaGrade,
  gradeDaFilial as recortarGradeDaFilial,
} from "@/lib/grade-agendamento";

const formSchema = z.object({
  id: z.string().optional(),
  pacienteId: z.string().min(1, "Selecione um paciente"),
  profissionalId: z.string().min(1, "Selecione um profissional"),
  data: z.date({ message: "Selecione uma data" }),
  datasAdicionais: z.array(z.date()).optional(),
  dataLimite: z.date().optional(),
  diasDaSemana: z.array(z.number()).optional(),
  valor_particular: z.number().min(0, "Valor não pode ser negativo").optional(),
  horario: z.string().min(1, "Informe o horário de início"),
  horario_fim: z.string().min(1, "Informe o horário de fim"),
  // Módulo 26: unidade do atendimento. Escolhida antes da sala, porque é ela
  // que define quais salas existem.
  filialId: z.string().min(1, "Selecione a filial"),
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
  pacientes: Array<{
    id: string;
    nome: string;
    convenioId?: string | null;
    /** Convênios do paciente. O dropdown só oferece estes + Particular. */
    convenios?: Array<{ id: string; nome: string }>;
  }>;
  profissionais: Array<{ id: string; nome: string; especialidade: string }>;
  salas: Array<{ id: string; nome: string; cor?: string; filialId?: string | null }>;
  procedimentos: Array<{ id: string; nome: string; codigo?: string | null }>;
  convenios: Array<{ id: string; nome: string }>;
  onSubmit: (data: FormValues) => Promise<void>;
  onCancel: () => void;
  defaultValues?: Partial<FormValues>;
  onFetchGrade?: (profissionalId: string) => Promise<BlocoGrade[]>;
  onFetchTabelaConvenio?: (convenioId: string) => Promise<TabelaItem[]>;
  /** Filiais em que o profissional pode ser agendado (grade ∩ escopo do usuário) */
  onFetchFiliais?: (profissionalId: string) => Promise<FiliaisDoProfissional>;
}

export interface FilialAgendavel {
  id: string;
  nome: string;
  cor: string | null;
  blocosNaGrade: number;
  viaGradeCoringa: boolean;
  temSalaAtiva: boolean;
  salasAtivas: number;
}

export interface FiliaisDoProfissional {
  filiais: FilialAgendavel[];
  temGrade: boolean;
  foraDoEscopoDoUsuario: string[];
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
  onFetchFiliais,
}: NovoAgendamentoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modoRecorrente, setModoRecorrente] = useState(false);
  // Na edição o agendamento base já existe: a recorrência só acrescenta ocorrências
  const editandoExistente = Boolean(defaultValues?.id);
  const [diasSemana, setDiasSemana] = useState<number[]>([]);

  // Grade
  const [gradeProf, setGradeProf] = useState<BlocoGrade[]>([]);
  const [foraDaGrade, setForaDaGrade] = useState(false);
  const [erroGrade, setErroGrade] = useState<string | null>(null);
  const gradeCache = useRef<Record<string, BlocoGrade[]>>({});

  // Filial (Módulo 26): profissional → filial → sala
  const [filiaisProf, setFiliaisProf] = useState<FilialAgendavel[]>([]);
  const [filiaisLoading, setFiliaisLoading] = useState(false);
  const [diagFiliais, setDiagFiliais] = useState<{
    temGrade: boolean;
    foraDoEscopoDoUsuario: string[];
  } | null>(null);

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
      filialId: "",
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

  // Convênios que o PACIENTE tem. O dropdown oferece só estes mais
  // "Particular" — a recepção não pode marcar num convênio que o paciente não
  // tem. Era possível antes, e foi assim que um atendimento de paciente da
  // unimed foi marcado como HAPVIDA: o preço era procurado na unimed (que não
  // tem o procedimento na tabela) e o relatório mostrava unimed como parceiro.
  //
  // A lista vem de `PacienteConvenio`, com o campo legado `convenioId` como
  // fallback — 4 pacientes só têm o legado preenchido, e sem o fallback eles
  // ficariam restritos a Particular.
  const pacienteSelecionado = pacientes.find((p) => p.id === pacienteId);
  const conveniosDoPaciente = pacienteSelecionado
    ? pacienteSelecionado.convenios && pacienteSelecionado.convenios.length > 0
      ? pacienteSelecionado.convenios
      : pacienteSelecionado.convenioId
        ? [
            {
              id: pacienteSelecionado.convenioId,
              nome:
                convenios.find((c) => c.id === pacienteSelecionado.convenioId)?.nome ??
                "Convênio do paciente",
            },
          ]
        : []
    : [];

  const filialId = form.watch("filialId");

  // Auto-preenche o convênio ao escolher o paciente.
  //
  // Usa a lista derivada, não só o campo legado: um paciente com convênio
  // apenas em `PacienteConvenio` cairia em "Particular" se olhássemos somente
  // `convenioId`. Com mais de um convênio, nenhum é pré-selecionado — a escolha
  // é do atendimento e precisa ser explícita.
  useEffect(() => {
    if (!pacienteId) return;

    const unico = conveniosDoPaciente.length === 1 ? conveniosDoPaciente[0].id : null;
    const preferido =
      pacienteSelecionado?.convenioId &&
      conveniosDoPaciente.some((c) => c.id === pacienteSelecionado.convenioId)
        ? pacienteSelecionado.convenioId
        : unico;

    setSelectedConvenioId(preferido);
    if (!preferido) {
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

  // Filiais em que ESTE profissional pode ser agendado. Trocar o profissional
  // invalida filial e sala: a unidade dele pode ser outra, e a sala pertence à
  // unidade.
  useEffect(() => {
    if (!profissionalId || !onFetchFiliais) return;
    let cancelado = false;
    setFiliaisLoading(true);
    onFetchFiliais(profissionalId)
      .then((r) => {
        if (cancelado) return;
        setFiliaisProf(r.filiais);
        setDiagFiliais({ temGrade: r.temGrade, foraDoEscopoDoUsuario: r.foraDoEscopoDoUsuario });

        const atual = form.getValues("filialId");
        const aindaVale = atual && r.filiais.some((f) => f.id === atual);
        if (aindaVale) return;

        // Uma única opção não é escolha: preenche sozinho
        const unica = r.filiais.length === 1 ? r.filiais[0].id : "";
        form.setValue("filialId", unica, { shouldValidate: false });
        form.setValue("sala", "", { shouldValidate: false });
      })
      .catch(() => {
        if (!cancelado) {
          setFiliaisProf([]);
          setDiagFiliais(null);
        }
      })
      .finally(() => {
        if (!cancelado) setFiliaisLoading(false);
      });
    return () => {
      cancelado = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profissionalId, onFetchFiliais]);

  // Trocar a filial invalida a sala — a sala escolhida pode ser de outra unidade
  useEffect(() => {
    const salaAtual = form.getValues("sala");
    if (!salaAtual) return;
    const sala = salas.find((s) => s.id === salaAtual);
    if (sala && filialId && sala.filialId && sala.filialId !== filialId) {
      form.setValue("sala", "", { shouldValidate: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filialId]);

  // Salas da filial escolhida. Sala com filial nula serve a qualquer unidade.
  const salasDaFilial = filialId
    ? salas.filter((s) => !s.filialId || s.filialId === filialId)
    : salas;

  // A grade é por filial: escolher a unidade estreita os horários disponíveis.
  //
  // `semGradeNestaFilial` existe porque lista vazia tem DOIS significados
  // diferentes: "grade não configurada" (libera qualquer horário, comportamento
  // preservado) e "tem grade, mas em outra unidade" — que NÃO pode liberar nada,
  // senão escolher a filial errada abriria a agenda inteira.
  const { blocos: gradeDaFilial, semGradeNestaFilial } = recortarGradeDaFilial(
    gradeProf,
    filialId || null
  );

  // POLÍTICA (decidida em 10/10/2026): cadastro incompleto não libera a agenda.
  //
  // Antes, profissional sem grade nenhuma ficava SEM restrição — qualquer
  // horário, qualquer dia. Para um cadastro que ainda vai ser configurado, isso
  // é o oposto do desejado: abre a agenda inteira de quem nem foi configurado.
  //
  // Agora os dois casos bloqueiam igual:
  //   sem grade em lugar nenhum  → configure a grade do profissional
  //   sem grade NESTA unidade    → configure a grade desta filial
  const semGradeNenhuma = profissionalId ? !temGrade(gradeProf) : false;
  const bloqueadoPorGrade = semGradeNenhuma || semGradeNestaFilial;

  // Verifica fora da grade
  useEffect(() => {
    if (bloqueadoPorGrade) {
      setForaDaGrade(true);
      return;
    }
    if (!horario || !horario_fim || !data || gradeDaFilial.length === 0) {
      setForaDaGrade(false);
      return;
    }
    setForaDaGrade(calcularForaDaGrade(gradeDaFilial, data.getDay(), horario, horario_fim));
    setErroGrade(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeProf, filialId, bloqueadoPorGrade, horario, horario_fim, data]);

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

    // O profissional tem grade, mas não nesta unidade: não há horário válido
    // aqui, então nada pode ser salvo. Bloquear é o mesmo tratamento que um
    // horário fora da grade já recebia — não um comportamento novo.
    const nomeFilial = filiaisProf.find((f) => f.id === values.filialId)?.nome;
    if (semGradeNenhuma) {
      setErroGrade(
        "Este profissional não tem grade de atendimento configurada em nenhuma " +
          "unidade, então não é possível agendar com ele. Configure a grade em " +
          "Agenda › Grade de Horários."
      );
      return;
    }
    if (semGradeNestaFilial) {
      setErroGrade(
        `Este profissional não tem grade de atendimento configurada em ` +
          `${nomeFilial ?? "nesta filial"}. Configure a grade desta unidade em ` +
          `Agenda › Grade de Horários, ou escolha outra filial.`
      );
      return;
    }

    // Fora da grade não salva. Vale para a data principal e para cada ocorrência
    // da recorrência, que pode cair em dia da semana com grade diferente.
    const todasAsDatas = [values.data, ...(values.datasAdicionais ?? [])];
    const invalidas = datasForaDaGrade(
      gradeDaFilial,
      todasAsDatas,
      values.horario,
      values.horario_fim
    );

    if (invalidas.length > 0) {
      setErroGrade(
        invalidas.length === todasAsDatas.length
          ? `O horário escolhido está fora da grade deste profissional${
              nomeFilial ? ` em ${nomeFilial}` : ""
            }. Ajuste o horário ou a data.`
          : `${invalidas.length} de ${todasAsDatas.length} datas da recorrência caem fora da grade deste profissional (${invalidas
              .slice(0, 3)
              .map((d) => format(d, "dd/MM", { locale: ptBR }))
              .join(", ")}${invalidas.length > 3 ? "…" : ""}). Ajuste o horário ou os dias da semana.`
      );
      return;
    }

    setErroGrade(null);
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

  // Opções de horário limitadas à grade do profissional no dia escolhido.
  // Sem grade cadastrada, mantém a lista completa de 05:00 às 22:00.
  const todosHorarios = gerarHorarios();
  const diaSemanaSelecionado = data ? data.getDay() : null;
  const horariosInicio =
    diaSemanaSelecionado === null
      ? todosHorarios
      : bloqueadoPorGrade
        ? []
        : horariosInicioDisponiveis(gradeDaFilial, diaSemanaSelecionado, todosHorarios);
  const horariosFim =
    diaSemanaSelecionado === null
      ? todosHorarios
      : bloqueadoPorGrade
        ? []
        : horariosFimDisponiveis(gradeDaFilial, diaSemanaSelecionado, horario, todosHorarios);
  const profissionalTemGrade = temGrade(gradeDaFilial);
  const semAtendimentoNoDia =
    profissionalTemGrade && diaSemanaSelecionado !== null && horariosInicio.length === 0;

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

          {/* Profissional não atende no dia escolhido */}
          {/* Sem grade em lugar nenhum: cadastro incompleto não libera a agenda */}
          {semGradeNenhuma && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" aria-hidden="true" />
              <div>
                <span className="font-medium">
                  Este profissional não tem grade de atendimento configurada.
                </span>{" "}
                Não é possível agendar com ele até a grade existir. Configure em
                Agenda › Grade de Horários.
              </div>
            </div>
          )}

          {/* Tem grade, mas não nesta unidade: nenhum horário é válido aqui.
              Mensagem própria, porque a ação é outra — configurar a grade DESTA
              filial, não mudar a data. */}
          {!semGradeNenhuma && semGradeNestaFilial && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" aria-hidden="true" />
              <div>
                <span className="font-medium">
                  Sem grade configurada em{" "}
                  {filiaisProf.find((f) => f.id === filialId)?.nome ?? "nesta filial"}.
                </span>{" "}
                Este profissional tem grade em outra unidade. Configure a grade desta
                filial em Agenda › Grade de Horários, ou escolha outra filial.
              </div>
            </div>
          )}

          {!bloqueadoPorGrade && semAtendimentoNoDia && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" aria-hidden="true" />
              <div>
                <span className="font-medium">Este profissional não atende neste dia.</span>
                {" "}Escolha outra data ou ajuste a grade dele em Taxa de Ocupação.
              </div>
            </div>
          )}

          {/* Horário fora da grade — impede o salvamento */}
          {(foraDaGrade || erroGrade) && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div>
                <span className="font-medium">Fora da grade deste profissional.</span>{" "}
                {erroGrade ??
                  `O horário selecionado não está dentro dos blocos configurados${
                    diaSemanaSelecionado !== null && resumoBlocosDoDia(gradeDaFilial, diaSemanaSelecionado)
                      ? ` (${resumoBlocosDoDia(gradeDaFilial, diaSemanaSelecionado)})`
                      : ""
                  }. Não é possível salvar assim.`}
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
                    {horariosInicio.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
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
                    {horariosFim.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Módulo 26: a filial vem ANTES da sala, porque é ela que define
                quais salas existem. Sem isso, dava para pôr um profissional de
                Bragança numa sala de Extrema — 36% da base ficou assim. */}
            <FormField control={form.control} name="filialId" render={({ field }) => (
              <FormItem>
                <FormLabel>Filial *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!profissionalId || filiaisLoading || filiaisProf.length === 0}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !profissionalId
                            ? "Escolha o profissional primeiro"
                            : filiaisLoading
                              ? "Carregando..."
                              : filiaisProf.length === 0
                                ? "Nenhuma filial disponível"
                                : "Selecione a filial"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filiaisProf.map((f) => (
                      <SelectItem key={f.id} value={f.id} disabled={!f.temSalaAtiva}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: f.cor ?? "#6b7280" }}
                          />
                          {f.nome}
                          {!f.temSalaAtiva && (
                            <span className="text-xs text-muted-foreground">(sem sala)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* O vazio precisa dizer o que fazer, não só que está vazio */}
                {profissionalId && !filiaisLoading && filiaisProf.length === 0 && (
                  <p className="text-xs text-amber-700">
                    {diagFiliais?.foraDoEscopoDoUsuario?.length
                      ? `Este profissional atende em ${diagFiliais.foraDoEscopoDoUsuario.join(", ")}, mas seu perfil não está vinculado a essa unidade. Peça a um administrador para incluí-la no seu cadastro em Usuários.`
                      : "Este profissional não tem grade de atendimento configurada em nenhuma unidade, então não pode ser agendado. Configure em Agenda › Grade de Horários."}
                  </p>
                )}

                {profissionalId && filiaisProf.length > 0 && diagFiliais?.temGrade === false && (
                  <p className="text-xs text-muted-foreground">
                    Este profissional ainda não tem grade configurada. Escolha a unidade
                    manualmente — vale conferir a Grade de Horários depois.
                  </p>
                )}

                {filialId && !filiaisProf.find((f) => f.id === filialId)?.temSalaAtiva && (
                  <p className="text-xs text-amber-700">
                    Esta unidade ainda não tem sala cadastrada. Cadastre uma sala em Salas
                    para poder agendar aqui.
                  </p>
                )}

                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="sala" render={({ field }) => (
              <FormItem>
                <FormLabel>Sala *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!filialId}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={filialId ? "Selecione uma sala" : "Escolha a filial primeiro"}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {salasDaFilial.filter((s) => s.id).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          {s.cor && <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.cor }} />}
                          {s.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filialId && salasDaFilial.length === 0 && (
                  <p className="text-xs text-amber-700">
                    Nenhuma sala ativa nesta filial.
                  </p>
                )}
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
                if (!id) {
                  setTabelaItens([]);
                  setSelectedTabelaItem(null);
                  form.setValue("procedimento", undefined);
                } else {
                  // Com convênio o valor vem da tabela — o campo manual sai de cena
                  form.setValue("valor_particular", undefined);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o convênio" />
              </SelectTrigger>
              <SelectContent>
                {/* Particular vale para todo paciente, sempre */}
                <SelectItem value="_particular">Particular</SelectItem>
                {conveniosDoPaciente.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!pacienteId && (
              <p className="text-xs text-muted-foreground">
                Escolha o paciente para ver os convênios dele.
              </p>
            )}
            {pacienteId && conveniosDoPaciente.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Este paciente não tem convênio cadastrado — o atendimento é particular.
              </p>
            )}
            {pacienteId && conveniosDoPaciente.length === 1 && selectedConvenioId && (
              <p className="text-xs text-muted-foreground">
                Convênio do paciente pré-selecionado.
              </p>
            )}
            {pacienteId && conveniosDoPaciente.length > 1 && (
              <p className="text-xs text-muted-foreground">
                Este paciente tem {conveniosDoPaciente.length} convênios. Escolha por qual
                este atendimento vai.
              </p>
            )}
          </div>

          {/* Particular não tem tabela: o valor é combinado caso a caso */}
          {selectedConvenioId === null && (
            <FormField control={form.control} name="valor_particular" render={({ field }) => (
              <FormItem>
                <FormLabel>Valor do atendimento (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Ex: 180,00"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                    }
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Opcional. Como o paciente é particular, não existe tabela de preços —
                  informe aqui o valor combinado para este atendimento.
                  {" "}Numa recorrência, o mesmo valor vale para todas as ocorrências.
                </p>
                <FormMessage />
              </FormItem>
            )} />
          )}

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
                  {editandoExistente ? (
                    <>
                      Recorrência: <strong>{pendingData.datasAdicionais.length}</strong>{" "}
                      nova{pendingData.datasAdicionais.length === 1 ? "" : "s"} ocorrência
                      {pendingData.datasAdicionais.length === 1 ? "" : "s"} serão criadas,
                      além deste agendamento — todas ficam na mesma série.
                    </>
                  ) : (
                    <>
                      Agendamento recorrente:{" "}
                      <strong>{pendingData.datasAdicionais.length + 1}</strong> sessões serão criadas.
                    </>
                  )}
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
