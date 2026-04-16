'use client'

import { useState, useEffect, useCallback } from 'react'
import { Save, Copy, Loader2, CheckSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiGet, apiPut, apiPost, handleApiResponse } from '@/lib/api'
import { toast } from 'sonner'

// Recursos e ações conforme seed-rbac.ts
const RECURSOS = [
  { slug: 'dashboard', nome: 'Dashboard' },
  { slug: 'pacientes', nome: 'Pacientes' },
  { slug: 'agenda', nome: 'Agenda' },
  { slug: 'prontuarios', nome: 'Prontuários / Registro de Sessão' },
  { slug: 'anamneses', nome: 'Anamneses' },
  { slug: 'sessoes', nome: 'Sessões' },
  { slug: 'atividades', nome: 'Atividades' },
  { slug: 'curriculums', nome: 'Planos Terapêuticos' },
  { slug: 'avaliacoes', nome: 'Avaliações' },
  { slug: 'evolucao', nome: 'Evolução' },
  { slug: 'relatorios', nome: 'Relatórios' },
  { slug: 'terapeutas', nome: 'Profissionais / Terapeutas' },
  { slug: 'salas', nome: 'Salas' },
  { slug: 'convenios', nome: 'Convênios' },
  { slug: 'procedimentos', nome: 'Procedimentos' },
  { slug: 'usuarios', nome: 'Usuários' },
  { slug: 'permissoes', nome: 'Permissões' },
  { slug: 'configuracoes', nome: 'Configurações' },
]

const ACOES = [
  { slug: 'VIEW', nome: 'Ver' },
  { slug: 'CREATE', nome: 'Criar' },
  { slug: 'UPDATE', nome: 'Editar' },
  { slug: 'DELETE', nome: 'Excluir' },
  { slug: 'EXPORT', nome: 'Exportar' },
  { slug: 'APPROVE', nome: 'Aprovar' },
  { slug: 'MANAGE', nome: 'Tudo' },
]

interface Role {
  id: string
  nome: string
  isSystem: boolean
}

interface PermissionMatrixProps {
  roleId: string
  roleName: string
  isSystem: boolean
  allRoles: Role[]
}

