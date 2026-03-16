---
name: criar-componente
description: Criar novo componente React seguindo os padrões do projeto. Usar quando precisar criar componentes em src/components/.
---

# Criar Componente React

Você vai criar um componente React para o projeto Caleidoscópio.

## Etapas

1. **Definir o tipo do componente**:
   - **Página** → `src/app/{rota}/page.tsx` (com ProtectedRoute + MainLayout)
   - **Formulário** → `src/components/forms/{nome}-form.tsx`
   - **Dialog** → `src/components/forms/{nome}-dialog.tsx`
   - **Feature** → `src/components/{módulo}/{nome}.tsx`
   - **UI base** → Usar `npx shadcn add {componente}` (NUNCA criar manualmente)

2. **Verificar componentes existentes** — Buscar em `src/components/` componentes similares como referência

3. **Implementar seguindo o padrão**:
   - `'use client'` no topo para componentes interativos
   - Imports via aliases (`@/components`, `@/lib`, `@/hooks`)
   - Ícones: Lucide React
   - Estilização: Tailwind CSS classes
   - Formulários: React Hook Form + Zod
   - Toast: Sonner
   - API calls: `apiGet`, `apiPost`, `apiPut`, `apiDelete` de `@/lib/api`

4. **Acessibilidade TEA**:
   - UI simples, sem sobrecarga visual
   - Elementos focáveis via teclado
   - ARIA labels
   - Indicadores de progresso
   - Contraste > 4.5:1

## Template de Página

```tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { MainLayout } from '@/components/main-layout';

export default function NomePage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <MainLayout>
        {/* conteúdo */}
      </MainLayout>
    </ProtectedRoute>
  );
}
```

## Checklist

- [ ] Imports via aliases
- [ ] Props tipadas com interface
- [ ] Sem tipo `any`
- [ ] Acessibilidade (ARIA, keyboard, contraste)
- [ ] Loading/error states
