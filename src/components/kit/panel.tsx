"use client";

// Painel e cartão de KPI do design v2 (Módulo 28).
//
// Raio 28px (`rounded-3xl`), borda de 1px em `--rim` (brilho de borda, não
// contorno) e `shadow-card`. A variante `night` é o único painel escuro
// permitido por tela — é o destaque do v2, e dois deles cancelam o efeito.

import * as React from "react";
import { cn } from "@/lib/utils";

/* ── IconTile ─────────────────────────────────────────────────────────────
   Quadrado de 40px com raio 13.6px (0.85rem), ícone a ~47% do tamanho. */

export type TomTile = "brand" | "success" | "warning" | "danger" | "violet" | "neutral";

const TONS_TILE: Record<TomTile, string> = {
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success-ink",
  warning: "bg-warning-soft text-warning-ink",
  danger: "bg-danger-soft text-danger-ink",
  violet: "bg-violet-soft text-violet-ink",
  neutral: "bg-surface-sunken text-ink-3",
};

export function IconTile({
  tom = "brand",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tom?: TomTile }) {
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-[0.85rem] [&_svg]:size-[19px]",
        TONS_TILE[tom],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/* ── Panel ───────────────────────────────────────────────────────────────
   Anatomia conferida no clone navegável do v2:

     section  relative flex flex-col overflow-hidden rounded-[1.75rem]
              border border-rim bg-surface/90 shadow-card      ← SEM padding
       header flex items-start justify-between gap-4
              px-5 pt-5 md:px-6 md:pt-6
       div    flex-1 p-5 md:p-6 (pt-4 md:pt-5 quando há cabeçalho)

   O padding fica no corpo, não na moldura, de propósito: é isso que deixa uma
   tabela ou um gráfico encostar na borda do painel (`semPadding`) sem perder
   o recuo do cabeçalho. Com padding na `section` isso era impossível. */

interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  titulo?: React.ReactNode;
  subtitulo?: React.ReactNode;
  icone?: React.ReactNode;
  acoes?: React.ReactNode;
  rodape?: React.ReactNode;
  variant?: "default" | "muted" | "night";
  /** Corpo sem recuo — para tabela ou gráfico que encosta na borda. */
  semPadding?: boolean;
}

