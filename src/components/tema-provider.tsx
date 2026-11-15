"use client";

// Modo noite (Módulo 28).
//
// O v2 alterna claro/noite pela topbar e guarda a escolha. Aqui o tema é uma
// classe `.dark` no html — é o que `@custom-variant dark` do globals espera e
// o que faz os tokens de `tokens-v2.css` trocarem de valor.
//
// `disableTransitionOnChange` fica FALSO de propósito: a transição de 400ms em
// cor é parte do design do v2. Quem desliga animação no sistema continua
// protegido pelo `prefers-reduced-motion` do globals.

import { ThemeProvider } from "next-themes";

export function TemaProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="caleidoscopio-tema"
    >
      {children}
    </ThemeProvider>
  );
}
