'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye, User, Phone, Mail, Stethoscope, GraduationCap, MapPin, Clock } from 'lucide-react'

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
import { Separator } from '@/components/ui/separator'

interface Professional {
  id: string
  name: string
  cpf: string
  phone?: string
  email?: string
  specialty: string
  professionalRegistration?: string
  roomAccess: string[]
  createdAt: string
  updatedAt: string
}

interface TerapeutaDetailsDialogProps {
  professional: Professional
}

export function TerapeutaDetailsDialog({ professional }: TerapeutaDetailsDialogProps) {
  const [open, setOpen] = useState(false)

  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR })
  }

  // Formatar data e hora para exibição
  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })
  }

  const formatCPF = (cpf: string) => {
    if (!cpf) return '-'
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  // Mapeamento das salas (simulado - em produção viria do backend)
  const salasMap: Record<string, string> = {
    'sala-1': 'Sala 1 - Atendimento Individual',
    'sala-2': 'Sala 2 - Terapia em Grupo',
    'sala-3': 'Sala 3 - Atividades Motoras',
    'sala-4': 'Sala 4 - Musicoterapia',
    'sala-5': 'Sala 5 - Avaliação',
    'consultorio-1': 'Consultório 1',
    'consultorio-2': 'Consultório 2',
    'consultorio-3': 'Consultório 3',
  }

  const getSalasNomes = (salaIds: string[]) => {
    return salaIds.map(id => salasMap[id] || id).filter(Boolean)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Detalhes do Terapeuta
          </DialogTitle>
          <DialogDescription>
            Informações completas do profissional cadastrado no sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header com Nome e Especialidade */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">{professional.name}</h2>
            <div className="flex justify-center gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {professional.specialty}
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                Ativo
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Seção: Dados Pessoais */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Dados Pessoais
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">CPF</label>
                <p className="font-mono">{formatCPF(professional.cpf)}</p>
              </div>

              {professional.professionalRegistration && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">Registro Profissional</label>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <p className="font-mono">{professional.professionalRegistration}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Seção: Contato */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Informações de Contato
            </h3>

            <div className="space-y-3">
              {professional.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Telefone:</span>
                  <span>{professional.phone}</span>
                </div>
              )}

              {professional.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span>{professional.email}</span>
                </div>
              )}

              {!professional.phone && !professional.email && (
                <p className="text-sm text-muted-foreground italic">
                  Nenhuma informação de contato cadastrada
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Seção: Especialidade */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Especialidade e Atuação
            </h3>

            <div className="space-y-3">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-800">Área de Especialização</span>
                </div>
                <p className="text-blue-700 text-lg font-semibold">{professional.specialty}</p>
              </div>

              {professional.professionalRegistration && (
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Registro:</span>
                  <span className="font-mono">{professional.professionalRegistration}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Seção: Acesso às Salas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Salas de Atendimento
            </h3>

            <div className="space-y-3">
              {professional.roomAccess && professional.roomAccess.length > 0 ? (
                <div className="grid gap-2">
                  {getSalasNomes(professional.roomAccess).map((sala, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{sala}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Nenhuma sala de acesso configurada
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Seção: Informações do Sistema */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Informações do Sistema
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Cadastrado em</label>
                <p>{formatDateTime(professional.createdAt)}</p>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Última atualização</label>
                <p>{formatDateTime(professional.updatedAt)}</p>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="font-medium text-muted-foreground">ID do Sistema</label>
                <p className="font-mono text-xs">{professional.id}</p>
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