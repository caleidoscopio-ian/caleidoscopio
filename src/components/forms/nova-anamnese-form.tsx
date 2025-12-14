'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, ArrowRight, Save, CheckCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Schema de validação
const anamneseSchema = z.object({
  pacienteId: z.string().min(1, 'Paciente é obrigatório'),

  // Etapa 1: História do Desenvolvimento
  gestacao: z.string().optional(),
  parto: z.string().optional(),
  marcos_desenvolvimento: z.string().optional(),

  // Etapa 2: Comportamentos
  comportamentosExcessivos: z.string().optional(),
  comportamentosDeficitarios: z.string().optional(),

  // Etapa 3: Comportamentos-Problema
  comportamentos_problema_descricao: z.string().optional(),

  // Etapa 4: Rotina
  rotina_acordar: z.string().optional(),
  rotina_escola: z.string().optional(),
  rotina_tarde: z.string().optional(),
  rotina_noite: z.string().optional(),

  // Etapa 5: Ambientes
  ambienteFamiliar: z.string().optional(),
  ambienteEscolar: z.string().optional(),

  // Etapa 6: Preferências
  preferencias_descricao: z.string().optional(),

  // Etapa 7: Documentos (será implementado depois)

  // Etapa 8: Habilidades Críticas
  habilidades_criticas_descricao: z.string().optional(),

  // Observações gerais
  observacoesGerais: z.string().optional(),
})

type AnamneseFormData = z.infer<typeof anamneseSchema>

interface NovaAnamneseFormProps {
  anamneseId?: string
  initialData?: any
  onSuccess?: () => void
  onCancel?: () => void
}

const ETAPAS = [
  { numero: 1, titulo: 'História do Desenvolvimento', descricao: 'Gestação, parto e marcos do desenvolvimento' },
  { numero: 2, titulo: 'Comportamentos', descricao: 'Comportamentos excessivos e deficitários' },
  { numero: 3, titulo: 'Comportamentos-Problema', descricao: 'Análise funcional (ABC)' },
  { numero: 4, titulo: 'Rotina Diária', descricao: 'Horários e atividades do dia a dia' },
  { numero: 5, titulo: 'Ambientes', descricao: 'Familiar e escolar' },
  { numero: 6, titulo: 'Preferências', descricao: 'Reforçadores e motivadores' },
  { numero: 7, titulo: 'Documentos', descricao: 'Relatórios e vídeos' },
  { numero: 8, titulo: 'Habilidades Críticas', descricao: 'Prioridades para intervenção' },
]

