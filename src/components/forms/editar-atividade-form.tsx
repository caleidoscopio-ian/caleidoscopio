'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Edit, Loader2, Plus, X, GripVertical } from 'lucide-react'
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
  instrucoes: Instrucao[]
}

interface EditarAtividadeFormProps {
  atividade: Atividade
  onSuccess: () => void
}

export function EditarAtividadeForm({ atividade, onSuccess }: EditarAtividadeFormProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [nome, setNome] = useState(atividade.nome)
  const [descricao, setDescricao] = useState(atividade.descricao || '')
  const [tipo, setTipo] = useState(atividade.tipo)
  const [metodologia, setMetodologia] = useState(atividade.metodologia || '')
  const [objetivo, setObjetivo] = useState(atividade.objetivo || '')
  const [instrucoes, setInstrucoes] = useState<Array<{ texto: string; observacao: string; id?: string }>>(
    atividade.instrucoes.map(i => ({ id: i.id, texto: i.texto, observacao: i.observacao || '' }))
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      // Validação básica
      if (!nome.trim()) {
        throw new Error('Nome é obrigatório')
      }

      if (instrucoes.length === 0) {
        throw new Error('Adicione pelo menos uma instrução')
      }

      if (instrucoes.some(i => !i.texto.trim())) {
        throw new Error('Todas as instruções devem ter texto')
      }

      const userDataEncoded = btoa(JSON.stringify(user))

      const response = await fetch(`/api/atividades?id=${atividade.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Data': userDataEncoded,
          'X-Auth-Token': user.token,
        },
        body: JSON.stringify({
          nome,
          descricao: descricao || undefined,
          tipo,
          metodologia: metodologia || undefined,
          objetivo: objetivo || undefined,
          instrucoes: instrucoes.map((inst, index) => ({
            texto: inst.texto,
            observacao: inst.observacao || undefined,
            ordem: index + 1,
          })),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar atividade')
      }

      setOpen(false)
      onSuccess()
    } catch (err) {
      console.error('Erro ao atualizar atividade:', err)
      setError(err instanceof Error ? err.message : 'Erro ao atualizar atividade')
    } finally {
      setLoading(false)
    }
  }

  const adicionarInstrucao = () => {
    setInstrucoes([...instrucoes, { texto: '', observacao: '' }])
  }

  const removerInstrucao = (index: number) => {
    if (instrucoes.length > 1) {
      setInstrucoes(instrucoes.filter((_, i) => i !== index))
    }
  }

  const atualizarInstrucao = (index: number, field: 'texto' | 'observacao', value: string) => {
    const novasInstrucoes = [...instrucoes]
    novasInstrucoes[index][field] = value
    setInstrucoes(novasInstrucoes)
  }

  const moverInstrucao = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const novasInstrucoes = [...instrucoes]
      ;[novasInstrucoes[index - 1], novasInstrucoes[index]] = [novasInstrucoes[index], novasInstrucoes[index - 1]]
      setInstrucoes(novasInstrucoes)
    } else if (direction === 'down' && index < instrucoes.length - 1) {
      const novasInstrucoes = [...instrucoes]
      ;[novasInstrucoes[index], novasInstrucoes[index + 1]] = [novasInstrucoes[index + 1], novasInstrucoes[index]]
      setInstrucoes(novasInstrucoes)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Editar Atividade</DialogTitle>
          <DialogDescription>
            Atualize as informações da atividade clínica
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-150px)] pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Informações básicas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nome">Nome da Atividade *</Label>
                <Input
                  id="edit-nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Protocolo de Atenção Visual"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-tipo">Tipo *</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger id="edit-tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROTOCOLO_ABA">Protocolo ABA</SelectItem>
                    <SelectItem value="AVALIACAO_CLINICA">Avaliação Clínica</SelectItem>
                    <SelectItem value="JOGO_MEMORIA">Jogo de Memória</SelectItem>
                    <SelectItem value="CUSTOM">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-descricao">Descrição</Label>
              <Textarea
                id="edit-descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Breve descrição da atividade..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-metodologia">Metodologia</Label>
                <Input
                  id="edit-metodologia"
                  value={metodologia}
                  onChange={(e) => setMetodologia(e.target.value)}
                  placeholder="Ex: ABA, TEACCH, PECS"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-objetivo">Objetivo</Label>
                <Input
                  id="edit-objetivo"
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                  placeholder="Ex: Desenvolver atenção compartilhada"
                />
              </div>
            </div>

            {/* Instruções */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Instruções *</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={adicionarInstrucao}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Instrução
                </Button>
              </div>

              <div className="space-y-3">
                {instrucoes.map((instrucao, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg bg-muted/30 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{index + 1}</Badge>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => moverInstrucao(index, 'up')}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => moverInstrucao(index, 'down')}
                          disabled={index === instrucoes.length - 1}
                        >
                          ↓
                        </Button>
                      </div>
                      <div className="flex-1" />
                      {instrucoes.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removerInstrucao(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Input
                        value={instrucao.texto}
                        onChange={(e) => atualizarInstrucao(index, 'texto', e.target.value)}
                        placeholder="Ex: Desenhe um círculo"
                        required
                      />
                      <Input
                        value={instrucao.observacao}
                        onChange={(e) => atualizarInstrucao(index, 'observacao', e.target.value)}
                        placeholder="Observação (opcional)"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
