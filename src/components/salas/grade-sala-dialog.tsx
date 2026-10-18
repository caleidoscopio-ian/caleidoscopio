"use client"

// Horário de funcionamento da sala (Módulo 27).
//
// Reaproveita o `GradeEditor` da grade do profissional — é a mesma tela de
// blocos dia/hora. A diferença é a rota e a permissão: configurar capacidade
// física é `salas: MANAGE`, não `agenda: UPDATE`. O campo de filial não aparece
// porque a rota da sala não devolve filiais: a sala já pertence a uma.

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Clock } from "lucide-react"
import { GradeEditor } from "@/components/ocupacao-prof/grade-editor"

interface GradeSalaDialogProps {
  salaId: string | null
  salaNome: string
  filialNome?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function GradeSalaDialog({
  salaId,
  salaNome,
  filialNome,
  open,
  onOpenChange,
  onSaved,
}: GradeSalaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horário de Funcionamento
          </DialogTitle>
          <DialogDescription>
            {salaNome}
            {filialNome ? ` · ${filialNome}` : ""} — é o que define a capacidade da
            sala no mapa de ocupação.
          </DialogDescription>
        </DialogHeader>

        <GradeEditor
          endpoint={salaId ? `/api/salas/${salaId}/grade` : null}
          ativo={open}
          permissao={{ recurso: "salas", acao: "MANAGE" }}
          onCancelar={() => onOpenChange(false)}
          onSaved={() => {
            onOpenChange(false)
            onSaved?.()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
