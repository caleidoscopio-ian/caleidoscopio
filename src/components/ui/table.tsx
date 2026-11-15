"use client"

// AJUSTADO PARA O DESIGN V2 (Módulo 28) — `npx shadcn add table` apaga isto.
// Comparar com o git antes de aceitar uma versão nova.
//
// Anatomia conferida no clone navegável do v2 (/usuarios, /pacientes, /salas):
//
//   table   w-full border-separate border-spacing-y-1.5 text-sm
//     thead th  px-4 pb-1 text-[0.72rem] font-medium tracking-wide uppercase
//                text-ink-4
//     tbody tr  bg-surface-muted transition-colors
//                [&>td:first-child]:rounded-l-2xl [&>td:last-child]:rounded-r-2xl
//           td  px-4 py-3.5 align-middle text-ink-2
//
// A diferença que importa: **a linha é uma faixa arredondada, não uma linha
// com borda embaixo**. Daí `border-separate` com `border-spacing-y-1.5` (6px
// de respiro entre faixas) e o raio só nas pontas. A divisória de 1px era o
// padrão do shadcn e era o que fazia a tabela destoar do resto da casca.
//
// Também sai o `whitespace-nowrap` das células: no v2 a coluna estreita quebra
// em duas linhas em vez de empurrar a tabela para o scroll horizontal.

import * as React from "react"

import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn(
          "w-full caption-bottom border-separate border-spacing-y-1.5 text-sm",
          className
        )}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn(className)} {...props} />
}

/** A faixa mora aqui, no `tbody`, e não no `TableRow`: a mesma peça serve de
 *  linha de cabeçalho em quase toda tela, e no v2 o cabeçalho não tem fundo. */
function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn(
        "[&>tr]:bg-surface-muted",
        "[&>tr>td:first-child]:rounded-l-2xl [&>tr>td:last-child]:rounded-r-2xl",
        className
      )}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "font-medium [&>tr]:bg-surface-sunken",
        "[&>tr>td:first-child]:rounded-l-2xl [&>tr>td:last-child]:rounded-r-2xl",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "group transition-colors data-[state=selected]:bg-brand-soft",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "px-4 pb-1 text-left align-middle text-[0.72rem] font-medium tracking-wide text-ink-4 uppercase",
        "[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-4 py-3.5 align-middle text-ink-2",
        "[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-ink-3", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
