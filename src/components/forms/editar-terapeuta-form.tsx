'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Edit } from 'lucide-react'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/hooks/useAuth'
import { formatCPF, formatPhone, UF_OPTIONS } from '@/lib/masks'
import {
  TIPO_VINCULO_OPTIONS,
  ESPECIALIDADE_CLINICA_OPTIONS,
  FUNCAO_ADMINISTRATIVA_OPTIONS,
  CONSELHO_OPTIONS,
} from '@/lib/profissional-constants'

// Schema de validação
const terapeutaSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  tipoVinculo: z.enum(['PROFISSIONAL_CLINICO', 'FUNCIONARIO_ADMINISTRATIVO'], {
    message: 'Tipo de vínculo é obrigatório',
  }),
  especialidadeClinica: z.string().optional(),
  funcaoAdministrativa: z.string().optional(),
  conselho: z.string().optional(),
  numeroRegistro: z.string().optional(),
  ufRegistro: z.string().optional(),
  cpf: z.string().optional().refine(
    (val) => !val || /^\d{11}$/.test(val.replace(/\D/g, '')),
    'CPF deve ter 11 dígitos'
  ),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  salas_acesso: z.array(z.string()).optional(),
}).refine(
  (data) => data.tipoVinculo !== 'PROFISSIONAL_CLINICO' || !!data.especialidadeClinica,
  { message: 'Especialidade é obrigatória', path: ['especialidadeClinica'] }
).refine(
  (data) => data.tipoVinculo !== 'FUNCIONARIO_ADMINISTRATIVO' || !!data.funcaoAdministrativa,
  { message: 'Função é obrigatória', path: ['funcaoAdministrativa'] }
)

type TerapeutaFormData = z.infer<typeof terapeutaSchema>

interface Professional {
  id: string
  name: string
  cpf: string
  phone?: string
  email?: string
  specialty: string | null
  professionalRegistration?: string
  tipoVinculo?: string | null
  especialidadeClinica?: string | null
  funcaoAdministrativa?: string | null
  conselho?: string | null
  numeroRegistro?: string | null
  ufRegistro?: string | null
  roomAccess: string[]
  createdAt: string
  updatedAt: string
}

interface EditarTerapeutaFormProps {
  professional: Professional
  onSuccess?: () => void
}

export function EditarTerapeutaForm({ professional, onSuccess }: EditarTerapeutaFormProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const form = useForm<TerapeutaFormData>({
    resolver: zodResolver(terapeutaSchema),
    defaultValues: {
      nome: professional.name,
      cpf: professional.cpf,
      email: professional.email || '',
      telefone: professional.phone || '',
      tipoVinculo: (professional.tipoVinculo as 'PROFISSIONAL_CLINICO' | 'FUNCIONARIO_ADMINISTRATIVO') || 'PROFISSIONAL_CLINICO',
      especialidadeClinica: professional.especialidadeClinica || '',
      funcaoAdministrativa: professional.funcaoAdministrativa || '',
      conselho: professional.conselho || '',
      numeroRegistro: professional.numeroRegistro || '',
      ufRegistro: professional.ufRegistro || '',
      salas_acesso: professional.roomAccess || [],
    },
  })

  const tipoVinculo = form.watch('tipoVinculo')

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

  const onSubmit = async (data: TerapeutaFormData) => {
    try {
      setLoading(true)

      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      console.log('✏️ Editando dados do terapeuta:', data)

      // Preparar dados para a API
      const professionalData = {
        id: professional.id,
        name: data.nome,
        cpf: data.cpf?.replace(/\D/g, ''),
        phone: data.telefone,
        email: data.email || undefined,
        tipoVinculo: data.tipoVinculo,
        especialidadeClinica: data.tipoVinculo === 'PROFISSIONAL_CLINICO' ? data.especialidadeClinica : null,
        funcaoAdministrativa: data.tipoVinculo === 'FUNCIONARIO_ADMINISTRATIVO' ? data.funcaoAdministrativa : null,
        conselho: data.tipoVinculo === 'PROFISSIONAL_CLINICO' ? (data.conselho || null) : null,
        numeroRegistro: data.tipoVinculo === 'PROFISSIONAL_CLINICO' ? (data.numeroRegistro || null) : null,
        ufRegistro: data.tipoVinculo === 'PROFISSIONAL_CLINICO' ? (data.ufRegistro || null) : null,
        roomAccess: data.salas_acesso || [],
      }

      // Preparar headers com dados do usuário
      const userDataEncoded = btoa(JSON.stringify(user))

      const response = await fetch('/api/terapeutas', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Data': userDataEncoded,
          'X-Auth-Token': user.token,
        },
        body: JSON.stringify(professionalData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar terapeuta')
      }

      console.log('✅ Terapeuta atualizado com sucesso:', result.data.name)

      // Fechar modal
      setOpen(false)

      // Callback de sucesso (recarregar lista)
      if (onSuccess) {
        onSuccess()
      }

    } catch (error) {
      console.error('❌ Erro ao atualizar terapeuta:', error)
      alert(error instanceof Error ? error.message : 'Erro ao atualizar terapeuta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Terapeuta</DialogTitle>
          <DialogDescription>
            Atualize as informações do profissional. Campos marcados com * são obrigatórios.
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

                {/* Tipo de Vínculo */}
                <FormField
                  control={form.control}
                  name="tipoVinculo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Vínculo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de vínculo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIPO_VINCULO_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {tipoVinculo === 'PROFISSIONAL_CLINICO' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Especialidade */}
                  <FormField
                    control={form.control}
                    name="especialidadeClinica"
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
                            {ESPECIALIDADE_CLINICA_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Conselho */}
                  <FormField
                    control={form.control}
                    name="conselho"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conselho</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o conselho" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CONSELHO_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Número de Registro */}
                  <FormField
                    control={form.control}
                    name="numeroRegistro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de Registro</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 06/123456" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* UF do Registro */}
                  <FormField
                    control={form.control}
                    name="ufRegistro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UF do Registro</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="UF" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {UF_OPTIONS.map((uf) => (
                              <SelectItem key={uf.value} value={uf.value}>
                                {uf.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Função */}
                  <FormField
                    control={form.control}
                    name="funcaoAdministrativa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Função *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a função" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {FUNCAO_ADMINISTRATIVA_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-2">
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
                  'Salvar Alterações'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
