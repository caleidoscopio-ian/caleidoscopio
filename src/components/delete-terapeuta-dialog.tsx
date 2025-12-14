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

interface DeleteTerapeutaDialogProps {
  professional: Professional
  onSuccess?: () => void
}

export function DeleteTerapeutaDialog({ professional, onSuccess }: DeleteTerapeutaDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    try {
      setLoading(true)

      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      console.log('🗑️ Removendo terapeuta:', professional.name)

      // Preparar headers com dados do usuário
      const userDataEncoded = btoa(JSON.stringify(user))

      const response = await fetch(`/api/terapeutas?id=${professional.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Data': userDataEncoded,
          'X-Auth-Token': user.token,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao remover terapeuta')
      }

      console.log('✅ Terapeuta removido com sucesso')

      // Fechar modal
      setOpen(false)

      // Callback de sucesso (recarregar lista)
      if (onSuccess) {
        onSuccess()
      }

    } catch (error) {
      console.error('❌ Erro ao remover terapeuta:', error)
      alert(error instanceof Error ? error.message : 'Erro ao remover terapeuta')
    } finally {
      setLoading(false)
    }
  }

  const formatCPF = (cpf: string) => {
    if (!cpf) return 'Não informado'
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
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
            Você está prestes a remover o terapeuta do sistema. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do terapeuta */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <div className="font-medium">{professional.name}</div>
            <div className="text-sm text-muted-foreground">
              <Badge variant="outline" className="mr-2">{professional.specialty}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              CPF: {formatCPF(professional.cpf)}
            </div>
            {professional.email && (
              <div className="text-sm text-muted-foreground">
                Email: {professional.email}
              </div>
            )}
            {professional.professionalRegistration && (
              <div className="text-sm text-muted-foreground">
                Registro: {professional.professionalRegistration}
              </div>
            )}
            <Badge variant="outline" className="bg-red-50 text-red-700">
              Será removido do sistema
            </Badge>
          </div>

          {/* Aviso importante */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-yellow-800">Atenção!</div>
                <div className="text-yellow-700">
                  O terapeuta será desativado do sistema. Seus dados não serão perdidos,
                  mas ele não aparecerá mais nas listagens. Históricos de atendimentos
                  e agendamentos serão preservados.
                </div>
              </div>
            </div>
          </div>

          {/* Aviso sobre agendamentos */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-blue-800">Importante!</div>
                <div className="text-blue-700">
                  Verifique se não há agendamentos futuros para este profissional
                  antes de removê-lo do sistema.
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
                Remover Terapeuta
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}