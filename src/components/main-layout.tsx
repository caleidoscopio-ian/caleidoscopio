"use client";

// Casca das telas internas: `CascaV2` (a composição) dentro do
// `ProtectedRoute` (a autorização). A separação existe para o guia visual
// poder mostrar a casca de verdade sem o Sistema 1 no ar — ver
// `@/components/shell/casca`.
//
// `SidebarProvider` continua aqui de propósito: `FilialSelector` e `NavUser`
// consomem `useSidebar()`. Ele entra como contexto, não como visual.

import ProtectedRoute from "@/components/ProtectedRoute";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CascaV2 } from "@/components/shell/casca";
import { ProvedorTrilha, type Migalha } from "@/components/kit/trilha";

interface MainLayoutProps {
  children: React.ReactNode;
  /** Migalhas explícitas. Sem elas, o `PageHeader` deriva da rota. */
  breadcrumbs?: Migalha[];
}

export function MainLayout({ children, breadcrumbs }: MainLayoutProps) {
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <ProvedorTrilha migalhas={breadcrumbs}>
          <CascaV2>{children}</CascaV2>
        </ProvedorTrilha>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
