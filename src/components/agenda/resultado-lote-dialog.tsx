"use client"

// Por que cada ocorrência da recorrência falhou.
//
// A API devolve `resultados[]` com o motivo por data, mas a tela só mostrava a
// contagem — e o motivo ia para `console.warn`. Caso real: 11 sessões
// recusadas, todas por "Profissional já possui agendamento neste horário"
// (o paciente já tinha a série em outra unidade), e a recepção não tinha como
// saber disso sem abrir o console do navegador.
//
// Os motivos são agrupados porque numa recorrência eles se repetem: 11 linhas
// iguais escondem a informação em vez de mostrá-la.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

export interface ResultadoLote {
  data: string
  success: boolean
  error?: string
}

interface Props {
  resultados: ResultadoLote[] | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const formatarData = (iso: string) => {
  try {
    return format(parseISO(iso), "dd/MM", { locale: ptBR })
  } catch {
    return iso
  }
}

export function ResultadoLoteDialog({ resultados, open, onOpenChange }: Props) {
  if (!resultados) return null

  const criados = resultados.filter((r) => r.success)
  const falhas = resultados.filter((r) => !r.success)

  // Mesmo motivo = um bloco, com as datas juntas
  const porMotivo = new Map<string, string[]>()
  for (const f of falhas) {
    const motivo = f.error?.trim() || "Motivo não informado"
    const datas = porMotivo.get(motivo) ?? []
    datas.push(formatarData(f.data))
    porMotivo.set(motivo, datas)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {falhas.length === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            )}
            Agendamento em massa
          </DialogTitle>
          <DialogDescription>
            {criados.length} criado{criados.length === 1 ? "" : "s"} ·{" "}
            {falhas.length} não {falhas.length === 1 ? "criado" : "criados"} de{" "}
            {resultados.length}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {[...porMotivo.entries()].map(([motivo, datas]) => (
            <div key={motivo} className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">
                {motivo}
                <span className="font-normal">
                  {" "}
                  ({datas.length} {datas.length === 1 ? "data" : "datas"})
                </span>
              </p>
              <p className="mt-1 text-xs text-amber-900/80">{datas.join(", ")}</p>
            </div>
          ))}

          {criados.length > 0 && (
            <p className="text-xs text-muted-foreground">
              As datas criadas já estão na agenda:{" "}
              {criados.map((c) => formatarData(c.data)).join(", ")}.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
