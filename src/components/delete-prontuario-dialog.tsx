'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle, Loader2, FileText, User, Stethoscope } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'

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

interface DeleteProntuarioDialogProps {
  record: MedicalRecord
  onSuccess?: () => void
}

export function DeleteProntuarioDialog({ record, onSuccess }: DeleteProntuarioDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    try {
      setLoading(true)

      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      console.log('🗑️ Removendo prontuário:', record.id)

      const userDataEncoded = btoa(JSON.stringify(user))

      const response = await fetch(`/api/prontuarios?id=${record.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Data': userDataEncoded,
          'X-Auth-Token': user.token,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao remover prontuário')
      }

      console.log('✅ Prontuário removido com sucesso')

      setOpen(false)

      if (onSuccess) {
        onSuccess()
      }

    } catch (error) {
      console.error('❌ Erro ao remover prontuário:', error)
      alert(error instanceof Error ? error.message : 'Erro ao remover prontuário')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getServiceTypeColor = (serviceType: string) => {
    const colors: Record<string, string> = {
      'Consulta Inicial': 'bg-blue-100 text-blue-800',
      'Sessão de Terapia': 'bg-green-100 text-green-800',
      'Avaliação': 'bg-purple-100 text-purple-800',
      'Reavaliação': 'bg-orange-100 text-orange-800',
      'Orientação Familiar': 'bg-yellow-100 text-yellow-800',
      'Atendimento Conjunto': 'bg-pink-100 text-pink-800',
      'Sessão de Grupo': 'bg-indigo-100 text-indigo-800',
      'Acompanhamento': 'bg-gray-100 text-gray-800',
    }
    return colors[serviceType] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Confirmar Remoção
          </DialogTitle>
          <DialogDescription className="text-left">
            Você está prestes a remover este prontuário do sistema. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do prontuário */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Prontuário de {record.patient.name}</span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Paciente:</span>
                <span>{record.patient.name}</span>
              </div>

              <div className="flex items-center gap-2">
                <Stethoscope className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Profissional:</span>
                <span>{record.professional.name}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Data:</span>
                <span>{formatDate(record.sessionDate)}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Tipo:</span>
                <Badge className={`${getServiceTypeColor(record.serviceType)} border-0 text-xs`}>
                  {record.serviceType}
                </Badge>
              </div>
            </div>

            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              Será removido permanentemente
            </Badge>
          </div>

          {/* Aviso importante sobre dados clínicos */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-red-800">Atenção!</div>
                <div className="text-red-700">
                  Este prontuário contém dados clínicos importantes. Uma vez removido,
                  todas as informações de evolução e observações serão perdidas permanentemente.
                </div>
              </div>
            </div>
          </div>

          {/* Aviso sobre anexos */}
          {record.attachments && record.attachments.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-yellow-800">Anexos incluídos!</div>
                  <div className="text-yellow-700">
                    Este prontuário possui {record.attachments.length} anexo(s) que também serão removidos.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aviso sobre compliance */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-blue-800">Importante!</div>
                <div className="text-blue-700">
                  Certifique-se de que a remoção deste prontuário está em conformidade
                  com as políticas de retenção de dados da sua clínica.
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Removendo...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Remover Prontuário
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}