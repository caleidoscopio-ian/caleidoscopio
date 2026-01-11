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
  como_aplicar?: string
  observacao?: string
}

interface Pontuacao {
  id: string
  ordem: number
  sigla: string
  grau: string
}

interface Atividade {
  id: string
  nome: string
  protocolo?: string
  habilidade?: string
  marco_codificacao?: string
  tipo_ensino?: string
  qtd_alvos_sessao?: number
  qtd_tentativas_alvo?: number
  createdAt: string
  instrucoes: Instrucao[]
  pontuacoes?: Pontuacao[]
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

              <div className="grid grid-cols-2 gap-4">
                {atividade.protocolo && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Protocolo</label>
                    <div className="mt-1">
                      <Badge variant="outline">{atividade.protocolo}</Badge>
                    </div>
                  </div>
                )}

                {atividade.marco_codificacao && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Marco/Codificação</label>
                    <p className="text-sm mt-1">{atividade.marco_codificacao}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {atividade.habilidade && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Habilidade</label>
                    <p className="text-sm">{atividade.habilidade}</p>
                  </div>
                )}

                {atividade.tipo_ensino && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tipo de Ensino</label>
                    <p className="text-sm">{atividade.tipo_ensino}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {atividade.qtd_alvos_sessao && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Alvos por Sessão</label>
                    <p className="text-sm">{atividade.qtd_alvos_sessao}</p>
                  </div>
                )}

                {atividade.qtd_tentativas_alvo && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tentativas por Alvo</label>
                    <p className="text-sm">{atividade.qtd_tentativas_alvo}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Instruções</label>
                  <p className="text-2xl font-bold">{atividade.instrucoes?.length || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Pontuações</label>
                  <p className="text-2xl font-bold">{atividade.pontuacoes?.length || 0}</p>
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

            {/* Lista de pontuações */}
            {atividade.pontuacoes && atividade.pontuacoes.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Pontuações/Dicas ({atividade.pontuacoes.length})
                </label>
                <div className="space-y-2">
                  {atividade.pontuacoes.map((pontuacao) => (
                    <div
                      key={pontuacao.id}
                      className="p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="shrink-0">
                          {pontuacao.ordem}
                        </Badge>
                        <div className="flex gap-4">
                          <div>
                            <span className="text-xs text-muted-foreground">Sigla:</span>
                            <span className="text-sm font-medium ml-2">{pontuacao.sigla}</span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Grau:</span>
                            <span className="text-sm font-medium ml-2">{pontuacao.grau}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de instruções */}
            {atividade.instrucoes && atividade.instrucoes.length > 0 && (
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
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium">{instrucao.texto}</p>
                          {instrucao.como_aplicar && (
                            <p className="text-xs text-muted-foreground">
                              <strong>Como aplicar:</strong> {instrucao.como_aplicar}
                            </p>
                          )}
                          {instrucao.observacao && (
                            <p className="text-xs text-muted-foreground">
                              <strong>Obs:</strong> {instrucao.observacao}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
