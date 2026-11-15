"use client";

// Casca visual do v2 (Módulo 28): sidebar + topbar + área de conteúdo.
//
// Separada do `MainLayout` de propósito. O `MainLayout` é a casca **mais** o
// `ProtectedRoute`; aqui está só a composição. Com isso:
//
//   - o guia `/design-system` mostra a casca de verdade, não uma cópia dela
//     (cópia divergiria na primeira mudança);
//   - dá para conferir o layout sem o Sistema 1 no ar.
//
// Composição conferida contra o clone navegável do v2 (design/README.md):
//
//   div    min-h-dvh p-3 md:p-4
//     div  flex gap-3 md:gap-4
//       aside  264px, vidro, sticky top-4
//       main   flex-1, raio 28px → 32px no md, bg-panel/80, backdrop-blur-xl
//         div  mx-auto w-full max-w-[1480px] px-4 py-5 md:px-7 md:py-6
//           (topbar)
//           div  mt-6 md:mt-7 → div.space-y-7 → conteúdo

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { SidebarV2 } from "@/components/shell/sidebar-v2";
import { TopbarV2 } from "@/components/shell/topbar-v2";
import { TransicaoDePagina } from "@/components/kit";
import { cn } from "@/lib/utils";

const CHAVE_RECOLHIDA = "caleidoscopio-menu-recolhido";

export function CascaV2({ children }: { children: React.ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [recolhida, setRecolhida] = useState(false);
  const rota = usePathname();

  // Lido depois da montagem: `localStorage` não existe no servidor, e ler no
  // primeiro render faria a sidebar nascer expandida e saltar para 88px.
  useEffect(() => {
    try {
      setRecolhida(localStorage.getItem(CHAVE_RECOLHIDA) === "1");
    } catch {
      /* armazenamento bloqueado: segue expandida */
    }
  }, []);

  const alternarRecolhida = () => {
    setRecolhida((r) => {
      try {
        localStorage.setItem(CHAVE_RECOLHIDA, r ? "0" : "1");
      } catch {
        /* a preferência não persiste, a sessão continua */
      }
      return !r;
    });
  };

  return (
    <div className="min-h-dvh w-full p-3 md:p-4">
      <div className="flex gap-3 md:gap-4">
        <SidebarV2 recolhida={recolhida} />

        {/* Sidebar no mobile: mesma peça, sobre um véu */}
        {menuAberto && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setMenuAberto(false)}
              className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            />
            <div className="absolute inset-y-3 left-3">
              <SidebarV2 className="flex h-[calc(100dvh-1.5rem)]" />
              <button
                type="button"
                onClick={() => setMenuAberto(false)}
                aria-label="Fechar menu"
                className="absolute top-4 right-4 grid size-9 place-items-center rounded-full bg-surface text-ink-2 shadow-card"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        )}

        <main
          className={cn(
            "min-w-0 flex-1 rounded-[1.75rem] border border-rim bg-panel/80 shadow-card backdrop-blur-xl",
            "min-h-[calc(100dvh-1.5rem)] md:min-h-[calc(100dvh-2rem)] md:rounded-[2rem]"
          )}
        >
          <div className="mx-auto w-full max-w-[1480px] px-4 py-5 md:px-7 md:py-6">
            <TopbarV2
              onAlternarMenu={() => setMenuAberto(true)}
              onAlternarRecolhida={alternarRecolhida}
              recolhida={recolhida}
            />
            {/* A chave é a rota: o conteúdo entra de novo a cada navegação, e a
                topbar e a sidebar ficam paradas — é o que faz a casca parecer
                casca, em vez de a página inteira recarregar. */}
            <TransicaoDePagina chave={rota ?? ""} className="mt-6 md:mt-7">
              <div className="space-y-7">{children}</div>
            </TransicaoDePagina>
          </div>
        </main>
      </div>
    </div>
  );
}
