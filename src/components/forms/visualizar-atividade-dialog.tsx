'use client'

import { useState } from 'react'
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
import { Eye } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scrollarea'

interface Instrucao {
  id: string
  ordem: number
  texto: string
  observacao?: string
}

interface Atividade {
  id: string
  nome: string
  descricao?: string
  tipo: string
  metodologia?: string
  objetivo?: string
  createdAt: string
  instrucoes: Instrucao[]
  _count?: {
    atribuicoes: number
    sessoes: number
  }
}

interface VisualizarAtividadeDialogProps {
  atividade: Atividade
}

export function VisualizarAtividadeDialog({ atividade }: VisualizarAtividadeDialogProps) {
  const [open, setOpen] = useState(false)

  const traduzirTipo = (tipo: string) => {
    const tipos: Record<string, string> = {
      'PROTOCOLO_ABA': 'Protocolo ABA',
      'AVALIACAO_CLINICA': 'Avaliação Clínica',
      'JOGO_MEMORIA': 'Jogo de Memória',
      'CUSTOM': 'Personalizada',
    }
    return tipos[tipo] || tipo
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Detalhes da Atividade</DialogTitle>
          <DialogDescription>
            Visualize as informações completas da atividade
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-150px)] pr-4">
          <div className="space-y-6">
            {/* Informações básicas */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome</label>
                <p className="text-lg font-semibold">{atividade.nome}</p>
              </div>

              {atividade.descricao && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                  <p className="text-sm">{atividade.descricao}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                  <div className="mt-1">
                    <Badge variant="outline">{traduzirTipo(atividade.tipo)}</Badge>
                  </div>
                </div>

                {atividade.metodologia && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Metodologia</label>
                    <p className="text-sm mt-1">{atividade.metodologia}</p>
                  </div>
                )}
              </div>

              {atividade.objetivo && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Objetivo</label>
                  <p className="text-sm">{atividade.objetivo}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Instruções</label>
                  <p className="text-2xl font-bold">{atividade.instrucoes.length}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Atribuída a</label>
                  <p className="text-2xl font-bold">{atividade._count?.atribuicoes || 0}</p>
                  <p className="text-xs text-muted-foreground">pacientes</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Sessões</label>
                  <p className="text-2xl font-bold">{atividade._count?.sessoes || 0}</p>
                  <p className="text-xs text-muted-foreground">realizadas</p>
                </div>
              </div>
            </div>

            {/* Lista de instruções */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Instruções ({atividade.instrucoes.length})
              </label>
              <div className="space-y-2">
                {atividade.instrucoes.map((instrucao) => (
                  <div
                    key={instrucao.id}
                    className="p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary" className="shrink-0 mt-0.5">
                        {instrucao.ordem}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{instrucao.texto}</p>
                        {instrucao.observacao && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Obs: {instrucao.observacao}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Metadados */}
            <div className="pt-4 border-t text-xs text-muted-foreground">
              <p>Criada em: {formatDate(atividade.createdAt)}</p>
              <p>ID: {atividade.id}</p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
