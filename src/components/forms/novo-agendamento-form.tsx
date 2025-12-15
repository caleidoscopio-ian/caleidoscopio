'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { StatusAgendamento } from '@/types/agendamento'

const formSchema = z.object({
  pacienteId: z.string().min(1, 'Selecione um paciente'),
  profissionalId: z.string().min(1, 'Selecione um profissional'),
  data: z.date({
    message: 'Selecione uma data',
  }),
  horario: z.string().min(1, 'Informe o horário'),
  duracao_minutos: z.number().min(30, 'Duração mínima de 30 minutos'),
  sala: z.string().optional(),
  status: z.nativeEnum(StatusAgendamento),
  observacoes: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface NovoAgendamentoFormProps {
  pacientes: Array<{ id: string; nome: string }>
  profissionais: Array<{ id: string; nome: string; especialidade: string }>
  onSubmit: (data: FormValues) => Promise<void>
  onCancel: () => void
  defaultValues?: Partial<FormValues>
}

export function NovoAgendamentoForm({
  pacientes,
  profissionais,
  onSubmit,
  onCancel,
  defaultValues
}: NovoAgendamentoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: StatusAgendamento.AGENDADO,
      duracao_minutos: 60,
      sala: '',
      observacoes: '',
      ...defaultValues,
    },
  })

  const handleSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true)
      await onSubmit(data)
    } catch (error) {
      console.error('Erro ao criar agendamento:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Gerar opções de horário (30 em 30 minutos)
  const horarios: string[] = []
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 18 && minute > 0) break
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      horarios.push(time)
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
                          'pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP', { locale: ptBR })
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="duracao_minutos"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duração (minutos) *</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">60 minutos (1 hora)</SelectItem>
                    <SelectItem value="90">90 minutos (1h30)</SelectItem>
                    <SelectItem value="120">120 minutos (2 horas)</SelectItem>
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
                <FormLabel>Sala</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Sala 1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
                  <SelectItem value={StatusAgendamento.AGENDADO}>Agendado</SelectItem>
                  <SelectItem value={StatusAgendamento.CONFIRMADO}>Confirmado</SelectItem>
                  <SelectItem value={StatusAgendamento.CANCELADO}>Cancelado</SelectItem>
                  <SelectItem value={StatusAgendamento.ATENDIDO}>Atendido</SelectItem>
                  <SelectItem value={StatusAgendamento.FALTOU}>Faltou</SelectItem>
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
            {isSubmitting ? 'Salvando...' : 'Criar Agendamento'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
