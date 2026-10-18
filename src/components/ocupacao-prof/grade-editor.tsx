"use client"

// Editor de grade semanal em blocos de dia/hora.
//
// Serve a DUAS grades diferentes, porque a tela é a mesma:
//
//   profissional → quando ele atende      (/api/terapeutas/[id]/grade)
//   sala         → quando ela funciona    (/api/salas/[id]/grade)
//
// Quem chama passa o `endpoint`; o editor carrega, edita e salva. O campo de
// filial aparece só quando a resposta traz `filiais` — a grade da sala não tem
// esse campo, porque a sala já pertence a uma filial.
//
// Mora fora do Dialog de propósito: aparece em modal (taxa de ocupação, salas)
// e em aba (ficha do profissional). Duplicar a tela faria as duas divergirem — e
// a filial do bloco, que alimenta o agendamento, é onde divergir sai caro.

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Trash2, Copy } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { usePermissions } from "@/hooks/usePermissions"
import { useToast } from "@/hooks/use-toast"
import type { BlocoGrade, FilialDaGrade, RespostaGrade } from "@/types/ocupacao-profissional"

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

const HORAS: string[] = []
for (let h = 5; h <= 22; h++) {
  HORAS.push(`${String(h).padStart(2, "0")}:00`)
  if (h < 22) HORAS.push(`${String(h).padStart(2, "0")}:30`)
}

type BlocoLocal = BlocoGrade & { _key: string }

let _keyCounter = 0
const newKey = () => `bloco_${++_keyCounter}`

interface GradeEditorProps {
  /** rota que serve GET e PUT da grade; null suspende */
  endpoint: string | null
  /** false suspende a carga — o modal passa `open` para não buscar fechado */
  ativo?: boolean
  onSaved?: () => void
  /** quando presente, mostra um botão Cancelar ao lado de Salvar */
  onCancelar?: () => void
  /** permissão RBAC exigida para editar; sem ela, modo leitura */
  permissao?: { recurso: string; acao: string }
}

