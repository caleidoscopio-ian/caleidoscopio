---
paths:
  - "src/app/api/auth/**/*.ts"
  - "src/hooks/useAuth.tsx"
  - "src/lib/manager-client*.ts"
  - "src/components/ProtectedRoute.tsx"
  - "src/middleware.ts"
---

# Autenticação — SSO com Sistema 1

## Fluxo SSO

1. Login via `managerClient.ssoLogin()` → Sistema 1 valida → gera token SSO
2. Token validado periodicamente (cada 5 min) via `managerClient.validateSSOToken()`
3. Dados do usuário em localStorage: `edu_auth_user`, `edu_auth_token`
4. Auto-logout em respostas 401

## Arquivos-chave

- `src/lib/manager-client.ts` — Client SSO (authenticateUser, validateAccess, generateSSOToken)
- `src/hooks/useAuth.tsx` — Context de auth (user, tenant, isAdmin, config)
- `src/components/ProtectedRoute.tsx` — Wrapper de proteção de rotas
- `src/middleware.ts` — Middleware Next.js (valida token em cookies/Authorization)

## Uso em Páginas

```tsx
'use client';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function MinhaPage() {
  return (
    <ProtectedRoute>
      <ConteudoProtegido />
    </ProtectedRoute>
  );
}

function ConteudoProtegido() {
  const { user, tenant, isAdmin, config } = useAuth();
  // user.tenantId para queries
}
```

## useAuth() retorna

- `user` — Dados do usuário autenticado (inclui tenantId, role)
- `tenant` — Dados da clínica/tenant
- `isAuthenticated` — Status de autenticação
- `isAdmin` — Verifica role admin
- `config` — Configurações específicas do tenant
- `login(data)` — Função de login
- `logout()` — Função de logout

## Rotas Públicas

Definidas em `src/middleware.ts`: `/`, `/login`, `/api/health`
