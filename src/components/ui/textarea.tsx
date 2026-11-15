// AJUSTADO para o design v2 (Módulo 28) — ver .claude/rules/frontend.md.
// Re-adicionar este componente com `npx shadcn add` apaga o ajuste; comparar
// com git antes de aceitar a versão nova.

import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-hairline placeholder:text-ink-4 focus-visible:border-brand/40 focus-visible:ring-brand-ring aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-xl border bg-surface-muted px-3.5 py-2.5 text-base text-ink transition-[color,box-shadow] outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
