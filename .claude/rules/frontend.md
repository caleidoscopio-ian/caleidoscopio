---
paths:
  - "src/components/**/*.tsx"
  - "src/app/**/page.tsx"
---

# Frontend — React, UI e Acessibilidade

## Stack UI

- **shadcn/ui** (estilo New York) — componentes base em `src/components/ui/`
- **Lucide React** — ícones
- **Tailwind CSS v4** — estilização
- **React Hook Form + Zod** — formulários e validação
- **Sonner** — toast notifications
- **date-fns** — manipulação de datas

## Estrutura de Componentes

```
src/components/
├── ui/              # shadcn/ui base (NÃO editar manualmente, usar `npx shadcn add`)
├── forms/           # Formulários de CRUD (novo-*, editar-*, excluir-*)
├── [módulo]/        # Componentes por feature (atividades/, curriculum/, avaliacoes/)
├── main-layout.tsx  # Layout principal
└── app-sidebar.tsx  # Sidebar com navegação role-based
```

## Padrões de Página

```tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { MainLayout } from '@/components/main-layout';

export default function NomePage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        {/* conteúdo */}
      </MainLayout>
    </ProtectedRoute>
  );
}
```

## Navegação

- Sidebar role-based definida em `src/lib/navigation.ts`
- Função `getSidebarItems(userRole)` retorna items por role
- Roles: patient, therapist, guardian, admin, super_admin

## Acessibilidade (WCAG 2.1 AA)

- Todos elementos interativos acessíveis via teclado
- ARIA labels para screen readers
- Contraste de cor > 4.5:1
- Indicadores de foco visíveis
- Respeitar prefers-reduced-motion

## Considerações TEA

- UI simples e clara, sem elementos que sobrecarreguem
- Padrões de navegação consistentes
- Indicadores visuais de progresso
- Níveis de dificuldade customizáveis
- Mecanismos de reforço positivo

## Formulários

- Sempre usar React Hook Form com resolver Zod
- Validação no client E no server (API route)
- Feedback visual de erros inline
- Loading states durante submissão
