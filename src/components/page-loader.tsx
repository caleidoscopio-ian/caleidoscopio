"use client";

// Tela de carregamento com a marca (Módulo 28).
//
// Antes eram dois desenhos diferentes e nenhum era a marca: um quadrado com a
// letra "C" desenhada à mão (aqui) e um quadradinho azul com um ponto branco
// (no `ProtectedRoute`). Agora é uma peça só, com o logotipo de verdade —
// claro e escuro, como na topbar.
//
// Os arquivos são os mesmos da topbar (`public/caleido_logox*.png`), servidos
// por `next/image` com `priority`: é a primeira coisa que aparece na tela.

import Image from "next/image";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  message?: string;
  /** Ocupa a janela inteira — para o guard de rota, antes da casca existir. */
  telaCheia?: boolean;
  className?: string;
}

export function PageLoader({
  message = "Carregando...",
  telaCheia,
  className,
}: PageLoaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        telaCheia ? "min-h-dvh bg-canvas" : "min-h-[60vh]",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* Tamanho fixo em vez de `fill`: com `fill` quem manda é a altura do
          container, e o logotipo (proporção 1,75) encolhia para caber. */}
      <Image
        src="/caleido_logox.png"
        alt="Caleidoscópio"
        width={252}
        height={144}
        priority
        className="h-auto w-[15.75rem] dark:hidden"
      />
      <Image
        src="/caleido_logox_dark.png"
        alt=""
        width={252}
        height={144}
        priority
        className="hidden h-auto w-[15.75rem] dark:block"
      />

      {/* O anel é o mesmo do `Carregando` do kit — dois giros diferentes na
          mesma sessão fazem a espera parecer dois sistemas. */}
      <span
        className="size-6 animate-spin rounded-full border-2 border-hairline border-t-brand"
        aria-hidden
      />
      <p className="text-sm text-ink-3">{message}</p>
    </div>
  );
}
