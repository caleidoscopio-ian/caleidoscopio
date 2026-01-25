"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { StatusAgendamento } from "@/types/agendamento";

const formSchema = z.object({
  id: z.string().optional(), // Para edição
  pacienteId: z.string().min(1, "Selecione um paciente"),
  profissionalId: z.string().min(1, "Selecione um profissional"),
  data: z.date({
    message: "Selecione uma data",
  }),
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

interface NovoAgendamentoFormProps {
  pacientes: Array<{ id: string; nome: string }>;
  profissionais: Array<{ id: string; nome: string; especialidade: string }>;
  salas: Array<{ id: string; nome: string; cor?: string }>;
  procedimentos: Array<{ id: string; nome: string; codigo?: string }>;
  onSubmit: (data: FormValues) => Promise<void>;
  onCancel: () => void;
  defaultValues?: Partial<FormValues>;
}

export function NovoAgendamentoForm({
  pacientes,
  profissionais,
  salas,
  procedimentos,
  onSubmit,
  onCancel,
  defaultValues,
}: NovoAgendamentoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modoRecorrente, setModoRecorrente] = useState(false);
  const [diasSemana, setDiasSemana] = useState<number[]>([]);

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

  // Função para gerar datas baseado em dias da semana e data limite
  const gerarDatasRecorrentes = (
    dataInicial: Date,
    dataLimite: Date,
    diasDaSemana: number[],
  ): Date[] => {
    const datas: Date[] = [];
    const dataAtual = new Date(dataInicial);
    dataAtual.setDate(dataAtual.getDate() + 1); // Começar do dia seguinte à data inicial

    while (dataAtual <= dataLimite) {
      const diaSemana = dataAtual.getDay(); // 0=Domingo, 1=Segunda, ..., 6=Sábado
      if (diasDaSemana.includes(diaSemana)) {
        datas.push(new Date(dataAtual));
      }
      dataAtual.setDate(dataAtual.getDate() + 1);
    }

    return datas;
  };

  const handleSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);

      // Se tem data limite e dias da semana, gerar as datas automaticamente
      if (
        data.dataLimite &&
        data.diasDaSemana &&
        data.diasDaSemana.length > 0
      ) {
        const datasGeradas = gerarDatasRecorrentes(
          data.data,
          data.dataLimite,
          data.diasDaSemana,
        );
        data.datasAdicionais = datasGeradas;
      }

      await onSubmit(data);
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
      const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      horarios.push(time);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="pacienteId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Paciente *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o paciente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {pacientes.map((paciente) => (
                    <SelectItem key={paciente.id} value={paciente.id}>
                      {paciente.nome}
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
          name="profissionalId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profissional *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {profissionais.map((prof) => (
                    <SelectItem key={prof.id} value={prof.id}>
                      {prof.nome} - {prof.especialidade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="data"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione a data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="horario"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horário *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {horarios.map((hora) => (
                      <SelectItem key={hora} value={hora}>
                        {hora}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Modo Recorrente */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
          <div className="space-y-0.5">
            <div className="text-sm font-medium">Agendamento Recorrente</div>
            <div className="text-xs text-muted-foreground">
              Replicar este agendamento em múltiplas datas
            </div>
          </div>
          <Switch
            checked={modoRecorrente}
            onCheckedChange={(checked) => {
              setModoRecorrente(checked);
              if (!checked) {
                setDiasSemana([]);
                form.setValue("datasAdicionais", []);
                form.setValue("dataLimite", undefined);
                form.setValue("diasDaSemana", []);
              }
            }}
          />
        </div>

        {/* Configuração de Recorrência por Dias da Semana */}
        {modoRecorrente && (
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Limite</label>
              <FormField
                control={form.control}
                name="dataLimite"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy", {
                                locale: ptBR,
                              })
                            ) : (
                              <span>Selecione a data final</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < form.watch("data") ||
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Dias da Semana</label>
              <div className="grid grid-cols-7 gap-2">
                {[
                  { label: "Dom", value: 0 },
                  { label: "Seg", value: 1 },
                  { label: "Ter", value: 2 },
                  { label: "Qua", value: 3 },
                  { label: "Qui", value: 4 },
                  { label: "Sex", value: 5 },
                  { label: "Sáb", value: 6 },
                ].map((dia) => {
                  const isSelected = diasSemana.includes(dia.value);
                  return (
                    <Button
                      key={dia.value}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        let novosDias: number[];
                        if (isSelected) {
                          novosDias = diasSemana.filter((d) => d !== dia.value);
                        } else {
                          novosDias = [...diasSemana, dia.value].sort();
                        }
                        setDiasSemana(novosDias);
                        form.setValue("diasDaSemana", novosDias);
                      }}
                    >
                      {dia.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {form.watch("dataLimite") &&
              diasSemana.length > 0 &&
              form.watch("data") && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Resumo da Recorrência
                  </p>
                  <p className="text-xs text-blue-700">
                    O agendamento será replicado nos seguintes dias da semana:{" "}
                    <strong>
                      {diasSemana
                        .map(
                          (d) =>
                            [
                              "Domingo",
                              "Segunda",
                              "Terça",
                              "Quarta",
                              "Quinta",
                              "Sexta",
                              "Sábado",
                            ][d],
                        )
                        .join(", ")}
                    </strong>
                    , desde{" "}
                    {format(form.watch("data"), "dd/MM/yyyy", { locale: ptBR })}{" "}
                    até{" "}
                    {format(form.watch("dataLimite")!, "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                    .
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    ℹ️ Aproximadamente{" "}
                    {Math.ceil(
                      ((form.watch("dataLimite")!.getTime() -
                        form.watch("data").getTime()) /
                        (1000 * 60 * 60 * 24 * 7)) *
                        diasSemana.length,
                    )}{" "}
                    agendamento(s) serão criados (conflitos serão ignorados).
                  </p>
                </div>
              )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="horario_fim"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horário de Término *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {horarios.map((hora) => (
                      <SelectItem key={hora} value={hora}>
                        {hora}
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
            name="sala"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sala *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma sala" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {salas
                      .filter((s) => s.id)
                      .map((sala) => (
                        <SelectItem key={sala.id} value={sala.id}>
                          <div className="flex items-center gap-2">
                            {sala.cor && (
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: sala.cor }}
                              />
                            )}
                            {sala.nome}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="procedimento"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Procedimento (opcional)</FormLabel>
              <Select
                onValueChange={(value) =>
                  field.onChange(value === "none" ? undefined : value)
                }
                value={field.value || "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um procedimento" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Sem procedimento</SelectItem>
                  {procedimentos
                    .filter((p) => p.id)
                    .map((proc) => (
                      <SelectItem key={proc.id} value={proc.id}>
                        {proc.codigo ? `${proc.codigo} - ` : ""}
                        {proc.nome}
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
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={StatusAgendamento.AGENDADO}>
                    Agendado
                  </SelectItem>
                  <SelectItem value={StatusAgendamento.CONFIRMADO}>
                    Confirmado
                  </SelectItem>
                  <SelectItem value={StatusAgendamento.CANCELADO}>
                    Cancelado
                  </SelectItem>
                  <SelectItem value={StatusAgendamento.ATENDIDO}>
                    Atendido
                  </SelectItem>
                  <SelectItem value={StatusAgendamento.FALTOU}>
                    Faltou
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Observações sobre o agendamento..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Criar Agendamento"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
