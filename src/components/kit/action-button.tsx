"use client";

// Botão em pílula do design v2 (Módulo 28).
//
// Anatomia conferida contra as classes capturadas na auditoria do v2
// (`componentes_observados.json`) e os estilos computados:
//   sm 36px / px-3.5 / 0.8rem · md 44px / px-5 / 0.875rem · lg 48px / px-6 / 0.95rem
//
// Não substitui o `Button` do shadcn: aquele continua servindo formulário e
// diálogo, e herda a paleta pelos aliases. Este é o botão de ação das telas,
// que no v2 é sempre pílula.

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { IconeAnimado } from "./movimento";

const estilos = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap " +
    "transition-[color,background-color,border-color,box-shadow] duration-150 " +
    "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-ring " +
    "disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // `--brand-acao` em vez de `--brand`: no modo noite o branco sobre o
        // brand dá 3.68:1, abaixo do mínimo para texto de 14px (ver
        // tokens-ajustes.css)
        primary:
          "bg-brand-acao text-white shadow-[0_8px_20px_-8px_rgba(47,85,240,0.7)] hover:bg-brand-strong",
        secondary:
          "border border-rim bg-surface/85 text-ink shadow-[0_1px_2px_rgba(15,27,61,0.06)] hover:bg-surface",
        ghost: "text-ink-2 hover:bg-surface-sunken hover:text-ink",
        danger: "bg-danger-soft text-danger-ink hover:bg-danger hover:text-white",
        night: "bg-white/15 text-white hover:bg-white/25",
      },
      size: {
        sm: "h-9 px-3.5 text-[0.8rem] gap-1.5 [&_svg]:size-3.5",
        md: "h-11 px-5 text-[0.875rem] [&_svg]:size-4",
        lg: "h-12 px-6 text-[0.95rem] [&_svg]:size-[18px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof estilos> {}

export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  function ActionButton({ className, variant, size, type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(estilos({ variant, size }), className)}
        {...props}
      />
    );
  }
);

/** Botão circular de 44px da topbar. `aria-label` é obrigatório: só tem ícone.
 *
 *  O `motion.span` por fora existe só para transmitir a variante ao ícone: ele
 *  abraça o botão (44px, `inline-flex`), então pairar nele é pairar no botão.
 *  Converter o próprio `<button>` em `motion.button` conflitaria com os
 *  handlers `onDrag*`/`onAnimation*` que o tipo do HTML já declara — e o
 *  envelope não custa nada. */
export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    "aria-label": string;
    /** Ponto de aviso ou contador. Fica FORA do ícone animado de propósito:
     *  `transform` num ancestral vira bloco contedor de quem é `absolute`, e o
     *  ponto pularia de lugar na primeira vez que o ícone se mexesse. */
    marcador?: React.ReactNode;
  }
>(function IconButton({ className, type = "button", children, marcador, ...props }, ref) {
  return (
    <motion.span
      className="inline-flex shrink-0"
      initial="repouso"
      whileHover={props.disabled ? undefined : "pairado"}
      whileTap={props.disabled ? undefined : "pressionado"}
    >
      <button
        ref={ref}
        type={type}
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-full border border-rim bg-surface/85 text-ink-2",
          "shadow-[0_1px_2px_rgba(15,27,61,0.06)] transition duration-150",
          "hover:bg-surface hover:text-brand",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-ring",
          "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[18px]",
          className
        )}
        {...props}
      >
        <IconeAnimado>{children}</IconeAnimado>
        {marcador}
      </button>
    </motion.span>
  );
});
