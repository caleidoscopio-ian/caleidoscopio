'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, Filter, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { apiGet, handleApiResponse } from '@/lib/api'
import { toast } from 'sonner'

interface HistoricoItem {
  id: string
  usuarioId: string
  acao: string
  roleAnteriorNome: string | null
  roleNovoNome: string | null
  alterado_por: string
  justificativa: string | null
  createdAt: string
}

interface HistoricoResponse {
  data: HistoricoItem[]
  total: number
  page: number
  totalPages: number
}

const ACAO_LABELS: Record<string, string> = {
  ATRIBUICAO: 'Atribuição',
  ALTERACAO: 'Alteração',
  REMOCAO: 'Remoção',
}

const ACAO_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ATRIBUICAO: 'default',
  ALTERACAO: 'secondary',
  REMOCAO: 'destructive',
}

export function AuditLog() {
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [usuarioId, setUsuarioId] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [exporting, setExporting] = useState(false)

  const fetchHistorico = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' })
      if (usuarioId) params.set('usuarioId', usuarioId)
      if (dataInicio) params.set('dataInicio', dataInicio)
      if (dataFim) params.set('dataFim', dataFim)

      const response = await apiGet(`/api/usuario-roles/historico?${params}`)
      if (!response) throw new Error('Sem resposta')
      const data = await handleApiResponse<HistoricoResponse>(response)
      setHistorico(data.data)
      setTotal(data.total)
      setTotalPages(data.totalPages)
      setPage(p)
    } catch {
      toast.error('Erro ao carregar histórico')
    } finally {
      setLoading(false)
    }
  }, [usuarioId, dataInicio, dataFim])

  useEffect(() => {
    fetchHistorico(1)
  }, [fetchHistorico])

  async function handleExportCSV() {
    setExporting(true)
    try {
      const params = new URLSearchParams({ formato: 'csv', limit: '1000' })
      if (usuarioId) params.set('usuarioId', usuarioId)
      if (dataInicio) params.set('dataInicio', dataInicio)
      if (dataFim) params.set('dataFim', dataFim)

      const response = await apiGet(`/api/usuario-roles/historico?${params}`)
      if (!response) throw new Error('Sem resposta')
      if (!response.ok) throw new Error('Erro ao exportar')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'historico-roles.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erro ao exportar CSV')
    } finally {
      setExporting(false)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Filter className="h-3 w-3" /> ID do Usuário
          </label>
          <Input
            placeholder="Filtrar por usuário..."
            className="h-8 w-52 text-sm"
            value={usuarioId}
            onChange={e => setUsuarioId(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Data início</label>
          <Input
            type="date"
            className="h-8 text-sm"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Data fim</label>
          <Input
            type="date"
            className="h-8 text-sm"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchHistorico(1)}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Filtrar
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={exporting}>
          <Download className="h-3.5 w-3.5 mr-1" />
          {exporting ? 'Exportando...' : 'CSV'}
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {total} registro{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Perfil Anterior</TableHead>
              <TableHead>Novo Perfil</TableHead>
              <TableHead>Alterado por</TableHead>
              <TableHead>Justificativa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Carregando histórico...
                </TableCell>
              </TableRow>
            ) : historico.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              historico.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(item.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ACAO_VARIANT[item.acao] ?? 'outline'}>
                      {ACAO_LABELS[item.acao] ?? item.acao}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.roleAnteriorNome ?? <span className="text-muted-foreground italic">—</span>}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {item.roleNovoNome ?? <span className="text-muted-foreground italic">—</span>}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-xs text-muted-foreground">
                    {item.alterado_por.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="text-sm max-w-48 truncate" title={item.justificativa ?? ''}>
                    {item.justificativa ?? <span className="text-muted-foreground italic">—</span>}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => fetchHistorico(page - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => fetchHistorico(page + 1)}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  )
}
