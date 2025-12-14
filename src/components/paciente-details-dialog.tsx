'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye, Calendar, User, Phone, Mail, MapPin, Shield, CreditCard } from 'lucide-react'

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

interface Patient {
  id: string
  name: string
  cpf: string
  birthDate: string
  email?: string
  phone?: string
  address?: string
  guardianName?: string
  guardianPhone?: string
  healthInsurance?: string
  healthInsuranceNumber?: string
  createdAt: string
  updatedAt: string
}

interface PacienteDetailsDialogProps {
  patient: Patient
}

export function PacienteDetailsDialog({ patient }: PacienteDetailsDialogProps) {
  const [open, setOpen] = useState(false)

  // Calcular idade baseada na data de nascimento
  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }

    return age
  }

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

  const age = calculateAge(patient.birthDate)

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
            <User className="h-5 w-5" />
            Detalhes do Paciente
          </DialogTitle>
          <DialogDescription>
            Informações completas do paciente cadastrado no sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header com Nome e Status */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">{patient.name}</h2>
            <div className="flex justify-center gap-2">
              <Badge variant="secondary">{age} anos</Badge>
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
                <p className="font-mono">{formatCPF(patient.cpf)}</p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p>{formatDate(patient.birthDate)}</p>
                </div>
              </div>
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
              {patient.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Telefone:</span>
                  <span>{patient.phone}</span>
                </div>
              )}

              {patient.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span>{patient.email}</span>
                </div>
              )}

              {patient.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Endereço:</span>
                    <span className="text-sm">{patient.address}</span>
                  </div>
                </div>
              )}

              {!patient.phone && !patient.email && !patient.address && (
                <p className="text-sm text-muted-foreground italic">
                  Nenhuma informação de contato cadastrada
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Seção: Responsáveis */}
          {(patient.guardianName || patient.guardianPhone) && (
            <>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Responsáveis
                </h3>

                <div className="space-y-3">
                  {patient.guardianName && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Responsável Financeiro:</span>
                      <span>{patient.guardianName}</span>
                    </div>
                  )}

                  {patient.guardianPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Contato de Emergência:</span>
                      <span>{patient.guardianPhone}</span>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Seção: Plano de Saúde */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Plano de Saúde
            </h3>

            <div className="space-y-3">
              {patient.healthInsurance ? (
                <>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Plano:</span>
                    <Badge variant="outline">{patient.healthInsurance}</Badge>
                  </div>

                  {patient.healthInsuranceNumber && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Matrícula:</span>
                      <span className="font-mono text-sm">{patient.healthInsuranceNumber}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline">Particular</Badge>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Seção: Informações do Sistema */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informações do Sistema</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Cadastrado em</label>
                <p>{formatDateTime(patient.createdAt)}</p>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Última atualização</label>
                <p>{formatDateTime(patient.updatedAt)}</p>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">ID do Sistema</label>
                <p className="font-mono text-xs">{patient.id}</p>
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