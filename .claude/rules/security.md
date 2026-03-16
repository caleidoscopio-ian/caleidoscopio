# Segurança — Checklist e Práticas Proibidas

## Práticas PROIBIDAS (NEVER)

- NUNCA usar tipo `any` — usar tipos Prisma ou interfaces específicas
- NUNCA query sem `tenantId` em models isolados
- NUNCA expor IDs internos em URLs (usar UUIDs)
- NUNCA confiar em dados client-side de tenant/user para autorização
- NUNCA usar `dangerouslySetInnerHTML` sem sanitização
- NUNCA armazenar dados sensíveis em localStorage (tokens são exceção controlada pelo SSO)
- NUNCA commitar `console.log` statements
- NUNCA usar operações síncronas que bloqueiam UI
- NUNCA importar de `src/` — usar aliases (`@/`)
- NUNCA mutar props ou state diretamente
- NUNCA pular error boundaries para operações async
- NUNCA referenciar campos que não existem no schema
- NUNCA atribuir query params a enums sem validação
- NUNCA commitar arquivos `.env` ou dumps de banco

## Isolamento Multi-Tenant

- Todas queries incluem filtro `tenantId`
- API routes validam acesso do tenant
- Respostas não vazam dados cross-tenant

## Proteção de Dados

- Sanitização de input em todos os formulários
- XSS via escaping padrão do React
- CSRF tokens para operações que alteram estado
- 401 → auto-logout automático

## Performance

- LCP < 2.5s · FID < 100ms · CLS < 0.1
- Bundle < 300KB main chunk
- Usar `next/image` para imagens
- Usar `next/font` para fontes
