"use client"

// Modal da grade de atendimento, usado na taxa de ocupação.
// O conteúdo é o `GradeEditor`, o mesmo da aba na ficha do profissional.

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { CalendarDays } from "lucide-react"
import { GradeEditor } from "@/components/ocupacao-prof/grade-editor"

interface GradeDialogProps {
  profissionalId: string | null
  profissionalNome: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function GradeDialog({ profissionalId, profissionalNome, open, onOpenChange, onSaved }: GradeDialogProps) {
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

        <GradeEditor
          endpoint={profissionalId ? `/api/terapeutas/${profissionalId}/grade` : null}
          ativo={open}
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