export function PermissionMatrix({ roleId, roleName, isSystem, allRoles }: PermissionMatrixProps) {
  // Map: recursoSlug → Set<acaoSlug>
  const [permissions, setPermissions] = useState<Record<string, Set<string>>>({})
  const [original, setOriginal] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cloneFrom, setCloneFrom] = useState<string>('')

  const fetchPermissions = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiGet(`/api/roles/${roleId}/permissoes`)
      if (!response) throw new Error('Sem resposta')
      const data = await handleApiResponse<Record<string, string[]>>(response)
      setOriginal(data)
      const map: Record<string, Set<string>> = {}
      for (const [recurso, acoes] of Object.entries(data)) {
        map[recurso] = new Set(acoes)
      }
      setPermissions(map)
    } catch {
      toast.error('Erro ao carregar permissões')
    } finally {
      setLoading(false)
    }
  }, [roleId])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  function hasPermission(recurso: string, acao: string): boolean {
    return permissions[recurso]?.has(acao) ?? false
  }

  function hasManage(recurso: string): boolean {
    return hasPermission(recurso, 'MANAGE')
  }

  function togglePermission(recurso: string, acao: string) {
    if (isSystem) return
    setPermissions(prev => {
      const next = { ...prev }
      const set = new Set(next[recurso] ?? [])

      if (acao === 'MANAGE') {
        // Toggle MANAGE: se ligar, limpa todas as outras; se desligar, só remove MANAGE
        if (set.has('MANAGE')) {
          set.delete('MANAGE')
        } else {
          set.clear()
          set.add('MANAGE')
        }
      } else {
        // Não pode marcar ação individual quando MANAGE está ativo
        if (set.has('MANAGE')) return prev
        if (set.has(acao)) {
          set.delete(acao)
        } else {
          set.add(acao)
        }
      }

      next[recurso] = set
      return next
    })
  }

  async function handleSave() {
    if (isSystem) return
    setSaving(true)
    try {
      // Montar lista de permissões no formato esperado
      const permissoesList: { recurso: string; acao: string }[] = []
      for (const [recurso, acoes] of Object.entries(permissions)) {
        for (const acao of acoes) {
          permissoesList.push({ recurso, acao })
        }
      }

      const response = await apiPut(`/api/roles/${roleId}/permissoes`, {
        permissoes: permissoesList,
      })
      if (!response) throw new Error('Sem resposta')
      await handleApiResponse(response)
      toast.success('Permissões salvas com sucesso')
      await fetchPermissions()
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao salvar permissões'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleClone() {
    if (!cloneFrom || isSystem) return
    try {
      const response = await apiPost(`/api/roles/${roleId}/clone`, { sourceRoleId: cloneFrom })
      if (!response) throw new Error('Sem resposta')
      await handleApiResponse(response)
      toast.success('Permissões copiadas com sucesso')
      setCloneFrom('')
      await fetchPermissions()
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao copiar permissões'
      toast.error(msg)
    }
  }

  const isDirty = JSON.stringify(
    Object.fromEntries(Object.entries(permissions).map(([k, v]) => [k, [...v].sort()]))
  ) !== JSON.stringify(
    Object.fromEntries(Object.entries(original).map(([k, v]) => [k, [...v].sort()]))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Carregando permissões...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header com ações */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{roleName}</h3>
          {isSystem && <Badge variant="secondary">Sistema — somente leitura</Badge>}
          {isDirty && !isSystem && (
            <Badge variant="outline" className="text-amber-600 border-amber-400">
              Alterações não salvas
            </Badge>
          )}
        </div>

        {!isSystem && (
          <div className="flex items-center gap-2">
            {/* Clone de outro perfil */}
            <div className="flex items-center gap-2">
              <Select value={cloneFrom} onValueChange={setCloneFrom}>
                <SelectTrigger className="w-48 h-8 text-sm">
                  <SelectValue placeholder="Copiar de..." />
                </SelectTrigger>
                <SelectContent>
                  {allRoles
                    .filter(r => r.id !== roleId)
                    .map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                disabled={!cloneFrom}
                onClick={handleClone}
              >
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copiar
              </Button>
            </div>

            <Button size="sm" onClick={handleSave} disabled={saving || !isDirty}>
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1" />
              )}
              Salvar
            </Button>
          </div>
        )}
      </div>

      {/* Matriz */}
      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-2.5 font-medium min-w-40">Recurso</th>
              {ACOES.map(acao => (
                <th
                  key={acao.slug}
                  className={`px-3 py-2.5 font-medium text-center min-w-16 ${
                    acao.slug === 'MANAGE' ? 'bg-primary/5 border-l' : ''
                  }`}
                >
                  {acao.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RECURSOS.map((recurso, idx) => {
              const manage = hasManage(recurso.slug)
              return (
                <tr
                  key={recurso.slug}
                  className={`border-b last:border-0 hover:bg-muted/30 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                >
                  <td className="px-4 py-2.5 font-medium text-muted-foreground">
                    {recurso.nome}
                  </td>
                  {ACOES.map(acao => {
                    const isManageCol = acao.slug === 'MANAGE'
                    const checked = isManageCol ? manage : (manage || hasPermission(recurso.slug, acao.slug))
                    const disabled = isSystem || (!isManageCol && manage)

                    return (
                      <td
                        key={acao.slug}
                        className={`px-3 py-2.5 text-center ${isManageCol ? 'bg-primary/5 border-l' : ''}`}
                      >
                        {disabled && !isManageCol ? (
                          <span className="flex justify-center">
                            <CheckSquare className="h-4 w-4 text-primary/40" />
                          </span>
                        ) : (
                          <Checkbox
                            checked={checked}
                            disabled={disabled}
                            onCheckedChange={() => togglePermission(recurso.slug, acao.slug)}
                            className={isManageCol ? 'border-primary' : ''}
                          />
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        <strong>Tudo</strong> (coluna destacada): ao marcar, o perfil recebe acesso completo ao recurso.
        As demais ações são configuradas automaticamente.
        {!isSystem && isDirty && ' Clique em Salvar para confirmar as alterações.'}
      </p>
    </div>
  )
}
