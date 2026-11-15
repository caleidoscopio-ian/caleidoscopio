"use client";

// Camada de movimento do design v2 (Módulo 28).
//
// O `motion` entra só onde o CSS não chega:
//
//   1. marcador que **desliza** entre dois elementos diferentes (sidebar,
//      seletor segmentado) — é animação de layout compartilhado (`layoutId`),
//      a única coisa aqui que uma transição CSS não sabe fazer;
//   2. mola de verdade no ícone ao pairar, com propagação de variante do pai
//      (o hover está no item do menu, o movimento está no ícone);
//   3. transição entre rotas.
//
// Entrada de painel e de KPI continua em CSS (`.anim-entrada` no globals):
// é a mesma animação, custa zero JavaScript e já obedece ao
// `prefers-reduced-motion` global.
//
// ## Amplitude é requisito, não gosto
//
// Esta é uma plataforma para TEA, e `frontend.md` pede "UI simples e clara, sem
// elementos que sobrecarreguem". Por isso o movimento aqui é **curto e sem
// repetição**: nada pulsa, nada chama atenção sozinho, nada se move sem o
// usuário ter agido. Os valores abaixo são o teto, não um ponto de partida.

import * as React from "react";
import { MotionConfig, motion, type Transition, type Variants } from "motion/react";

/* ── Molas ────────────────────────────────────────────────────────────────── */

/** Marcador que desliza. Mola do v2: firme, sem passar do ponto. */
export const MOLA_MARCADOR: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 32,
  mass: 0.9,
};

/** Reação a toque e hover: mais solta, para o ícone ter vida. */
export const MOLA_TOQUE: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 24,
  mass: 0.6,
};

/** Troca de rota: sem mola — distância curta pede curva previsível. */
export const CURVA_ROTA: Transition = {
  duration: 0.22,
  ease: [0.22, 0.61, 0.36, 1],
};

/* ── Provedor ─────────────────────────────────────────────────────────────
   `reducedMotion="user"` é o que faz o respeito ao sistema operacional valer
   para o JavaScript também: o CSS já tinha a media query, mas animação de
   layout e de mola acontece fora dela. Com isso, quem desliga animação no
   sistema recebe a mudança de cor e de opacidade, sem nada deslizando. */

export function ProvedorMovimento({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={MOLA_MARCADOR}>
      {children}
    </MotionConfig>
  );
}

/* ── Marcador deslizante ──────────────────────────────────────────────────
   Dois irmãos com o mesmo `layoutId` nunca coexistem: o marcador é um só, e é
   por isso que ele desliza de um item para o outro em vez de piscar.

   O `id` **precisa** ser único por instância montada. A sidebar aparece duas
   vezes ao mesmo tempo no mobile (fixa + gaveta), e com o id repetido o motion
   tentaria interpolar entre as duas cascas — daí `React.useId()` em quem usa. */

export function MarcadorDeslizante({
  id,
  className,
  transition = MOLA_MARCADOR,
}: {
  id: string;
  className?: string;
  transition?: Transition;
}) {
  return (
    <motion.span
      layoutId={id}
      aria-hidden
      className={className}
      transition={transition}
      // Entrar e sair por opacidade: o primeiro marcador da tela não vem
      // voando de canto nenhum, só aparece onde deveria estar.
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  );
}

/* ── Ícone animado ───────────────────────────────────────────────────────── */

/** Nomes de variante compartilhados entre o pai (quem recebe o hover) e o
 *  ícone (quem se move). Trocar por string literal aqui quebra em silêncio. */
export const ESTADOS = {
  repouso: "repouso",
  pairado: "pairado",
  pressionado: "pressionado",
} as const;

const VARIANTES_ICONE: Variants = {
  repouso: { scale: 1, rotate: 0 },
  pairado: { scale: 1.12, rotate: -6 },
  pressionado: { scale: 0.94, rotate: 0 },
};

/**
 * Envolve um ícone para ele reagir ao hover do **pai**.
 *
 * O v2 usa `animate-ui`, que animaria os traços de dentro do SVG. Aqui o ícone
 * é Lucide e o movimento é do conjunto — mesma intenção, uma peça só:
 *
 * ```tsx
 * <motion.li initial="repouso" whileHover="pairado">
 *   <IconeAnimado><Users /></IconeAnimado>
 * </motion.li>
 * ```
 *
 * Sem um pai `motion` com `whileHover`, fica parado — e isso é aceitável.
 */
export function IconeAnimado({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.span
      aria-hidden
      className={className}
      variants={VARIANTES_ICONE}
      transition={MOLA_TOQUE}
      style={{ display: "inline-flex" }}
    >
      {children}
    </motion.span>
  );
}

/* ── Transição entre rotas ────────────────────────────────────────────────
   Só na entrada. Animar a saída exigiria segurar a tela antiga enquanto a nova
   carrega (`AnimatePresence` + `usePathname`), e no App Router isso atrasa o
   conteúdo em troca de 200ms de enfeite. */

export function TransicaoDePagina({
  chave,
  children,
  className,
}: {
  chave: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      key={chave}
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={CURVA_ROTA}
    >
      {children}
    </motion.div>
  );
}
