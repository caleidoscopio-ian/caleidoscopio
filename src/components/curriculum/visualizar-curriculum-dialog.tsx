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

interface AtividadeCurriculum {
  id: string
  ordem: number
  atividade: {
    id: string
    nome: string
  }
}

interface Curriculum {
  id: string
  nome: string
  descricao?: string
  observacao?: string
  createdAt: string
  atividades: AtividadeCurriculum[]
  _count?: {
    atividades: number
  }
}

interface VisualizarCurriculumDialogProps {
  curriculum: Curriculum
}

export function VisualizarCurriculumDialog({ curriculum }: VisualizarCurriculumDialogProps) {
  const [open, setOpen] = useState(false)

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
          <DialogTitle>Detalhes do Curriculum</DialogTitle>
          <DialogDescription>
            Visualize as informações completas do curriculum
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-150px)] pr-4">
          <div className="space-y-6">
            {/* Informações básicas */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome</label>
                <p className="text-lg font-semibold">{curriculum.nome}</p>
              </div>

              {curriculum.descricao && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{curriculum.descricao}</p>
                </div>
              )}

              {curriculum.observacao && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Observação</label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{curriculum.observacao}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total de Atividades</label>
                  <p className="text-2xl font-bold">{curriculum.atividades?.length || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Criado em</label>
                  <p className="text-sm font-medium">{formatDate(curriculum.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Lista de atividades */}
            {curriculum.atividades && curriculum.atividades.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Atividades ({curriculum.atividades.length})
                </label>
                <div className="space-y-2">
                  {curriculum.atividades.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="shrink-0">
                          {item.ordem}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{item.atividade.nome}</p>
                          <p className="text-xs text-muted-foreground">ID: {item.atividade.id}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {curriculum.atividades?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Nenhuma atividade adicionada a este curriculum</p>
              </div>
            )}

            {/* Metadados */}
            <div className="pt-4 border-t text-xs text-muted-foreground">
              <p>ID: {curriculum.id}</p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
