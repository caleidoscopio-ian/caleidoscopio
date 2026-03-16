# Módulo 19 RBAC — Progresso

> **Plano completo**: `.claude/plans/MODULO-19-RBAC.md`
> **Última atualização**: 2026-03-11

## Status Geral

| Fase | Descrição | Status | Arquivos criados | Arquivos modificados |
|------|-----------|--------|-----------------|---------------------|
| 0 | Schema + Seed | ✅ COMPLETO | `prisma/schema.prisma` (+6 models), `prisma/seed-rbac.ts` | - |
| 1 | Engine de Permissões | ✅ COMPLETO | `action-map.ts`, `permission-service.ts`, `bootstrap-roles.ts` | `server.ts`, `login/route.ts` |
| 2 | CRUD de Roles (Admin UI) | ✅ COMPLETO | `api/roles/route.ts`, `api/roles/[id]/route.ts`, `permissoes/page.tsx`, `role-list.tsx`, `role-form-dialog.tsx` | - |
| 3 | Matriz de Permissões | ✅ COMPLETO | `api/roles/[id]/permissoes/route.ts`, `api/roles/[id]/clone/route.ts`, `permission-matrix.tsx` | - |
| 4 | Atribuição User-Role | ✅ COMPLETO | `api/usuario-roles/route.ts`, `api/usuario-roles/[userId]/permissoes/route.ts`, `api/usuario-roles/historico/route.ts`, `user-role-assignment.tsx`, `change-role-dialog.tsx`, `audit-log.tsx` | - |
| 5 | Client-Side (hooks/components) | ✅ COMPLETO | `usePermissions.ts`, `RequirePermission.tsx`, `sem-permissao/page.tsx` | - |
| 6 | Refatoração APIs existentes | PENDENTE | - | - |
| 7 | Guards nas Páginas | ✅ COMPLETO | `sem-permissao/page.tsx` (já criado) | 32 páginas protegidas com `requiredPermission` |

**Build validado após Fases 0-5**: ✅ (sem erros TypeScript/ESLint)

## Detalhamento por Fase

### Fase 0: Schema + Seed ✅
- [x] Adicionar 6 models RBAC em `prisma/schema.prisma`
- [x] Criar `prisma/seed-rbac.ts`
- [x] Executar migration (via `db push` — dev sem histórico de migrations)
- [x] Executar seed
- [x] `npm run build` passa

### Fase 1: Engine de Permissões ✅
- [x] Criar `src/lib/auth/permission-service.ts`
- [x] Criar `src/lib/auth/action-map.ts`
- [x] Criar `src/lib/auth/bootstrap-roles.ts`
- [x] Modificar `src/lib/auth/server.ts` (hasPermission → banco com fallback)
- [x] Modificar `src/app/api/auth/login/route.ts` (lazy bootstrap)
- [x] `npm run build` passa

### Fase 2: CRUD de Roles ✅
- [x] Criar `src/app/api/roles/route.ts`
- [x] Criar `src/app/api/roles/[id]/route.ts`
- [x] Criar `src/app/permissoes/page.tsx`
- [x] Criar `src/components/rbac/role-list.tsx`
- [x] Criar `src/components/rbac/role-form-dialog.tsx`
- [x] `npm run build` passa

### Fase 3: Matriz de Permissões ✅
- [x] Criar `src/app/api/roles/[id]/permissoes/route.ts`
- [x] Criar `src/app/api/roles/[id]/clone/route.ts`
- [x] Criar `src/components/rbac/permission-matrix.tsx`
- [x] `npm run build` passa

### Fase 4: Atribuição User-Role ✅
- [x] Criar `src/app/api/usuario-roles/route.ts`
- [x] Criar `src/app/api/usuario-roles/[userId]/permissoes/route.ts`
- [x] Criar `src/app/api/usuario-roles/historico/route.ts`
- [x] Criar `src/components/rbac/user-role-assignment.tsx`
- [x] Criar `src/components/rbac/change-role-dialog.tsx`
- [x] Criar `src/components/rbac/audit-log.tsx`
- [x] `npm run build` passa

Nota: `user-permissions-view.tsx` foi considerado desnecessário — as permissões efetivas já são visíveis na aba de usuários e na matriz.

### Fase 5: Client-Side ✅
- [x] Criar `src/hooks/usePermissions.ts`
- [x] Criar `src/components/RequirePermission.tsx`
- [x] Criar `src/app/sem-permissao/page.tsx`
- [x] Modificar `src/lib/navigation.ts` — `requiredPermission` em todos os itens
- [x] Modificar `src/components/app-sidebar.tsx` — filtra sidebar por RBAC
- [x] `npm run build` passa

### Fase 6: Refatoração APIs ⏳ PENDENTE
- [ ] Criar `src/lib/auth/require-permission.ts`
- [ ] Refatorar APIs (mecânico — hasPermission já funciona via banco desde Fase 1)
- Nota: Esta fase é OPCIONAL pois a Fase 1 já garante funcionamento correto

### Fase 7: Guards nas Páginas ✅
- [x] Modificar `src/components/ProtectedRoute.tsx` — prop `requiredPermission`, redireciona para `/sem-permissao`
- [x] Adicionar `requiredPermission` em `src/lib/navigation.ts` (todos os itens relevantes)
- [x] Modificar `src/components/app-sidebar.tsx` — `usePermissions()` + `useMemo` filtra itens quando `source === 'rbac'`
- [x] Aplicar `requiredPermission` na página `/permissoes`
- [x] **Aplicar `requiredPermission` em TODAS as 32 páginas protegidas** (2026-03-11)
  - Páginas sem ProtectedRoute: wrapped com componente wrapper (11 principais + 11 sub-páginas)
  - Páginas com ProtectedRoute sem permission: adicionado prop requiredPermission (10 páginas)
  - Mapeamento: pacientes→VIEW, agenda→VIEW, prontuarios→VIEW/UPDATE/CREATE, sessoes→VIEW/CREATE, atividades→VIEW/CREATE/UPDATE, avaliacoes→VIEW/CREATE/UPDATE, curriculums→VIEW/CREATE/UPDATE, evolucao→VIEW, relatorios→VIEW, terapeutas→VIEW, salas→VIEW, dashboard→VIEW, usuarios→VIEW
- [x] `npm run build` passa

## Notas de Implementação

- **api.ts pattern**: Usar `apiGet()` sem args extras (auth headers são automáticos do localStorage). Para typed response: `await handleApiResponse<T>(response)`
- **prisma migrate**: Usar `db push` pois não há histórico de migrations no dev
- **hasPermission async**: Todas as API routes foram atualizadas com `await hasPermission()`
- **ProtectedRoute**: É default export, importar como `import ProtectedRoute from '@/components/ProtectedRoute'`

## Pós-implementação
- [ ] Atualizar `.claude/rules/typescript-prisma.md`
- [ ] Atualizar `.claude/rules/multi-tenant.md`
- [ ] Atualizar `.claude/rules/authentication.md`
- [ ] Atualizar `CLAUDE.md` (tabela de módulos)
- [ ] Atualizar `.claude/rules/security.md`