export function GradeEditor({
  endpoint,
  ativo = true,
  onSaved,
  onCancelar,
  permissao = { recurso: "agenda", acao: "UPDATE" },
}: GradeEditorProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  // Quem só pode VER não edita. O servidor já exige a permissão de escrita no
  // PUT; aqui é para a tela não oferecer o que vai dar 403.
  const { can, loading: permsLoading } = usePermissions()
  const podeEditar = permsLoading || can(permissao.recurso, permissao.acao)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [blocos, setBlocos] = useState<BlocoLocal[]>([])
  // As filiais vêm da própria rota da grade, não do seletor global: aqui a
  // pergunta é "onde ESTE profissional atende", não "quais unidades existem".
  const [filiais, setFiliais] = useState<FilialDaGrade[]>([])
  const [semVinculo, setSemVinculo] = useState(false)

  useEffect(() => {
    if (!ativo || !endpoint || !user) return
    setLoading(true)
    fetch(endpoint, {
      headers: {
        "X-User-Data": btoa(JSON.stringify(user)),
        "X-Auth-Token": user.token,
      },
    })
      .then((r) => r.json())
      .then((d: RespostaGrade) => {
        if (d.success) {
          setBlocos(d.data.map((b) => ({ ...b, _key: newKey() })))
          setFiliais(d.filiais ?? [])
          setSemVinculo(d.profissionalRestrito === false)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [ativo, endpoint, user])

  const adicionarBloco = (dia: number) => {
    setBlocos((prev) => [
      ...prev,
      { _key: newKey(), diaSemana: dia, hora_inicio: "08:00", hora_fim: "17:00", filialId: null, ativo: true },
    ])
  }

  const removerBloco = (key: string) => {
    setBlocos((prev) => prev.filter((b) => b._key !== key))
  }

  const atualizarBloco = (key: string, campo: keyof BlocoGrade, valor: string | null) => {
    setBlocos((prev) =>
      prev.map((b) => (b._key === key ? { ...b, [campo]: valor } : b))
    )
  }

  const copiarSegParaDiasUteis = () => {
    const blocosSeg = blocos.filter((b) => b.diaSemana === 1)
    if (blocosSeg.length === 0) {
      toast({ title: "Configure a segunda-feira primeiro", variant: "destructive" })
      return
    }
    const diasUteis = [2, 3, 4, 5]
    setBlocos((prev) => {
      const semDiasUteis = prev.filter((b) => !diasUteis.includes(b.diaSemana))
      const copiados = diasUteis.flatMap((dia) =>
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        blocosSeg.map(({ _key: _k, ...b }) => ({ ...b, _key: newKey(), diaSemana: dia }))
      )
      return [...semDiasUteis, ...copiados].sort((a, b) => a.diaSemana - b.diaSemana || a.hora_inicio.localeCompare(b.hora_inicio))
    })
  }

  const limparDia = (dia: number) => {
    setBlocos((prev) => prev.filter((b) => b.diaSemana !== dia))
  }

  const handleSalvar = async () => {
    if (!endpoint || !user) return
    setSaving(true)
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Data": btoa(JSON.stringify(user)),
          "X-Auth-Token": user.token,
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        body: JSON.stringify({ blocos: blocos.map(({ _key: _k2, ...b }) => b) }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Erro ao salvar")
      toast({ title: "Grade salva com sucesso!" })
      onSaved?.()
    } catch (error) {
      toast({
        title: "Erro ao salvar grade",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const blocosPorDia = (dia: number) => blocos.filter((b) => b.diaSemana === dia)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {semVinculo && filiais.length > 1 && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Este profissional não tem filial vinculada, então todas as unidades
          aparecem na lista. Vincule a filial dele em Profissionais para
          restringir a grade.
        </p>
      )}

      {!podeEditar && (
        <p className="rounded-md border bg-muted px-3 py-2 text-xs text-muted-foreground">
          Você pode consultar a grade, mas não alterá-la.
        </p>
      )}

      {/* Atalho */}
      {podeEditar && (
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={copiarSegParaDiasUteis} className="gap-1.5 text-xs">
          <Copy className="h-3.5 w-3.5" />
          Copiar Seg → Dias úteis
        </Button>
        <span className="text-xs text-muted-foreground">Define Ter–Sex igual à Segunda-feira</span>
      </div>
      )}

      {/* Grade por dia */}
      <div className="space-y-3">
        {DIAS.map((nomeDia, dia) => (
          <div key={dia} className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium w-8">{nomeDia}</span>
                {blocosPorDia(dia).length > 0 && (
                  <Badge variant="secondary" className="text-xs">{blocosPorDia(dia).length} bloco(s)</Badge>
                )}
              </div>
              <div className="flex gap-1">
                {podeEditar && (
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => adicionarBloco(dia)}>
                  <Plus className="h-3 w-3" />
                  Adicionar
                </Button>
                )}
                {podeEditar && blocosPorDia(dia).length > 0 && (
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => limparDia(dia)}>
                    Limpar dia
                  </Button>
                )}
              </div>
            </div>

            {blocosPorDia(dia).length === 0 && (
              <p className="text-xs text-muted-foreground pl-10">Sem atendimento</p>
            )}

            {blocosPorDia(dia).map((bloco) => (
              <div key={bloco._key} className="flex items-center gap-2 pl-10">
                <Select value={bloco.hora_inicio} disabled={!podeEditar} onValueChange={(v) => atualizarBloco(bloco._key, "hora_inicio", v)}>
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HORAS.map((h) => <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">até</span>
                <Select value={bloco.hora_fim} disabled={!podeEditar} onValueChange={(v) => atualizarBloco(bloco._key, "hora_fim", v)}>
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HORAS.map((h) => <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>)}
                  </SelectContent>
                </Select>
                {filiais.length > 0 && (
                  <Select value={bloco.filialId ?? "_todas"} disabled={!podeEditar} onValueChange={(v) => atualizarBloco(bloco._key, "filialId", v === "_todas" ? null : v)}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue placeholder="Qualquer filial" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_todas" className="text-xs">Qualquer filial</SelectItem>
                      {filiais.map((f) => (
                        <SelectItem key={f.id} value={f.id} className="text-xs">
                          {f.nome}
                          {f.foraDoVinculo ? " (fora do vínculo)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {podeEditar && (
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removerBloco(bloco._key)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Botões — sem nada para mostrar, nem a linha divisória aparece */}
      {(podeEditar || onCancelar) && (
      <div className="flex justify-end gap-2 pt-2 border-t">
        {onCancelar && (
          <Button type="button" variant="outline" onClick={onCancelar}>Cancelar</Button>
        )}
        {podeEditar && (
          <Button type="button" onClick={handleSalvar} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar Grade
          </Button>
        )}
      </div>
      )}
    </div>
  )
}
