'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Clock, Plus } from 'lucide-react'
import { Agendamento, StatusAgendamento } from '@/types/agendamento'
import { cn } from '@/lib/utils'
import {
  addDays,
  startOfWeek,
  format,
  isSameDay,
  isToday
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AgendaSemanalProps {
  agendamentos: Agendamento[]
  profissionalId?: string
  selectedDate: Date
  onNovoAgendamento: (data: Date, horario: string) => void
  onAgendamentoClick: (agendamento: Agendamento) => void
}

// Gerar slots de 30 minutos das 08:00 às 18:00
const generateTimeSlots = () => {
  const slots: string[] = []
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 18 && minute > 0) break
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      slots.push(time)
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

export function AgendaSemanal({
  agendamentos,
  profissionalId,
  selectedDate,
  onNovoAgendamento,
  onAgendamentoClick
}: AgendaSemanalProps) {

  // Gerar os 7 dias da semana
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { locale: ptBR })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [selectedDate])

  // Agrupar agendamentos por dia
  const agendamentosPorDia = useMemo(() => {
    const map = new Map<string, Agendamento[]>()

    weekDays.forEach(day => {
      map.set(format(day, 'yyyy-MM-dd'), [])
    })

    agendamentos
      .filter(a => !profissionalId || a.profissionalId === profissionalId)
      .forEach(agendamento => {
        const dayKey = format(new Date(agendamento.data_hora), 'yyyy-MM-dd')
        const dayAgendamentos = map.get(dayKey) || []
        dayAgendamentos.push(agendamento)
        map.set(dayKey, dayAgendamentos)
      })

    return map
  }, [agendamentos, weekDays, profissionalId])

  // Verificar se um slot está ocupado em um dia específico
  const isSlotOccupied = (day: Date, slotTime: string): Agendamento | null => {
    const dayKey = format(day, 'yyyy-MM-dd')
    const agendamentosDoDia = agendamentosPorDia.get(dayKey) || []

    const [slotHour, slotMinute] = slotTime.split(':').map(Number)
    const slotDate = new Date(day)
    slotDate.setHours(slotHour, slotMinute, 0, 0)

    for (const agendamento of agendamentosDoDia) {
      const agendamentoDate = new Date(agendamento.data_hora)
      const agendamentoEnd = new Date(agendamentoDate.getTime() + agendamento.duracao_minutos * 60000)

      if (slotDate >= agendamentoDate && slotDate < agendamentoEnd) {
        return agendamento
      }
    }

    return null
  }

  // Verificar se é o início do agendamento
  const isStartSlot = (agendamento: Agendamento, day: Date, slotTime: string): boolean => {
    const agendamentoDate = new Date(agendamento.data_hora)
    const [slotHour, slotMinute] = slotTime.split(':').map(Number)

    return (
      isSameDay(agendamentoDate, day) &&
      agendamentoDate.getHours() === slotHour &&
      agendamentoDate.getMinutes() === slotMinute
    )
  }

  const calculateSlots = (duracao_minutos: number) => {
    return Math.ceil(duracao_minutos / 30)
  }

  const getStatusColor = (status: StatusAgendamento) => {
    switch (status) {
      case StatusAgendamento.CONFIRMADO:
        return 'bg-green-50 border-green-300 hover:bg-green-100'
      case StatusAgendamento.AGENDADO:
        return 'bg-blue-50 border-blue-300 hover:bg-blue-100'
      case StatusAgendamento.CANCELADO:
        return 'bg-red-50 border-red-300 hover:bg-red-100'
      case StatusAgendamento.ATENDIDO:
        return 'bg-purple-50 border-purple-300 hover:bg-purple-100'
      case StatusAgendamento.FALTOU:
        return 'bg-gray-50 border-gray-300 hover:bg-gray-100'
      default:
        return 'bg-gray-50 border-gray-300 hover:bg-gray-100'
    }
  }

  const getStatusBadgeColor = (status: StatusAgendamento) => {
    switch (status) {
      case StatusAgendamento.CONFIRMADO:
        return 'bg-green-100 text-green-800'
      case StatusAgendamento.AGENDADO:
        return 'bg-blue-100 text-blue-800'
      case StatusAgendamento.CANCELADO:
        return 'bg-red-100 text-red-800'
      case StatusAgendamento.ATENDIDO:
        return 'bg-purple-100 text-purple-800'
      case StatusAgendamento.FALTOU:
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header com dias da semana */}
      <div className="grid grid-cols-8 border-b">
        {/* Coluna de horários */}
        <div className="bg-muted p-3 border-r font-semibold text-sm flex items-center justify-center">
          <Clock className="h-4 w-4" />
        </div>

        {/* Colunas dos dias */}
        {weekDays.map(day => (
          <div
            key={day.toISOString()}
            className={cn(
              'bg-muted p-3 border-r last:border-r-0 text-center',
              isToday(day) && 'bg-primary/10'
            )}
          >
            <div className="font-semibold text-sm capitalize">
              {format(day, 'EEE', { locale: ptBR })}
            </div>
            <div className={cn(
              'text-xs text-muted-foreground',
              isToday(day) && 'text-primary font-semibold'
            )}>
              {format(day, 'dd/MM')}
            </div>
            {isToday(day) && (
              <Badge className="mt-1 text-xs">Hoje</Badge>
            )}
          </div>
        ))}
      </div>

      {/* Grade de horários */}
      <div className="overflow-y-auto max-h-[600px]">
        {TIME_SLOTS.map((slot) => (
          <div key={slot} className="grid grid-cols-8 border-b last:border-b-0">
            {/* Coluna de horário */}
            <div className="p-2 border-r text-sm text-muted-foreground text-center flex items-start justify-center pt-1">
              {slot}
            </div>

            {/* Células de cada dia */}
            {weekDays.map(day => {
              const agendamento = isSlotOccupied(day, slot)
              const isStart = agendamento ? isStartSlot(agendamento, day, slot) : false

              // Se há agendamento mas não é o slot inicial, não renderizar
              if (agendamento && !isStart) {
                return (
                  <div
                    key={`${day.toISOString()}-${slot}`}
                    className="border-r last:border-r-0"
                  />
                )
              }

              // Se é o slot inicial, renderizar o card do agendamento
              if (agendamento && isStart) {
                const slotsOcupados = calculateSlots(agendamento.duracao_minutos)
                const altura = slotsOcupados * 48

                return (
                  <div
                    key={`${day.toISOString()}-${slot}`}
                    className="border-r last:border-r-0 p-1 relative"
                    style={{ minHeight: '48px' }}
                  >
                    <div
                      className={cn(
                        'absolute inset-1 border-l-4 rounded-md p-2 cursor-pointer transition-colors text-xs',
                        getStatusColor(agendamento.status as StatusAgendamento)
                      )}
                      style={{
                        height: `${altura - 8}px`,
                        borderLeftColor: agendamento.paciente?.cor_agenda || '#3b82f6',
                        zIndex: 10
                      }}
                      onClick={() => onAgendamentoClick(agendamento)}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={agendamento.paciente?.foto || ''} />
                            <AvatarFallback
                              className="text-[10px]"
                              style={{
                                backgroundColor: agendamento.paciente?.cor_agenda || '#3b82f6',
                                color: 'white'
                              }}
                            >
                              {agendamento.paciente?.nome.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-semibold text-xs truncate">
                            {agendamento.paciente?.nome.split(' ')[0]}
                          </div>
                        </div>

                        <div className="text-[10px] text-muted-foreground">
                          {format(new Date(agendamento.data_hora), 'HH:mm')} - {agendamento.duracao_minutos}min
                        </div>

                        {slotsOcupados > 1 && agendamento.sala && (
                          <div className="text-[10px] text-muted-foreground">
                            {agendamento.sala}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }

              // Slot vazio
              return (
                <div
                  key={`${day.toISOString()}-${slot}`}
                  className="border-r last:border-r-0 hover:bg-muted/50 cursor-pointer transition-colors group p-1"
                  style={{ minHeight: '48px' }}
                  onClick={() => onNovoAgendamento(day, slot)}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-full opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