export function Panel({
  titulo,
  subtitulo,
  icone,
  acoes,
  rodape,
  variant = "default",
  semPadding,
  className,
  children,
  ...props
}: PanelProps) {
  const noturno = variant === "night";
  const temCabecalho = Boolean(titulo || acoes);
  return (
    <section
      className={cn(
        "anim-entrada relative flex flex-col overflow-hidden rounded-3xl border",
        variant === "default" && "border-rim bg-surface/90 shadow-card",
        variant === "muted" && "border-rim bg-surface-muted shadow-card",
        noturno &&
          "border-[color:var(--night-line)] text-white shadow-float " +
            "bg-[linear-gradient(160deg,var(--night-from)_0%,var(--night-to)_100%)]",
        className
      )}
      {...props}
    >
      {temCabecalho && (
        <header className="flex items-start justify-between gap-4 px-5 pt-5 md:px-6 md:pt-6">
          <div className="flex min-w-0 items-start gap-3">
            {icone &&
              (noturno ? (
                <span className="grid size-10 shrink-0 place-items-center rounded-[0.85rem] bg-white/10 text-white [&_svg]:size-[19px]">
                  {icone}
                </span>
              ) : (
                <IconTile>{icone}</IconTile>
              ))}
            <div className="min-w-0">
              {titulo && (
                <h2
                  className={cn(
                    "text-[1.3rem] leading-[1.25] font-semibold tracking-[-0.022em]",
                    noturno ? "text-white" : "text-ink"
                  )}
                >
                  {titulo}
                </h2>
              )}
              {subtitulo && (
                <p className={cn("text-sm", noturno ? "text-white/70" : "text-ink-3")}>
                  {subtitulo}
                </p>
              )}
            </div>
          </div>
          {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
        </header>
      )}

      <div
        className={cn(
          "flex-1",
          !semPadding && "p-5 md:p-6",
          !semPadding && temCabecalho && "pt-4 md:pt-5"
        )}
      >
        {children}
      </div>

      {rodape && (
        <footer
          className={cn(
            "flex items-center justify-between gap-3 border-t px-5 py-4 text-sm md:px-6",
            noturno ? "border-white/10 text-white/70" : "border-hairline text-ink-3"
          )}
        >
          {rodape}
        </footer>
      )}
    </section>
  );
}

/* ── StatCard ─────────────────────────────────────────────────────────────
   Anatomia conferida no clone navegável do v2:

     div   relative flex flex-col overflow-hidden rounded-[1.75rem]
           border border-rim p-5 shadow-card md:p-6 min-h-[13rem] + gradiente
       div flex items-start justify-between gap-3
         p    text-[0.95rem] font-medium text-ink            ← rótulo
         span size-9 rounded-full bg-surface/80 + sombra     ← chip do ícone,
              text-[var(--kpi-*-ink)]                          TINGIDO no tom
       div mt-auto pt-6
         p   tabular font-bold tracking-[-0.04em] + tamanho + tom
         p   mt-3 text-[0.8rem] text-ink-3                   ← legenda

   O `mt-auto pt-6` (em vez de `justify-between`) mantém o número colado na
   base mesmo quando o rótulo ocupa duas linhas — é o que faz uma fileira de
   quatro cartões ter os números na mesma altura.

   ## Gradiente é o padrão, não a exceção

   O v2 usa a fileira pastel em toda tela de listagem, não só no dashboard:
   quatro cartões com `blue, lavender, mint, peach` e o primeiro em `hero`,
   três com `blue, mint, peach` e todos em `md`. O destaque do primeiro vem
   do grid (`xl:grid-cols-[1.25fr_1fr_1fr_1fr]`), não só do corpo da fonte. */

export type TomKpi = "blue" | "lavender" | "mint" | "peach" | "white";

const FUNDO_KPI: Record<TomKpi, string> = {
  blue: "bg-[linear-gradient(115deg,var(--kpi-blue-from)_0%,var(--kpi-blue-via)_55%,var(--kpi-blue-to)_100%)]",
  lavender:
    "bg-[linear-gradient(140deg,var(--kpi-lavender-from)_0%,var(--kpi-lavender-to)_100%)]",
  mint: "bg-[linear-gradient(140deg,var(--kpi-mint-from)_0%,var(--kpi-mint-to)_100%)]",
  peach: "bg-[linear-gradient(140deg,var(--kpi-peach-from)_0%,var(--kpi-peach-to)_100%)]",
  white: "bg-surface",
};

const TINTA_KPI: Record<TomKpi, string> = {
  blue: "text-[color:var(--kpi-blue-ink)]",
  lavender: "text-[color:var(--kpi-lavender-ink)]",
  mint: "text-[color:var(--kpi-mint-ink)]",
  peach: "text-[color:var(--kpi-peach-ink)]",
  white: "text-brand",
};

const TAMANHO_VALOR = {
  hero: "text-[4.5rem] md:text-[5.25rem]",
  md: "text-[3.25rem]",
  sm: "text-[2.25rem]",
} as const;

/** Cor do ícone no chip, no tom do cartão. No `white` não há tom pastel, então
 *  o ícone fica na marca — é o que o v2 faz nos dois cartões brancos do
 *  dashboard. */
const TINTA_ICONE: Record<TomKpi, string> = {
  blue: "text-[color:var(--kpi-blue-ink)]",
  lavender: "text-[color:var(--kpi-lavender-ink)]",
  mint: "text-[color:var(--kpi-mint-ink)]",
  peach: "text-[color:var(--kpi-peach-ink)]",
  white: "text-brand",
};

/** Ordem dos tons numa fileira, como no v2. Quatro cartões: o primeiro é o
 *  destaque. Três: sai o lavanda. */
export const TONS_FILEIRA: TomKpi[] = ["blue", "lavender", "mint", "peach"];

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  rotulo: React.ReactNode;
  valor: React.ReactNode;
  hint?: React.ReactNode;
  icone?: React.ReactNode;
  tom?: TomKpi;
  size?: keyof typeof TAMANHO_VALOR;
}

export function StatCard({
  rotulo,
  valor,
  hint,
  icone,
  tom = "white",
  size = "md",
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn(
        "anim-entrada relative flex flex-col overflow-hidden rounded-3xl border border-rim p-5 shadow-card md:p-6",
        size === "sm" ? "min-h-[10rem]" : "min-h-[13rem]",
        FUNDO_KPI[tom],
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.95rem] leading-snug font-medium text-ink">{rotulo}</p>
        {icone && (
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full bg-surface/80",
              "shadow-[0_1px_2px_rgba(15,27,61,0.06)] [&_svg]:size-4",
              TINTA_ICONE[tom]
            )}
          >
            {icone}
          </span>
        )}
      </div>

      <div className="mt-auto pt-6">
        <p
          className={cn(
            "tabular leading-none font-bold tracking-[-0.04em]",
            TAMANHO_VALOR[size],
            TINTA_KPI[tom]
          )}
        >
          {valor}
        </p>
        {hint && <p className="mt-3 text-[0.8rem] text-ink-3">{hint}</p>}
      </div>
    </div>
  );
}
