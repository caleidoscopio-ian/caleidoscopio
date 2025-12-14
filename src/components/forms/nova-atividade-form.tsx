'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Trash2, GripVertical, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Instrucao {
  texto: string
  observacao: string
}

interface NovaAtividadeFormProps {
  onSuccess: () => void
}

export function NovaAtividadeForm({ onSuccess }: NovaAtividadeFormProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Campos do formulário
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState('PROTOCOLO_ABA')
  const [metodologia, setMetodologia] = useState('ABA')
  const [objetivo, setObjetivo] = useState('')
  const [instrucoes, setInstrucoes] = useState<Instrucao[]>([
    { texto: '', observacao: '' }
  ])

  // Adicionar nova instrução
  const adicionarInstrucao = () => {
    setInstrucoes([...instrucoes, { texto: '', observacao: '' }])
  }

  // Remover instrução
  const removerInstrucao = (index: number) => {
    if (instrucoes.length > 1) {
      const novasInstrucoes = instrucoes.filter((_, i) => i !== index)
      setInstrucoes(novasInstrucoes)
    } else {
      toast.error('A atividade deve ter pelo menos uma instrução')
    }
  }

  // Atualizar instrução
  const atualizarInstrucao = (index: number, campo: 'texto' | 'observacao', valor: string) => {
    const novasInstrucoes = [...instrucoes]
    novasInstrucoes[index][campo] = valor
    setInstrucoes(novasInstrucoes)
  }

  // Mover instrução
  const moverInstrucao = (index: number, direcao: 'cima' | 'baixo') => {
    if (direcao === 'cima' && index > 0) {
      const novasInstrucoes = [...instrucoes]
      const temp = novasInstrucoes[index]
      novasInstrucoes[index] = novasInstrucoes[index - 1]
      novasInstrucoes[index - 1] = temp
      setInstrucoes(novasInstrucoes)
    } else if (direcao === 'baixo' && index < instrucoes.length - 1) {
      const novasInstrucoes = [...instrucoes]
      const temp = novasInstrucoes[index]
      novasInstrucoes[index] = novasInstrucoes[index + 1]
      novasInstrucoes[index + 1] = temp
      setInstrucoes(novasInstrucoes)
    }
  }

  // Limpar formulário
  const limparFormulario = () => {
    setNome('')
    setDescricao('')
    setTipo('PROTOCOLO_ABA')
    setMetodologia('ABA')
    setObjetivo('')
    setInstrucoes([{ texto: '', observacao: '' }])
  }

  // Validar formulário
  const validarFormulario = (): string | null => {
    if (!nome.trim()) {
      return 'O nome da atividade é obrigatório'
    }

    if (instrucoes.length === 0) {
      return 'A atividade deve ter pelo menos uma instrução'
    }

    const instrucoesVazias = instrucoes.filter(i => !i.texto.trim())
    if (instrucoesVazias.length > 0) {
      return 'Todas as instruções devem ter um texto'
    }

    return null
  }

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar
    const erro = validarFormulario()
    if (erro) {
      toast.error(erro)
      return
    }

    setLoading(true)

    try {
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      console.log('📝 Criando nova atividade...')

      const userDataEncoded = btoa(JSON.stringify(user))

      const response = await fetch('/api/atividades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Data': userDataEncoded,
          'X-Auth-Token': user.token,
        },
        body: JSON.stringify({
          nome,
          descricao: descricao || null,
          tipo,
          metodologia: metodologia || null,
          objetivo: objetivo || null,
          instrucoes: instrucoes.map(i => ({
            texto: i.texto.trim(),
            observacao: i.observacao.trim() || null
          }))
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar atividade')
      }

      console.log('✅ Atividade criada com sucesso')

      toast.success(`Atividade "${nome}" criada com sucesso!`)

      // Limpar formulário e fechar dialog
      limparFormulario()
      setOpen(false)

      // Chamar callback de sucesso
      onSuccess()
    } catch (error) {
      console.error('❌ Erro ao criar atividade:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao criar atividade')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Atividade
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Atividade Clínica</DialogTitle>
          <DialogDescription>
            Crie um protocolo ou atividade terapêutica com instruções personalizadas
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Informações Básicas</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Atividade *</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Protocolo de Atenção Compartilhada"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROTOCOLO_ABA">Protocolo ABA</SelectItem>
                    <SelectItem value="AVALIACAO_CLINICA">Avaliação Clínica</SelectItem>
                    <SelectItem value="CUSTOM">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Metodologia */}
              <div className="space-y-2">
                <Label htmlFor="metodologia">Metodologia</Label>
                <Select value={metodologia} onValueChange={setMetodologia}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ABA">ABA</SelectItem>
                    <SelectItem value="TEACCH">TEACCH</SelectItem>
                    <SelectItem value="PECS">PECS</SelectItem>
                    <SelectItem value="DENVER">Modelo Denver</SelectItem>
                    <SelectItem value="OUTRA">Outra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Objetivo */}
              <div className="space-y-2">
                <Label htmlFor="objetivo">Objetivo</Label>
                <Input
                  id="objetivo"
                  placeholder="Ex: Desenvolver habilidades sociais"
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                />
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva a atividade e suas aplicações..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Instruções */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                Instruções ({instrucoes.length})
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={adicionarInstrucao}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Instrução
              </Button>
            </div>

            <div className="space-y-3">
              {instrucoes.map((instrucao, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-3 bg-muted/30"
                >
                  <div className="flex items-start gap-2">
                    {/* Grip para reordenar */}
                    <div className="flex flex-col gap-1 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => moverInstrucao(index, 'cima')}
                        disabled={index === 0}
                      >
                        ▲
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => moverInstrucao(index, 'baixo')}
                        disabled={index === instrucoes.length - 1}
                      >
                        ▼
                      </Button>
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          {index + 1}.
                        </span>
                        <Input
                          placeholder="Texto da instrução (ex: Faça um desenho de um círculo)"
                          value={instrucao.texto}
                          onChange={(e) => atualizarInstrucao(index, 'texto', e.target.value)}
                          required
                        />
                      </div>

                      <Input
                        placeholder="Observação (opcional)"
                        value={instrucao.observacao}
                        onChange={(e) => atualizarInstrucao(index, 'observacao', e.target.value)}
                      />
                    </div>

                    {/* Botão remover */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removerInstrucao(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
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
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Criando...' : 'Criar Atividade'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
