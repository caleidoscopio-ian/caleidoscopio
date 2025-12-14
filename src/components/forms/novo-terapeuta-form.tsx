'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/hooks/useAuth'

// Schema de validação baseado no modelo Profissional do banco
const terapeutaSchema = z.object({
  // Campos obrigatórios
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  especialidade: z.string().min(2, 'Especialidade é obrigatória'),

  // Campos opcionais - Dados pessoais
  cpf: z.string().optional().refine(
    (val) => !val || /^\d{11}$/.test(val.replace(/\D/g, '')),
    'CPF deve ter 11 dígitos'
  ),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),

  // Campos profissionais
  registro_profissional: z.string().optional(),
  salas_acesso: z.array(z.string()).optional(),
})

type TerapeutaFormData = z.infer<typeof terapeutaSchema>

interface NovoTerapeutaFormProps {
  onSuccess?: () => void
}

export function NovoTerapeutaForm({ onSuccess }: NovoTerapeutaFormProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const form = useForm<TerapeutaFormData>({
    resolver: zodResolver(terapeutaSchema),
    defaultValues: {
      nome: '',
      cpf: '',
      email: '',
      telefone: '',
      especialidade: '',
      registro_profissional: '',
      salas_acesso: [],
    },
  })

  // Especialidades comuns para TEA
  const especialidades = [
    'Fonoaudiologia',
    'Terapia Ocupacional',
    'Psicologia',
    'Fisioterapia',
    'Neuropsicologia',
    'Psicopedagogia',
    'Musicoterapia',
    'Educação Física Adaptada',
    'Análise do Comportamento Aplicada (ABA)',
    'Nutrição',
    'Outra'
  ]

  // Salas disponíveis (simulado - em produção viria do backend)
  const salasDisponiveis = [
    { id: 'sala-1', nome: 'Sala 1 - Atendimento Individual' },
    { id: 'sala-2', nome: 'Sala 2 - Terapia em Grupo' },
    { id: 'sala-3', nome: 'Sala 3 - Atividades Motoras' },
    { id: 'sala-4', nome: 'Sala 4 - Musicoterapia' },
    { id: 'sala-5', nome: 'Sala 5 - Avaliação' },
    { id: 'consultorio-1', nome: 'Consultório 1' },
    { id: 'consultorio-2', nome: 'Consultório 2' },
    { id: 'consultorio-3', nome: 'Consultório 3' },
  ]

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }
    return value
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    } else if (numbers.length === 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }
    return value
  }

  const onSubmit = async (data: TerapeutaFormData) => {
    try {
      setLoading(true)

      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      console.log('📝 Enviando dados do novo terapeuta:', data)

      // Preparar dados para a API
      const professionalData = {
        name: data.nome,
        cpf: data.cpf?.replace(/\D/g, ''), // Remove formatação do CPF
        phone: data.telefone,
        email: data.email || undefined,
        specialty: data.especialidade,
        professionalRegistration: data.registro_profissional,
        roomAccess: data.salas_acesso || [],
      }

      // Preparar headers com dados do usuário
      const userDataEncoded = btoa(JSON.stringify(user))

      const response = await fetch('/api/terapeutas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Data': userDataEncoded,
          'X-Auth-Token': user.token,
        },
        body: JSON.stringify(professionalData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar terapeuta')
      }

      console.log('✅ Terapeuta criado com sucesso:', result.data.name)

      // Resetar formulário e fechar modal
      form.reset()
      setOpen(false)

      // Callback de sucesso (recarregar lista)
      if (onSuccess) {
        onSuccess()
      }

    } catch (error) {
      console.error('❌ Erro ao criar terapeuta:', error)
      alert(error instanceof Error ? error.message : 'Erro ao criar terapeuta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Terapeuta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Terapeuta</DialogTitle>
          <DialogDescription>
            Preencha as informações do profissional. Campos marcados com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Seção: Dados Pessoais */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Dados Pessoais</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Dr. Ana Silva Santos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Especialidade */}
                <FormField
                  control={form.control}
                  name="especialidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Especialidade *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a especialidade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {especialidades.map((especialidade) => (
                            <SelectItem key={especialidade} value={especialidade}>
                              {especialidade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* CPF */}
                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="000.000.000-00"
                          {...field}
                          onChange={(e) => {
                            const formatted = formatCPF(e.target.value)
                            field.onChange(formatted)
                          }}
                          maxLength={14}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Registro Profissional */}
                <FormField
                  control={form.control}
                  name="registro_profissional"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registro Profissional</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: CRP 06/123456, CRFa 2-12345" {...field} />
                      </FormControl>
                      <FormDescription>
                        Número do conselho profissional (CRP, CRFa, CREFITO, etc.)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Seção: Contato */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Informações de Contato</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="ana@email.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Telefone */}
                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(11) 99999-9999"
                          {...field}
                          onChange={(e) => {
                            const formatted = formatPhone(e.target.value)
                            field.onChange(formatted)
                          }}
                          maxLength={15}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Seção: Acesso às Salas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Salas de Acesso</h3>
              <FormField
                control={form.control}
                name="salas_acesso"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salas que o profissional pode acessar</FormLabel>
                    <FormDescription>
                      Selecione as salas onde o terapeuta pode realizar atendimentos
                    </FormDescription>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                      {salasDisponiveis.map((sala) => (
                        <div key={sala.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={sala.id}
                            checked={field.value?.includes(sala.id)}
                            onCheckedChange={(checked) => {
                              const current = field.value || []
                              if (checked) {
                                field.onChange([...current, sala.id])
                              } else {
                                field.onChange(current.filter(id => id !== sala.id))
                              }
                            }}
                          />
                          <label
                            htmlFor={sala.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {sala.nome}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Terapeuta'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}