export function NovaAnamneseForm({ anamneseId, initialData, onSuccess, onCancel }: NovaAnamneseFormProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [etapaAtual, setEtapaAtual] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pacientes, setPacientes] = useState<any[]>([])

  const form = useForm<AnamneseFormData>({
    resolver: zodResolver(anamneseSchema),
    defaultValues: {
      pacienteId: '',
      gestacao: '',
      parto: '',
      marcos_desenvolvimento: '',
      comportamentosExcessivos: '',
      comportamentosDeficitarios: '',
      comportamentos_problema_descricao: '',
      rotina_acordar: '',
      rotina_escola: '',
      rotina_tarde: '',
      rotina_noite: '',
      ambienteFamiliar: '',
      ambienteEscolar: '',
      preferencias_descricao: '',
      habilidades_criticas_descricao: '',
      observacoesGerais: '',
    },
  })

  // Preencher formulário com dados iniciais em modo de edição
  useEffect(() => {
    if (initialData && pacientes.length > 0) {
      // Garantir que o paciente da anamnese esteja na lista
      if (initialData.paciente && !pacientes.find(p => p.id === initialData.paciente.id)) {
        setPacientes(prev => [...prev, {
          id: initialData.paciente.id,
          name: initialData.paciente.nome
        }])
      }

      // Os campos JSON já vêm como objetos do Prisma, não como strings
      const historiaDesenvolvimento = initialData.historiaDesenvolvimento || {}
      const comportamentosProblema = Array.isArray(initialData.comportamentosProblema) && initialData.comportamentosProblema.length > 0
        ? initialData.comportamentosProblema[0]
        : {}
      const rotinaDiaria = initialData.rotinaDiaria || {}
      const preferencias = initialData.preferencias || {}
      const habilidadesCriticas = Array.isArray(initialData.habilidadesCriticas) && initialData.habilidadesCriticas.length > 0
        ? initialData.habilidadesCriticas[0]
        : {}

      form.reset({
        pacienteId: initialData.paciente?.id || '',
        gestacao: historiaDesenvolvimento.gestacao || '',
        parto: historiaDesenvolvimento.parto || '',
        marcos_desenvolvimento: historiaDesenvolvimento.marcos || historiaDesenvolvimento.marcos_desenvolvimento || '',
        comportamentosExcessivos: initialData.comportamentosExcessivos || '',
        comportamentosDeficitarios: initialData.comportamentosDeficitarios || '',
        comportamentos_problema_descricao: comportamentosProblema.descricao || '',
        rotina_acordar: rotinaDiaria.acordar || '',
        rotina_escola: rotinaDiaria.escola || '',
        rotina_tarde: rotinaDiaria.tarde || '',
        rotina_noite: rotinaDiaria.noite || '',
        ambienteFamiliar: initialData.ambienteFamiliar || '',
        ambienteEscolar: initialData.ambienteEscolar || '',
        preferencias_descricao: preferencias.descricao || '',
        habilidades_criticas_descricao: habilidadesCriticas.descricao || '',
        observacoesGerais: initialData.observacoesGerais || '',
      })
    }
  }, [initialData, pacientes])

  // Carregar lista de pacientes
  useEffect(() => {
    const loadPacientes = async () => {
      if (!user) return

      try {
        const userDataEncoded = btoa(JSON.stringify(user))
        const response = await fetch('/api/pacientes', {
          headers: {
            'X-User-Data': userDataEncoded,
            'X-Auth-Token': user.token,
          },
        })

        const result = await response.json()
        if (response.ok) {
          setPacientes(result.data || [])
        }
      } catch (error) {
        console.error('Erro ao carregar pacientes:', error)
      }
    }

    loadPacientes()
  }, [user])

  const progresso = ((etapaAtual + 1) / ETAPAS.length) * 100

  const proximaEtapa = () => {
    if (etapaAtual < ETAPAS.length - 1) {
      setEtapaAtual(etapaAtual + 1)
    }
  }

  const etapaAnterior = () => {
    if (etapaAtual > 0) {
      setEtapaAtual(etapaAtual - 1)
    }
  }

  const salvarRascunho = async (data: AnamneseFormData) => {
    try {
      setLoading(true)

      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      const userDataEncoded = btoa(JSON.stringify(user))

      // Montar dados para envio
      const anamneseData = {
        pacienteId: data.pacienteId,
        profissionalId: user.id,
        historiaDesenvolvimento: {
          gestacao: data.gestacao,
          parto: data.parto,
          marcos: data.marcos_desenvolvimento,
        },
        comportamentosExcessivos: data.comportamentosExcessivos,
        comportamentosDeficitarios: data.comportamentosDeficitarios,
        comportamentosProblema: data.comportamentos_problema_descricao ? [
          { descricao: data.comportamentos_problema_descricao }
        ] : undefined,
        rotinaDiaria: {
          acordar: data.rotina_acordar,
          escola: data.rotina_escola,
          tarde: data.rotina_tarde,
          noite: data.rotina_noite,
        },
        ambienteFamiliar: data.ambienteFamiliar,
        ambienteEscolar: data.ambienteEscolar,
        preferencias: data.preferencias_descricao ? {
          descricao: data.preferencias_descricao
        } : undefined,
        habilidadesCriticas: data.habilidades_criticas_descricao ? [
          { descricao: data.habilidades_criticas_descricao }
        ] : undefined,
        observacoesGerais: data.observacoesGerais,
        status: 'RASCUNHO',
      }

      const url = anamneseId ? `/api/anamneses/${anamneseId}` : '/api/anamneses'
      const method = anamneseId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-User-Data': userDataEncoded,
          'X-Auth-Token': user.token,
        },
        body: JSON.stringify(anamneseData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao salvar rascunho')
      }

      toast({
        title: 'Rascunho salvo!',
        description: anamneseId ? 'Anamnese atualizada com sucesso.' : 'Anamnese salva como rascunho com sucesso.',
      })

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error)
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar rascunho',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const finalizar = async (data: AnamneseFormData) => {
    try {
      setLoading(true)

      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      const userDataEncoded = btoa(JSON.stringify(user))

      const anamneseData = {
        pacienteId: data.pacienteId,
        profissionalId: user.id,
        historiaDesenvolvimento: {
          gestacao: data.gestacao,
          parto: data.parto,
          marcos: data.marcos_desenvolvimento,
        },
        comportamentosExcessivos: data.comportamentosExcessivos,
        comportamentosDeficitarios: data.comportamentosDeficitarios,
        comportamentosProblema: data.comportamentos_problema_descricao ? [
          { descricao: data.comportamentos_problema_descricao }
        ] : undefined,
        rotinaDiaria: {
          acordar: data.rotina_acordar,
          escola: data.rotina_escola,
          tarde: data.rotina_tarde,
          noite: data.rotina_noite,
        },
        ambienteFamiliar: data.ambienteFamiliar,
        ambienteEscolar: data.ambienteEscolar,
        preferencias: data.preferencias_descricao ? {
          descricao: data.preferencias_descricao
        } : undefined,
        habilidadesCriticas: data.habilidades_criticas_descricao ? [
          { descricao: data.habilidades_criticas_descricao }
        ] : undefined,
        observacoesGerais: data.observacoesGerais,
        status: 'FINALIZADA',
      }

      const url = anamneseId ? `/api/anamneses/${anamneseId}` : '/api/anamneses'
      const method = anamneseId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-User-Data': userDataEncoded,
          'X-Auth-Token': user.token,
        },
        body: JSON.stringify(anamneseData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao finalizar anamnese')
      }

      toast({
        title: 'Anamnese finalizada!',
        description: anamneseId ? 'Anamnese atualizada e finalizada com sucesso.' : 'Anamnese criada e finalizada com sucesso.',
      })

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Erro ao finalizar anamnese:', error)
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao finalizar anamnese',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (data: AnamneseFormData) => {
    // No último passo, finalizar
    if (etapaAtual === ETAPAS.length - 1) {
      finalizar(data)
    } else {
      // Caso contrário, avançar para próxima etapa
      proximaEtapa()
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com progresso */}
      <Card>
        <CardHeader>
          <CardTitle>{anamneseId ? 'Editar' : 'Nova'} Anamnese - {ETAPAS[etapaAtual].titulo}</CardTitle>
          <CardDescription>{ETAPAS[etapaAtual].descricao}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Etapa {etapaAtual + 1} de {ETAPAS.length}</span>
              <span>{Math.round(progresso)}%</span>
            </div>
            <Progress value={progresso} />
          </div>
        </CardContent>
      </Card>

      {/* Formulário */}
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Seleção de Paciente (sempre visível) */}
              {etapaAtual === 0 && (
                <FormField
                  control={form.control}
                  name="pacienteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paciente *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!!anamneseId}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o paciente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pacientes.map((paciente) => (
                            <SelectItem key={paciente.id} value={paciente.id}>
                              {paciente.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {anamneseId && <FormDescription>O paciente não pode ser alterado durante a edição.</FormDescription>}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Etapa 1: História do Desenvolvimento */}
              {etapaAtual === 0 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="gestacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gestação</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descreva como foi a gestação (intercorrências, medicamentos, etc.)"
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="parto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parto</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tipo de parto, peso ao nascer, APGAR, intercorrências..."
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="marcos_desenvolvimento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marcos do Desenvolvimento</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Quando sentou, engatinhou, andou, primeiras palavras, fraldas..."
                            {...field}
                            rows={4}
                          />
                        </FormControl>
                        <FormDescription>
                          Descreva os principais marcos do desenvolvimento motor, linguagem e autonomia
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Etapa 2: Comportamentos Excessivos e Deficitários */}
              {etapaAtual === 1 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="comportamentosExcessivos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comportamentos Excessivos</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Comportamentos que ocorrem com frequência elevada (ex: gritar, estereotipias, birras...)"
                            {...field}
                            rows={5}
                          />
                        </FormControl>
                        <FormDescription>
                          Liste os comportamentos que a criança apresenta em excesso
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="comportamentosDeficitarios"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comportamentos Deficitários</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Comportamentos ausentes ou que ocorrem com baixa frequência (ex: falta de contato visual, não brinca, não interage...)"
                            {...field}
                            rows={5}
                          />
                        </FormControl>
                        <FormDescription>
                          Liste os comportamentos que estão em déficit ou ausentes
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Etapa 3: Comportamentos-Problema (ABC) */}
              {etapaAtual === 2 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="comportamentos_problema_descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comportamentos-Problema (Análise Funcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descreva os comportamentos-problema usando o modelo ABC:&#10;&#10;Antecedente (O que acontece antes?)&#10;Comportamento (O que a criança faz?)&#10;Consequência (O que acontece depois?)&#10;Frequência (Quantas vezes por dia/semana?)"
                            {...field}
                            rows={8}
                          />
                        </FormControl>
                        <FormDescription>
                          Descreva funcionalmente os principais comportamentos-problema
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Etapa 4: Rotina Diária */}
              {etapaAtual === 3 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="rotina_acordar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rotina Matinal</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Horário que acorda, café da manhã, higiene..."
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rotina_escola"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rotina Escolar</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Horários, atividades, transporte..."
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rotina_tarde"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rotina da Tarde</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Almoço, terapias, atividades..."
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rotina_noite"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rotina Noturna</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Jantar, banho, sono..."
                            {...field}
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Etapa 5: Ambiente Familiar e Escolar */}
              {etapaAtual === 4 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="ambienteFamiliar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ambiente Familiar</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Estrutura familiar, com quem mora, dinâmica familiar, suporte..."
                            {...field}
                            rows={5}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ambienteEscolar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ambiente Escolar</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tipo de escola, sala regular/especial, acompanhante, adaptações, relacionamento com colegas..."
                            {...field}
                            rows={5}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Etapa 6: Preferências (Reforçadores) */}
              {etapaAtual === 5 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="preferencias_descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferências e Reforçadores</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="O que a criança gosta de fazer? Brinquedos favoritos, alimentos preferidos, atividades que motivam, vídeos, jogos..."
                            {...field}
                            rows={6}
                          />
                        </FormControl>
                        <FormDescription>
                          Liste tudo que pode ser usado como reforçador nas intervenções
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Etapa 7: Documentos (placeholder) */}
              {etapaAtual === 6 && (
                <div className="space-y-4">
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">
                      Funcionalidade de upload de documentos será implementada em breve.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Por enquanto, você pode anexar documentos após finalizar a anamnese.
                    </p>
                  </div>
                </div>
              )}

              {/* Etapa 8: Habilidades Críticas + Observações */}
              {etapaAtual === 7 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="habilidades_criticas_descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Habilidades Críticas / Prioridades</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Quais habilidades são prioritárias para intervenção? Ex: comunicação, autonomia, socialização, acadêmicas..."
                            {...field}
                            rows={6}
                          />
                        </FormControl>
                        <FormDescription>
                          Identifique as áreas e habilidades críticas que devem ser priorizadas
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="observacoesGerais"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações Gerais</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Outras observações relevantes sobre o caso..."
                            {...field}
                            rows={4}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Botões de Navegação */}
              <div className="flex justify-between pt-6 border-t">
                <div className="space-x-2">
                  {onCancel && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onCancel}
                      disabled={loading}
                    >
                      Cancelar
                    </Button>
                  )}
                  {etapaAtual > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={etapaAnterior}
                      disabled={loading}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Anterior
                    </Button>
                  )}
                </div>

                <div className="space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={form.handleSubmit(salvarRascunho)}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar Rascunho
                  </Button>

                  {etapaAtual < ETAPAS.length - 1 ? (
                    <Button type="submit" disabled={loading}>
                      Próxima
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Finalizando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Finalizar Anamnese
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
