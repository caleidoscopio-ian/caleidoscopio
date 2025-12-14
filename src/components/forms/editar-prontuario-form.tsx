'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Edit, Loader2, Calendar, Users } from 'lucide-react'

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
import { useAuth } from '@/hooks/useAuth'

const prontuarioSchema = z.object({
  patientId: z.string().min(1, 'Paciente é obrigatório'),
  professionalId: z.string().min(1, 'Profissional é obrigatório'),
  sessionDate: z.string().min(1, 'Data da sessão é obrigatória'),
  serviceType: z.string().min(1, 'Tipo de atendimento é obrigatório'),
  clinicalEvolution: z.string().min(10, 'Evolução clínica deve ter pelo menos 10 caracteres'),
  observations: z.string().optional(),
  attachments: z.array(z.string()).optional(),
})

type ProntuarioFormData = z.infer<typeof prontuarioSchema>

interface Patient {
  id: string
  name: string
}

interface Professional {
  id: string
  name: string
  specialty: string
}

interface MedicalRecord {
  id: string
  patient: Patient
  professional: Professional
  sessionDate: string
  serviceType: string
  clinicalEvolution: string
  observations?: string
  attachments: string[]
  createdAt: string
  updatedAt: string
}

interface EditarProntuarioFormProps {
  record: MedicalRecord
  onSuccess?: () => void
}

export function EditarProntuarioForm({ record, onSuccess }: EditarProntuarioFormProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loadingData, setLoadingData] = useState(false)

  const form = useForm<ProntuarioFormData>({
    resolver: zodResolver(prontuarioSchema),
    defaultValues: {
      patientId: record.patient.id,
      professionalId: record.professional.id,
      sessionDate: record.sessionDate.split('T')[0],
      serviceType: record.serviceType,
      clinicalEvolution: record.clinicalEvolution,
      observations: record.observations || '',
      attachments: record.attachments || [],
    },
  })

  const tiposAtendimento = [
    'Consulta Inicial',
    'Sessão de Terapia',
    'Avaliação',
    'Reavaliação',
    'Orientação Familiar',
    'Atendimento Conjunto',
    'Sessão de Grupo',
    'Acompanhamento'
  ]

  const fetchPatientsAndProfessionals = async () => {
    if (!user) return

    try {
      setLoadingData(true)
      const userDataEncoded = btoa(JSON.stringify(user))

      const [patientsResponse, professionalsResponse] = await Promise.all([
        fetch('/api/pacientes', {
          headers: {
            'Content-Type': 'application/json',
            'X-User-Data': userDataEncoded,
            'X-Auth-Token': user.token,
          }
        }),
        fetch('/api/terapeutas', {
          headers: {
            'Content-Type': 'application/json',
            'X-User-Data': userDataEncoded,
            'X-Auth-Token': user.token,
          }
        })
      ])

      const patientsResult = await patientsResponse.json()
      const professionalsResult = await professionalsResponse.json()

      if (patientsResult.success) {
        setPatients(patientsResult.data)
      }

      if (professionalsResult.success) {
        setProfessionals(professionalsResult.data)
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error)
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchPatientsAndProfessionals()
    }
  }, [open, user])

  const onSubmit = async (data: ProntuarioFormData) => {
    try {
      setLoading(true)

      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      console.log('✏️ Editando prontuário:', data)

      const userDataEncoded = btoa(JSON.stringify(user))

      const response = await fetch('/api/prontuarios', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Data': userDataEncoded,
          'X-Auth-Token': user.token,
        },
        body: JSON.stringify({
          id: record.id,
          ...data,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao atualizar prontuário')
      }

      console.log('✅ Prontuário atualizado com sucesso')

      setOpen(false)

      if (onSuccess) {
        onSuccess()
      }

    } catch (error) {
      console.error('❌ Erro ao atualizar prontuário:', error)
      alert(error instanceof Error ? error.message : 'Erro ao atualizar prontuário')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="!w-[90vw] !max-w-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Prontuário
          </DialogTitle>
          <DialogDescription>
            Atualize as informações do prontuário e evolução clínica. Campos marcados com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Seção: Dados da Sessão */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dados da Sessão
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Paciente */}
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paciente *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loadingData}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingData ? "Carregando..." : "Selecione o paciente"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {patients.length > 0 ? (
                            patients.map((patient) => (
                              <SelectItem key={patient.id} value={patient.id}>
                                {patient.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-patients" disabled>
                              Nenhum paciente cadastrado
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Profissional */}
                <FormField
                  control={form.control}
                  name="professionalId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profissional *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loadingData}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingData ? "Carregando..." : "Selecione o profissional"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {professionals.length > 0 ? (
                            professionals.map((professional) => (
                              <SelectItem key={professional.id} value={professional.id}>
                                {professional.name} - {professional.specialty}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-professionals" disabled>
                              Nenhum profissional cadastrado
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Data da Sessão */}
                <FormField
                  control={form.control}
                  name="sessionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data da Sessão *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          max={formatDate(new Date().toISOString())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Tipo de Atendimento */}
              <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Atendimento *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de atendimento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tiposAtendimento.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Seção: Evolução Clínica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Evolução e Observações
              </h3>

              {/* Evolução Clínica */}
              <FormField
                control={form.control}
                name="clinicalEvolution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evolução Clínica *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva detalhadamente a evolução do paciente durante a sessão, objetivos trabalhados, respostas observadas e progressos identificados..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Registre de forma detalhada a evolução clínica observada durante o atendimento.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Observações Adicionais */}
              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações Adicionais</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Adicione observações complementares, recomendações para próximas sessões, orientações para família..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Campo opcional para observações complementares e orientações.
                    </FormDescription>
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
              <Button type="submit" disabled={loading || loadingData}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}