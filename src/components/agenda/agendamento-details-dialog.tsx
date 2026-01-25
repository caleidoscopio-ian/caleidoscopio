'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  XCircle,
  PlayCircle,
  Edit,
  Trash2
} from 'lucide-react'
import { Agendamento, StatusAgendamento } from '@/types/agendamento'
import { cn } from '@/lib/utils'

interface AgendamentoDetailsDialogProps {
  agendamento: Agendamento | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmar?: (id: string) => Promise<void>
  onCancelar?: (id: string) => Promise<void>
  onIniciarAtendimento?: (id: string) => void
  onEditar?: (agendamento: Agendamento) => void
  onDeletar?: (id: string) => Promise<void>
}

export function AgendamentoDetailsDialog({
  agendamento,
  open,
  onOpenChange,
  onConfirmar,
  onCancelar,
  onIniciarAtendimento,
  onEditar,
  onDeletar
}: AgendamentoDetailsDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  if (!agendamento) return null

  const getStatusColor = (status: StatusAgendamento) => {
    switch (status) {
      case StatusAgendamento.CONFIRMADO:
        return 'bg-green-100 text-green-800 border-green-300'
      case StatusAgendamento.AGENDADO:
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case StatusAgendamento.CANCELADO:
        return 'bg-red-100 text-red-800 border-red-300'
      case StatusAgendamento.ATENDIDO:
        return 'bg-purple-100 text-purple-800 border-purple-300'
      case StatusAgendamento.FALTOU:
        return 'bg-gray-100 text-gray-800 border-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusText = (status: StatusAgendamento) => {
    switch (status) {
      case StatusAgendamento.CONFIRMADO: return 'Confirmado'
      case StatusAgendamento.AGENDADO: return 'Agendado'
      case StatusAgendamento.CANCELADO: return 'Cancelado'
      case StatusAgendamento.ATENDIDO: return 'Atendido'
      case StatusAgendamento.FALTOU: return 'Faltou'
      default: return 'Agendado'
    }
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const calculateEndTime = () => {
    const end = new Date(agendamento.horario_fim)
    return formatTime(end)
  }

  const calculateDuration = () => {
    const start = new Date(agendamento.data_hora)
    const end = new Date(agendamento.horario_fim)
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000)
    return minutes
  }

  const handleConfirmar = async () => {
    if (!onConfirmar) return
    setIsLoading(true)
    try {
      await onConfirmar(agendamento.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelar = async () => {
    if (!onCancelar) return
    setIsLoading(true)
    try {
      await onCancelar(agendamento.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletar = async () => {
    if (!onDeletar || !confirm('Tem certeza que deseja excluir este agendamento?')) return
    setIsLoading(true)
    try {
      await onDeletar(agendamento.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao deletar agendamento:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
            <Badge
              variant="outline"
              className={cn('ml-2', getStatusColor(agendamento.status as StatusAgendamento))}
            >
              {getStatusText(agendamento.status as StatusAgendamento)}
            </Badge>
          </div>
          <DialogDescription>
            Informações completas sobre o agendamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Paciente */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Paciente
            </h3>
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
              <Avatar className="h-16 w-16">
                <AvatarImage src={agendamento.paciente?.foto || ''} />
                <AvatarFallback
                  style={{
                    backgroundColor: agendamento.paciente?.cor_agenda || '#3b82f6',
                    color: 'white'
                  }}
                >
                  {agendamento.paciente?.nome.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="font-semibold text-lg">{agendamento.paciente?.nome}</div>
                {agendamento.paciente?.telefone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {agendamento.paciente.telefone}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Profissional */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Profissional
            </h3>
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{agendamento.profissional?.nome}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {agendamento.profissional?.especialidade}
              </div>
              {agendamento.profissional?.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {agendamento.profissional.email}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Data e Horário */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Data
              </h3>
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium capitalize">
                    {formatDate(agendamento.data_hora)}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Horário
              </h3>
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {formatTime(agendamento.data_hora)} - {calculateEndTime()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {calculateDuration()} minutos
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sala */}
          {agendamento.salaRelacao && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Local
              </h3>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                {agendamento.salaRelacao.cor && (
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: agendamento.salaRelacao.cor }}
                  />
                )}
                <span className="font-medium">{agendamento.salaRelacao.nome}</span>
              </div>
            </div>
          )}

          {/* Observações */}
          {agendamento.observacoes && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Observações
              </h3>
              <div className="p-3 border rounded-lg bg-muted/30">
                <div className="flex items-start gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <p className="text-sm">{agendamento.observacoes}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="flex gap-2">
            {onEditar && (
              <Button
                variant="outline"
                onClick={() => {
                  onEditar(agendamento)
                  onOpenChange(false)
                }}
                disabled={isLoading}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
            {onDeletar && (
              <Button
                variant="outline"
                onClick={handleDeletar}
                disabled={isLoading}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {agendamento.status === StatusAgendamento.AGENDADO && onConfirmar && (
              <Button
                onClick={handleConfirmar}
                disabled={isLoading}
                variant="outline"
                className="text-green-600 hover:text-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar
              </Button>
            )}

            {agendamento.status === StatusAgendamento.CONFIRMADO && onIniciarAtendimento && (
              <Button onClick={() => {
                onIniciarAtendimento(agendamento.id)
                onOpenChange(false)
              }}>
                <PlayCircle className="h-4 w-4 mr-2" />
                Iniciar Atendimento
              </Button>
            )}

            {(agendamento.status === StatusAgendamento.AGENDADO ||
              agendamento.status === StatusAgendamento.CONFIRMADO) &&
              onCancelar && (
                <Button
                  onClick={handleCancelar}
                  disabled={isLoading}
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar Agendamento
                </Button>
              )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
