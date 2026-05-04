"use client";

import { Loader2 } from "lucide-react";

interface PageLoaderProps {
  message?: string;
}

/**
 * Tela de carregamento centralizada para usar enquanto dados de página são buscados.
 * Usar no lugar de skeletons quando a página inteira ainda não pode ser renderizada.
 */
export function PageLoader({ message = "Carregando..." }: PageLoaderProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <span className="text-primary font-bold text-2xl">C</span>
        </div>
        <div className="absolute -bottom-1 -right-1">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
}
