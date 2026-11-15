"use client"

// AJUSTADO PARA O DESIGN V2 (Módulo 28) — `npx shadcn add tabs` apaga isto.
// Comparar com o git antes de aceitar uma versão nova.
//
// Mesmo desenho do `Segmented` do kit, conferido no clone do v2:
//
//   lista    inline-flex gap-0.5 rounded-full bg-surface-sunken p-1
//   gatilho  h-8 rounded-full px-3.5 text-[0.8rem] font-medium
//            ativo → bg-surface + sombra fina; inativo → text-ink-3
//
// Por que não trocar tudo por `Segmented`: estas são abas de verdade, com
// painel associado. O `Segmented` é um controle de filtro — tem
// `role="tablist"`, mas não liga aba e conteúdo por `aria-controls`. Mantendo
// o Radix, as 16 telas com abas ganham o visual do v2 sem perder acessibilidade
// e sem edição tela a tela.
//
// A única diferença visível para o `Segmented`: aqui o marcador **não desliza**
// (trocar de aba acende o fundo em vez de animar). O deslize depende de saber
// qual opção está ativa na hora de renderizar, e o Radix não expõe esse estado
// para quem monta a lista.

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

/** Trilho das abas. Com muitas abas (o prontuário tem nove) o trilho rola na
 *  horizontal em vez de espremer os rótulos — `scrollbar-none` esconde a barra,
 *  como no v2. */
function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <div className="scrollbar-none -mx-1 max-w-full overflow-x-auto px-1 py-0.5">
      <TabsPrimitive.List
        data-slot="tabs-list"
        className={cn(
          "inline-flex w-max items-center gap-0.5 rounded-full bg-surface-sunken p-1",
          className
        )}
        {...props}
      />
    </div>
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3.5",
        "text-[0.8rem] font-medium whitespace-nowrap text-ink-3 transition-colors duration-150",
        "hover:text-ink-2",
        "data-[state=active]:bg-surface data-[state=active]:text-ink",
        "data-[state=active]:shadow-[0_1px_3px_rgba(15,27,61,0.12)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
