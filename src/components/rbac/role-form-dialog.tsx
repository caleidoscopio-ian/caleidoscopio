'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { apiPost, apiPut, handleApiResponse } from '@/lib/api'
import { toast } from 'sonner'

const schema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(50, 'Nome muito longo'),
  descricao: z.string().max(200, 'Descrição muito longa').optional(),
})

type FormData = z.infer<typeof schema>

interface Role {
  id: string
  nome: string
  descricao: string | null
  isSystem: boolean
  ativo: boolean
  _count?: { usuarios: number }
}

interface RoleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role?: Role | null       // null = criar; definido = editar
  onSuccess: () => void
}

export function RoleFormDialog({ open, onOpenChange, role, onSuccess }: RoleFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const isEditing = !!role

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: role?.nome ?? '',
      descricao: role?.descricao ?? '',
    },
    values: {
      nome: role?.nome ?? '',
      descricao: role?.descricao ?? '',
    },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      if (isEditing && role) {
        const response = await apiPut(`/api/roles/${role.id}`, data)
        if (!response) throw new Error('Sem resposta')
        await handleApiResponse(response)
        toast.success('Perfil atualizado com sucesso')
      } else {
        const response = await apiPost('/api/roles', data)
        if (!response) throw new Error('Sem resposta')
        await handleApiResponse(response)
        toast.success('Perfil criado com sucesso')
      }

      onSuccess()
      onOpenChange(false)
      form.reset()
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao salvar perfil'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Perfil' : 'Novo Perfil'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Perfil</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Supervisor Clínico" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição <span className="text-muted-foreground">(opcional)</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva as responsabilidades deste perfil..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Perfil'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
