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
import { Avatar, AvatarImage } from '@/components/ui/avatar'
import { ActionButton, PersonAvatar } from '@/components/kit'
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
  Trash2,
  Stethoscope,
  DollarSign,
  AlertTriangle,
  Repeat,
  Check
} from 'lucide-react'
import { Agendamento, StatusAgendamento, STATUS_AGENDAMENTO_LABELS } from '@/types/agendamento'
import { cn } from '@/lib/utils'
import { formatBRL } from '@/lib/preco-procedimento'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { opcoesEscopo, type EscopoSerie } from '@/lib/serie-agendamento'

// Mantido como alias para não quebrar quem já importa daqui
export type ModoExclusao = EscopoSerie

interface AgendamentoDetailsDialogProps {
  agendamento: Agendamento | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmar?: (id: string) => Promise<void>
  onCancelar?: (id: string, escopo: EscopoSerie) => Promise<void>
  onIniciarAtendimento?: (id: string) => void
  onEditar?: (agendamento: Agendamento) => void
  onDeletar?: (id: string, mode: ModoExclusao) => Promise<void>
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
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [modoExclusao, setModoExclusao] = useState<ModoExclusao>('single')
  // Cancelamento usa o mesmo painel de escopo da exclusão
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false)
  const [modoCancelamento, setModoCancelamento] = useState<EscopoSerie>('single')

  if (!agendamento) return null

  const STATUS_DIALOG_COLOR: Record<StatusAgendamento, string> = {
    [StatusAgendamento.AGENDADO]:       'bg-brand-soft text-brand border-brand',
    [StatusAgendamento.CONFIRMADO]:     'bg-success-soft text-success-ink border-success',
    [StatusAgendamento.EM_ATENDIMENTO]: 'bg-warning-soft text-warning-ink border-warning',
    [StatusAgendamento.ATENDIDO]:       'bg-violet-soft text-violet-ink border-violet',
    [StatusAgendamento.FALTOU]:         'bg-surface-sunken text-ink border-border',
    [StatusAgendamento.CANCELADO]:      'bg-danger-soft text-danger-ink border-danger',
  }

  const getStatusColor = (status: StatusAgendamento) =>
    STATUS_DIALOG_COLOR[status] ?? 'bg-surface-sunken text-ink border-border'

  const getStatusText = (status: StatusAgendamento) =>
    STATUS_AGENDAMENTO_LABELS[status] ?? 'Agendado'

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

  const handleAbrirConfirmacaoCancelamento = () => {
    // Sem série, não há escopo a escolher: cancela direto
    if (!agendamento.serieId) {
      void handleConfirmarCancelamento('single')
      return
    }
    setModoCancelamento('single')
    setConfirmandoCancelamento(true)
  }

  const handleConfirmarCancelamento = async (escopo: EscopoSerie) => {
    if (!onCancelar) return
    setIsLoading(true)
    try {
      await onCancelar(agendamento.id, escopo)
      setConfirmandoCancelamento(false)
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAbrirConfirmacaoExclusao = () => {
    setModoExclusao('single')
    setConfirmandoExclusao(true)
  }

  const handleConfirmarExclusao = async () => {
    if (!onDeletar) return
    setIsLoading(true)
    try {
      await onDeletar(agendamento.id, modoExclusao)
      setConfirmandoExclusao(false)
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao deletar agendamento:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const OPCOES_EXCLUSAO = opcoesEscopo('excluir')
  const OPCOES_CANCELAMENTO = opcoesEscopo('cancelar')

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setConfirmandoExclusao(false)
      setModoExclusao('single')
      setConfirmandoCancelamento(false)
      setModoCancelamento('single')
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
            <Badge
              variant="outline"
              className={cn(getStatusColor(agendamento.status as StatusAgendamento))}
            >
              {getStatusText(agendamento.status as StatusAgendamento)}
            </Badge>
            {agendamento.serieId && (
              <Badge variant="outline" className="gap-1">
                <Repeat className="h-3 w-3" />
                Recorrente
              </Badge>
            )}
          </div>
          <DialogDescription>
            Informações completas sobre o agendamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Paciente */}
          <div className="space-y-2">
            <h3 className="text-[0.72rem] font-medium tracking-wide text-ink-4 uppercase">
              Paciente
            </h3>
            <div className="rounded-2xl bg-surface-muted flex items-center gap-4 p-4">
              {agendamento.paciente?.foto ? (
                <Avatar className="size-14">
                  <AvatarImage src={agendamento.paciente.foto} />
                </Avatar>
              ) : (
                <PersonAvatar nome={agendamento.paciente?.nome ?? "?"} tamanho={56} />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="truncate text-[1.05rem] font-semibold text-ink">
                  {agendamento.paciente?.nome}
                </div>
                {agendamento.paciente?.telefone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {agendamento.paciente.telefone}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profissional */}
          <div className="space-y-2">
            <h3 className="text-[0.72rem] font-medium tracking-wide text-ink-4 uppercase">
              Profissional
            </h3>
            <div className="rounded-2xl bg-surface-muted p-4 space-y-2">
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

          {/* Data e Horário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-[0.72rem] font-medium tracking-wide text-ink-4 uppercase">
                Data
              </h3>
              <div className="rounded-2xl bg-surface-muted flex items-center gap-2 p-3">
                <Calendar className="size-5 text-brand" />
                <div>
                  <div className="font-medium capitalize">
                    {formatDate(agendamento.data_hora)}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-[0.72rem] font-medium tracking-wide text-ink-4 uppercase">
                Horário
              </h3>
              <div className="rounded-2xl bg-surface-muted flex items-center gap-2 p-3">
                <Clock className="size-5 text-brand" />
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
              <h3 className="text-[0.72rem] font-medium tracking-wide text-ink-4 uppercase">
                Local
              </h3>
              <div className="rounded-2xl bg-surface-muted flex items-center gap-3 p-3">
                <MapPin className="size-5 text-brand" />
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

          {/* Procedimento + Preço */}
          {agendamento.procedimento && (
            <div className="space-y-2">
              <h3 className="text-[0.72rem] font-medium tracking-wide text-ink-4 uppercase">
                Procedimento
              </h3>
              <div className="rounded-2xl bg-surface-muted p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <Stethoscope className="size-5 text-brand flex-shrink-0" />
                  {agendamento.procedimento.cor && (
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: agendamento.procedimento.cor }}
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{agendamento.procedimento.nome}</div>
                    {agendamento.procedimento.codigo && (
                      <div className="text-xs text-muted-foreground font-mono">
                        Cód: {agendamento.procedimento.codigo}
                      </div>
                    )}
                  </div>
                </div>
                {agendamento.precoCalculado && agendamento.precoCalculado.valor !== null && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      {agendamento.precoCalculado.rotulo}
                      {agendamento.precoCalculado.origem === 'convenio' && agendamento.paciente?.convenio && (
                        <Badge variant="outline" className="ml-1 text-xs">
                          {agendamento.paciente.convenio.nome_fantasia || agendamento.paciente.convenio.razao_social}
                        </Badge>
                      )}
                    </div>
                    <div className="font-semibold text-lg text-success-ink">
                      {formatBRL(agendamento.precoCalculado.valor)}
                    </div>
                  </div>
                )}
                {agendamento.precoCalculado && agendamento.precoCalculado.valor === null && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                    <DollarSign className="h-4 w-4" />
                    Sem preço cadastrado para este procedimento
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Observações */}
          {agendamento.observacoes && (
            <div className="space-y-2">
              <h3 className="text-[0.72rem] font-medium tracking-wide text-ink-4 uppercase">
                Observações
              </h3>
              <div className="rounded-2xl bg-surface-muted p-3">
                <div className="flex items-start gap-2">
                  <FileText className="size-5 text-brand mt-0.5" />
                  <p className="text-sm">{agendamento.observacoes}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirmação de cancelamento em série */}
        {confirmandoCancelamento && onCancelar ? (
          <div className="pt-4 sm:pt-6 border-t">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="space-y-3">
                <p className="font-medium">Como você quer cancelar este agendamento?</p>
                <div className="space-y-2">
                  {OPCOES_CANCELAMENTO.map((opcao) => (
                    <button
                      key={opcao.value}
                      type="button"
                      onClick={() => setModoCancelamento(opcao.value)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-colors",
                        modoCancelamento === opcao.value ? "border-danger bg-danger-soft" : "border-border hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                          modoCancelamento === opcao.value ? "border-danger bg-danger" : "border-muted-foreground"
                        )}>
                          {modoCancelamento === opcao.value && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div className="text-sm font-medium">{opcao.label}</div>
                      </div>
                      <p className="text-xs text-muted-foreground pl-6 mt-1">{opcao.description}</p>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Atendimentos já realizados, com check-in ou com faturamento são
                  preservados e não entram no cancelamento em lote.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmandoCancelamento(false)}
                    disabled={isLoading}
                  >
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => handleConfirmarCancelamento(modoCancelamento)}
                    disabled={isLoading}
                  >
                    Confirmar cancelamento
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        ) : confirmandoExclusao && onDeletar ? (
          <div className="pt-4 sm:pt-6 border-t">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="space-y-3">
                <p className="font-medium">Como você quer excluir este agendamento?</p>
                <div className="space-y-2">
                  {(agendamento.serieId ? OPCOES_EXCLUSAO : OPCOES_EXCLUSAO.slice(0, 1)).map((opcao) => (
                    <button
                      key={opcao.value}
                      type="button"
                      onClick={() => setModoExclusao(opcao.value)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-colors",
                        modoExclusao === opcao.value ? "border-danger bg-danger-soft" : "border-border hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                          modoExclusao === opcao.value ? "border-danger bg-danger" : "border-muted-foreground"
                        )}>
                          {modoExclusao === opcao.value && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div className="text-sm font-medium">{opcao.label}</div>
                      </div>
                      <p className="text-xs text-muted-foreground pl-6 mt-1">{opcao.description}</p>
                    </button>
                  ))}
                </div>
                {agendamento.serieId && (
                  <p className="text-xs text-muted-foreground">
                    Atendimentos já realizados, com check-in ou com faturamento são
                    preservados e não entram na exclusão em lote.
                  </p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmandoExclusao(false)}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={handleConfirmarExclusao}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Excluindo...' : 'Confirmar Exclusão'}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
        /* Ações */
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {onEditar && (
              <ActionButton
                variant="secondary"
                onClick={() => {
                  onEditar(agendamento)
                  onOpenChange(false)
                }}
                disabled={isLoading}
              >
                <Edit />
                Editar
              </ActionButton>
            )}
            {onDeletar && (
              <ActionButton
                variant="secondary"
                onClick={handleAbrirConfirmacaoExclusao}
                disabled={isLoading}
                className="text-danger-ink"
              >
                <Trash2 />
                Excluir
              </ActionButton>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {agendamento.status === StatusAgendamento.AGENDADO && onConfirmar && (
              <ActionButton
                onClick={handleConfirmar}
                disabled={isLoading}
                variant="secondary"
                className="text-success-ink"
              >
                <CheckCircle />
                Confirmar
              </ActionButton>
            )}

            {agendamento.status === StatusAgendamento.CONFIRMADO && onIniciarAtendimento && (
              <ActionButton
                onClick={() => {
                  onIniciarAtendimento(agendamento.id)
                  onOpenChange(false)
                }}
              >
                <PlayCircle />
                Iniciar Atendimento
              </ActionButton>
            )}

            {(agendamento.status === StatusAgendamento.AGENDADO ||
              agendamento.status === StatusAgendamento.CONFIRMADO) &&
              onCancelar && (
                <ActionButton
                  onClick={handleAbrirConfirmacaoCancelamento}
                  disabled={isLoading}
                  variant="danger"
                >
                  <XCircle />
                  Cancelar Agendamento
                </ActionButton>
              )}
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
