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
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { apiPost, apiPut, handleApiResponse } from '@/lib/api'
import { toast } from 'sonner'

const schema = z.object({
  roleId: z.string().min(1, 'Selecione um perfil'),
  justificativa: z.string().min(5, 'Justificativa obrigatória (mín. 5 caracteres)').max(300),
})

type FormData = z.infer<typeof schema>

interface Role {
  id: string
  nome: string
  isSystem: boolean
}

interface ChangeRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  usuarioId: string
  usuarioNome: string
  currentRoleId: string | null
  roles: Role[]
  onSuccess: () => void
}

export function ChangeRoleDialog({
  open,
  onOpenChange,
  usuarioId,
  usuarioNome,
  currentRoleId,
  roles,
  onSuccess,
}: ChangeRoleDialogProps) {
  const [loading, setLoading] = useState(false)
  const isNew = !currentRoleId

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { roleId: currentRoleId ?? '', justificativa: '' },
    values: { roleId: currentRoleId ?? '', justificativa: '' },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const payload = { usuarioId, roleId: data.roleId, justificativa: data.justificativa }

      if (isNew) {
        const response = await apiPost('/api/usuario-roles', payload)
        if (!response) throw new Error('Sem resposta')
        await handleApiResponse(response)
        toast.success('Perfil atribuído com sucesso')
      } else {
        const response = await apiPut('/api/usuario-roles', payload)
        if (!response) throw new Error('Sem resposta')
        await handleApiResponse(response)
        toast.success('Perfil alterado com sucesso')
      }

      onSuccess()
      onOpenChange(false)
      form.reset()
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao alterar perfil'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Atribuir Perfil' : 'Alterar Perfil'}</DialogTitle>
          <DialogDescription>
            Usuário: <strong>{usuarioNome}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Perfil</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um perfil..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="justificativa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Justificativa <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o motivo da alteração..."
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
                {loading ? 'Salvando...' : isNew ? 'Atribuir' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
