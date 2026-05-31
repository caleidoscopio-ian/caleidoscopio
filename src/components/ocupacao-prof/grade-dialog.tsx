"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Trash2, Copy, CalendarDays } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { useFilial } from "@/hooks/useFilial"
import { useToast } from "@/hooks/use-toast"
import type { BlocoGrade } from "@/types/ocupacao-profissional"

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

const HORAS: string[] = []
for (let h = 5; h <= 22; h++) {
  HORAS.push(`${String(h).padStart(2, "0")}:00`)
  if (h < 22) HORAS.push(`${String(h).padStart(2, "0")}:30`)
}

interface GradeDialogProps {
  profissionalId: string | null
  profissionalNome: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

type BlocoLocal = BlocoGrade & { _key: string }

let _keyCounter = 0
const newKey = () => `bloco_${++_keyCounter}`

export function GradeDialog({ profissionalId, profissionalNome, open, onOpenChange, onSaved }: GradeDialogProps) {
  const { user } = useAuth()
  const { filiais } = useFilial()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [blocos, setBlocos] = useState<BlocoLocal[]>([])

  useEffect(() => {
    if (!open || !profissionalId || !user) return
    setLoading(true)
    fetch(`/api/terapeutas/${profissionalId}/grade`, {
      headers: {
        "X-User-Data": btoa(JSON.stringify(user)),
        "X-Auth-Token": user.token,
      },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setBlocos(
            (d.data as BlocoGrade[]).map((b) => ({ ...b, _key: newKey() }))
          )
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, profissionalId, user])

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
    if (!profissionalId || !user) return
    setSaving(true)
    try {
      const response = await fetch(`/api/terapeutas/${profissionalId}/grade`, {
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
      onOpenChange(false)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Grade de Atendimento
          </DialogTitle>
          <DialogDescription>{profissionalNome}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Atalho */}
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" onClick={copiarSegParaDiasUteis} className="gap-1.5 text-xs">
                <Copy className="h-3.5 w-3.5" />
                Copiar Seg → Dias úteis
              </Button>
              <span className="text-xs text-muted-foreground">Define Ter–Sex igual à Segunda-feira</span>
            </div>

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
                      <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => adicionarBloco(dia)}>
                        <Plus className="h-3 w-3" />
                        Adicionar
                      </Button>
                      {blocosPorDia(dia).length > 0 && (
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
                      <Select value={bloco.hora_inicio} onValueChange={(v) => atualizarBloco(bloco._key, "hora_inicio", v)}>
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HORAS.map((h) => <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground">até</span>
                      <Select value={bloco.hora_fim} onValueChange={(v) => atualizarBloco(bloco._key, "hora_fim", v)}>
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HORAS.map((h) => <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {filiais.length > 0 && (
                        <Select value={bloco.filialId ?? "_todas"} onValueChange={(v) => atualizarBloco(bloco._key, "filialId", v === "_todas" ? null : v)}>
                          <SelectTrigger className="w-36 h-8 text-xs">
                            <SelectValue placeholder="Qualquer filial" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_todas" className="text-xs">Qualquer filial</SelectItem>
                            {filiais.map((f) => <SelectItem key={f.id} value={f.id} className="text-xs">{f.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removerBloco(bloco._key)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="button" onClick={handleSalvar} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar Grade
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
