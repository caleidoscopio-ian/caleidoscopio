---
name: criar-feature
description: Implementar feature completa (schema + API + UI + types). Usar para funcionalidades que tocam múltiplas camadas.
---

# Implementar Feature Completa

Você vai implementar uma feature end-to-end no projeto Caleidoscópio.

## Sequência de Implementação

### Fase 1: Planejamento
1. **Entender o escopo** — O que a feature faz? Quais módulos afeta?
2. **Analisar schema** — Ler `prisma/schema.prisma`, verificar se precisa de novos models
3. **Mapear arquivos** — Listar todos os arquivos que serão criados/modificados
4. **Apresentar plano** — Usar o Plan agent para aprovação antes de implementar

### Fase 2: Backend (se necessário alteração de schema)
1. **Alterar schema** — Adicionar/modificar models em `prisma/schema.prisma`
2. **Gerar client** — `npx prisma generate`
3. **Sync DB** — `npx prisma db push` (dev) ou `npx prisma migrate dev` (produção)
4. **Criar API routes** — Seguir padrões de `/criar-api`

### Fase 3: Frontend
1. **Criar tipos** — Interfaces em `src/types/` se necessário
2. **Criar componentes** — Seguir padrões de `/criar-componente`
3. **RBAC obrigatório** — Ver seção abaixo
4. **Adicionar navegação** — Atualizar `src/lib/navigation.ts` se nova rota
5. **Atualizar sidebar** — Se necessário, `src/components/app-sidebar.tsx`

### Fase 4: Validação
1. **Build** — `npm run build` (obrigatório, deve passar sem erros)
2. **Review** — Verificar isolamento multi-tenant, tipos, segurança, RBAC

## RBAC — Obrigatório em Toda Feature

**SEMPRE** ao criar uma nova página ou recurso:

### 1. ProtectedRoute com resource correto
```tsx
// O resource DEVE ser o slug exato definido em prisma/seed-rbac.ts
<ProtectedRoute requiredPermission={{ resource: 'slug-do-recurso', action: 'VIEW' }}>
```

### 2. Verificar slug no seed
Antes de usar um resource, confirmar que ele existe em `prisma/seed-rbac.ts`:
```typescript
// Lista de recursos válidos em seed-rbac.ts
{ slug: 'pacientes' }, { slug: 'agenda' }, { slug: 'terapeutas' }, ...
```
Se o recurso for novo → adicionar no seed E no `bootstrap-roles.ts`.

### 3. API routes com hasPermission
Cada endpoint usa a action-key correta do `src/lib/auth/action-map.ts`:
```typescript
if (!await hasPermission(user, 'view_professionals')) { ... }
```

### 4. Permission matrix
Verificar que o recurso aparece em `src/components/rbac/permission-matrix.tsx`.
Se não estiver → adicionar na lista `RECURSOS`.

### 5. Sidebar
Se a rota deve aparecer no menu, usar `requiredPermission` em `src/lib/navigation.ts`:
```typescript
{ title: "...", href: "/rota", icon: Icon, requiredPermission: { resource: "slug", action: "VIEW" } }
```

### Checklist RBAC por feature
- [ ] `ProtectedRoute` com `resource` = slug correto do seed
- [ ] Recurso existe em `prisma/seed-rbac.ts`
- [ ] Recurso existe em `src/lib/auth/bootstrap-roles.ts`
- [ ] API routes usam `hasPermission` com action-key do `action-map.ts`
- [ ] Recurso na `permission-matrix.tsx`
- [ ] Item no sidebar (se aplicável) com `requiredPermission`

## Delegação a Subagents

Para features grandes:
- Use **Explore agent** para pesquisar padrões existentes
- Use **background agents** para build enquanto implementa
- Implemente em commits atômicos (1 camada por commit)

## Checklist Final

- [ ] Schema atualizado (se necessário)
- [ ] API routes com tenantId
- [ ] **RBAC completo** — todos os 6 itens do checklist RBAC acima
- [ ] Componentes acessíveis
- [ ] Navegação atualizada
- [ ] `npm run build` passa sem erros
- [ ] Sem `any`, sem campos fantasma, sem console.log
- [ ] **Arquitetura atualizada** — Seguir tabela "Regra de Manutenção da Arquitetura" no CLAUDE.md
