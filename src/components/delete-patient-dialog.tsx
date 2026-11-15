'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'

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

interface DeletePatientDialogProps {
  patient: Patient
  onSuccess?: () => void
}

export function DeletePatientDialog({ patient, onSuccess }: DeletePatientDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    try {
      setLoading(true)

      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      console.log('🗑️ Removendo paciente:', patient.name)

      // Preparar headers com dados do usuário
      const userDataEncoded = btoa(JSON.stringify(user))

      const response = await fetch(`/api/pacientes?id=${patient.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Data': userDataEncoded,
          'X-Auth-Token': user.token,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao remover paciente')
      }

      console.log('✅ Paciente removido com sucesso')

      // Fechar modal
      setOpen(false)

      // Callback de sucesso (recarregar lista)
      if (onSuccess) {
        onSuccess()
      }

    } catch (error) {
      console.error('❌ Erro ao remover paciente:', error)
      alert(error instanceof Error ? error.message : 'Erro ao remover paciente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-danger-ink hover:text-danger-ink hover:bg-danger-soft">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-danger-ink">
            <AlertTriangle className="h-5 w-5" />
            Confirmar Remoção
          </DialogTitle>
          <DialogDescription className="text-left">
            Você está prestes a remover o paciente do sistema. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do paciente */}
          <div className="p-4 bg-surface-sunken rounded-lg space-y-2">
            <div className="font-medium">{patient.name}</div>
            <div className="text-sm text-muted-foreground">
              CPF: {patient.cpf ? patient.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'Não informado'}
            </div>
            {patient.email && (
              <div className="text-sm text-muted-foreground">
                Email: {patient.email}
              </div>
            )}
            <Badge variant="outline" className="bg-danger-soft text-danger-ink">
              Será removido do sistema
            </Badge>
          </div>

          {/* Aviso importante */}
          <div className="p-3 bg-warning-soft border border-warning-soft rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning-ink mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-warning-ink">Atenção!</div>
                <div className="text-warning-ink">
                  O paciente será desativado do sistema. Seus dados não serão perdidos,
                  mas ele não aparecerá mais nas listagens. Históricos e agendamentos
                  serão preservados.
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
                Remover Paciente
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}