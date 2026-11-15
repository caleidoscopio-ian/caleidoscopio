'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye, FileText, User, Stethoscope, Calendar, Clock, MessageSquare, Paperclip } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
interface Patient {
  id: string
  name: string
}

interface Professional {
  id: string
  name: string
  specialty: string
}

interface MedicalRecord {
  id: string
  patient: Patient
  professional: Professional
  sessionDate: string
  serviceType: string
  clinicalEvolution: string
  observations?: string
  attachments: string[]
  createdAt: string
  updatedAt: string
}

interface ProntuarioDetailsDialogProps {
  record: MedicalRecord
}

export function ProntuarioDetailsDialog({ record }: ProntuarioDetailsDialogProps) {
  const [open, setOpen] = useState(false)

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR })
  }

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })
  }

  const getServiceTypeColor = (serviceType: string) => {
    const colors: Record<string, string> = {
      'Consulta Inicial': 'bg-brand-soft text-brand',
      'Sessão de Terapia': 'bg-success-soft text-success-ink',
      'Avaliação': 'bg-violet-soft text-violet-ink',
      'Reavaliação': 'bg-warning-soft text-warning-ink',
      'Orientação Familiar': 'bg-warning-soft text-warning-ink',
      'Atendimento Conjunto': 'bg-violet-soft text-violet-ink',
      'Sessão de Grupo': 'bg-brand-soft text-brand',
      'Acompanhamento': 'bg-surface-sunken text-ink',
    }
    return colors[serviceType] || 'bg-surface-sunken text-ink'
  }

  const getSpecialtyColor = (specialty: string) => {
    const colors: Record<string, string> = {
      'Fonoaudiologia': 'bg-brand-soft text-brand',
      'Terapia Ocupacional': 'bg-success-soft text-success-ink',
      'Psicologia': 'bg-violet-soft text-violet-ink',
      'Fisioterapia': 'bg-warning-soft text-warning-ink',
      'Neuropsicologia': 'bg-violet-soft text-violet-ink',
      'Psicopedagogia': 'bg-warning-soft text-warning-ink',
      'Musicoterapia': 'bg-brand-soft text-brand',
      'Educação Física Adaptada': 'bg-cyan-100 text-cyan-800',
      'Análise do Comportamento Aplicada (ABA)': 'bg-danger-soft text-danger-ink',
      'Nutrição': 'bg-success-soft text-success-ink',
    }
    return colors[specialty] || 'bg-surface-sunken text-ink'
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="!w-[85vw] !max-w-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhes do Prontuário
          </DialogTitle>
          <DialogDescription>
            Visualização completa do registro de atendimento e evolução clínica.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
            {/* Header com Informações Principais */}
            <div className="text-center space-y-3 p-4 bg-gradient-to-r from-brand-soft to-brand-soft rounded-lg">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-ink">{record.patient.name}</h2>
                <p className="text-sm text-ink">Paciente</p>
              </div>

              <div className="flex justify-center items-center gap-4 flex-wrap">
                <Badge className={`${getServiceTypeColor(record.serviceType)} border-0`}>
                  {record.serviceType}
                </Badge>
                <Badge variant="outline" className="bg-surface">
                  <Calendar className="mr-1 h-3 w-3" />
                  {formatDate(record.sessionDate)}
                </Badge>
              </div>
            </div>

            {/* Seção: Dados do Atendimento */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Dados do Atendimento
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Paciente */}
                <div className="space-y-3">
                  <h4 className="font-medium text-ink flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Paciente
                  </h4>
                  <div className="p-3 bg-surface-sunken rounded-lg">
                    <p className="font-medium">{record.patient.name}</p>
                    <p className="text-sm text-ink">ID: {record.patient.id}</p>
                  </div>
                </div>

                {/* Profissional */}
                <div className="space-y-3">
                  <h4 className="font-medium text-ink flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Profissional Responsável
                  </h4>
                  <div className="p-3 bg-surface-sunken rounded-lg space-y-2">
                    <p className="font-medium">{record.professional.name}</p>
                    <Badge className={`${getSpecialtyColor(record.professional.specialty)} border-0 text-xs`}>
                      {record.professional.specialty}
                    </Badge>
                    <p className="text-sm text-ink">ID: {record.professional.id}</p>
                  </div>
                </div>
              </div>

              {/* Dados da Sessão */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink">Data da Sessão</label>
                  <div className="flex items-center gap-2 p-2 bg-brand-soft rounded-md">
                    <Calendar className="h-4 w-4 text-brand" />
                    <span className="font-medium">{formatDate(record.sessionDate)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-ink">Tipo de Atendimento</label>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getServiceTypeColor(record.serviceType)} border-0`}>
                      {record.serviceType}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção: Evolução Clínica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Evolução Clínica
              </h3>

              <div className="rounded-2xl bg-surface-muted p-4 bg-success-soft border-success-soft">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-success-ink">Descrição da Evolução</label>
                  <div className="text-sm text-success-ink leading-relaxed whitespace-pre-wrap">
                    {record.clinicalEvolution}
                  </div>
                </div>
              </div>
            </div>

            {/* Seção: Observações (se houver) */}
            {record.observations && (
              <>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Observações Adicionais
                  </h3>

                  <div className="rounded-2xl bg-surface-muted p-4 bg-warning-soft border-warning-soft">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-warning-ink">Observações Complementares</label>
                      <div className="text-sm text-warning-ink leading-relaxed whitespace-pre-wrap">
                        {record.observations}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Seção: Anexos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Anexos
              </h3>

              {record.attachments && record.attachments.length > 0 ? (
                <div className="space-y-2">
                  {record.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-brand-soft rounded-md">
                      <Paperclip className="h-4 w-4 text-brand" />
                      <span className="text-sm text-brand">{attachment}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-3 italic">
                  Nenhum anexo adicionado a este prontuário.
                </p>
              )}
            </div>

            {/* Seção: Informações do Sistema */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Informações do Sistema
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <label className="font-medium text-ink">Criado em</label>
                  <p className="text-ink">{formatDateTime(record.createdAt)}</p>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-ink">Última atualização</label>
                  <p className="text-ink">{formatDateTime(record.updatedAt)}</p>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="font-medium text-ink">ID do Prontuário</label>
                  <p className="font-mono text-xs text-ink">{record.id}</p>
                </div>
              </div>
            </div>
          </div>

        {/* Botão para fechar */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}