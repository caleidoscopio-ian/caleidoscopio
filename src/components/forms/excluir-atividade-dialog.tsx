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
import { Badge } from '@/components/ui/badge'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'

interface Atividade {
  id: string
  nome: string
  tipo: string
  _count?: {
    atribuicoes: number
    sessoes: number
  }
}

interface ExcluirAtividadeDialogProps {
  atividade: Atividade
  onSuccess: () => void
}

export function ExcluirAtividadeDialog({ atividade, onSuccess }: ExcluirAtividadeDialogProps) {
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

      const response = await fetch(`/api/atividades?id=${atividade.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Data': userDataEncoded,
          'X-Auth-Token': user.token,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao excluir atividade')
      }

      setOpen(false)
      onSuccess()
    } catch (err) {
      console.error('Erro ao excluir atividade:', err)
      setError(err instanceof Error ? err.message : 'Erro ao excluir atividade')
    } finally {
      setLoading(false)
    }
  }

  const temAtribuicoes = atividade._count && atividade._count.atribuicoes > 0
  const temSessoes = atividade._count && atividade._count.sessoes > 0

  const traduzirTipo = (tipo: string) => {
    const tipos: Record<string, string> = {
      'PROTOCOLO_ABA': 'Protocolo ABA',
      'AVALIACAO_CLINICA': 'Avaliação Clínica',
      'JOGO_MEMORIA': 'Jogo de Memória',
      'CUSTOM': 'Personalizada',
    }
    return tipos[tipo] || tipo
  }

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
            Excluir Atividade
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. A atividade será permanentemente removida.
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
              <div className="font-medium">{atividade.nome}</div>
              <div className="text-sm text-muted-foreground mt-1">
                <Badge variant="outline">{traduzirTipo(atividade.tipo)}</Badge>
              </div>
            </div>

            {(temAtribuicoes || temSessoes) && (
              <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-2">Atenção:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {temAtribuicoes && (
                        <li>
                          Esta atividade está atribuída a{' '}
                          <strong>{atividade._count?.atribuicoes} paciente(s)</strong>
                        </li>
                      )}
                      {temSessoes && (
                        <li>
                          Possui <strong>{atividade._count?.sessoes} sessão(ões)</strong> registradas
                        </li>
                      )}
                    </ul>
                    <p className="mt-2">
                      Ao excluir, todas as atribuições e sessões relacionadas também serão removidas.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir esta atividade?
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
            Excluir Atividade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
