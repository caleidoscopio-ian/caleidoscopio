'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
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
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'

interface Curriculum {
  id: string
  nome: string
  descricao?: string
  _count?: {
    atividades: number
  }
}

interface ExcluirCurriculumDialogProps {
  curriculum: Curriculum
  onSuccess: () => void
}

export function ExcluirCurriculumDialog({ curriculum, onSuccess }: ExcluirCurriculumDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setLoading(true)
    setError(null)

    try {
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      const userDataEncoded = btoa(JSON.stringify(user))

      const response = await fetch(`/api/curriculum?id=${curriculum.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Data': userDataEncoded,
          'X-Auth-Token': user.token,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao excluir curriculum')
      }

      setOpen(false)
      onSuccess()
    } catch (err) {
      console.error('Erro ao excluir curriculum:', err)
      setError(err instanceof Error ? err.message : 'Erro ao excluir curriculum')
    } finally {
      setLoading(false)
    }
  }

  const temAtividades = curriculum._count && curriculum._count.atividades > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Excluir Curriculum
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. O curriculum será permanentemente removido.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="font-medium">{curriculum.nome}</div>
              {curriculum.descricao && (
                <div className="text-sm text-muted-foreground mt-1">
                  {curriculum.descricao}
                </div>
              )}
            </div>

            {temAtividades && (
              <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-2">Atenção:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>
                        Este curriculum possui{' '}
                        <strong>{curriculum._count?.atividades} atividade(s)</strong> associadas
                      </li>
                    </ul>
                    <p className="mt-2">
                      Ao excluir, todas as associações entre este curriculum e suas atividades serão removidas.
                      As atividades em si não serão excluídas.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir este curriculum?
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir Curriculum
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
