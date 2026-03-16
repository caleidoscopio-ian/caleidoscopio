# Plano: Módulo 19 — Gestão de Permissões (RBAC)

> **Status**: Em implementação
> **Progresso**: Ver `.claude/plans/MODULO-19-PROGRESS.md`

## Contexto

O sistema atual tem 3 roles fixas (SUPER_ADMIN, ADMIN, USER) com verificação hardcoded em `src/lib/auth/server.ts` via switch/case (~25 ações). Não existe controle granular por funcionalidade. O objetivo é substituir por um RBAC dinâmico baseado em banco de dados, onde admins podem criar roles customizadas e atribuir permissões por recurso/ação, mantendo compatibilidade total com o sistema existente durante a transição.

## Integração com Sistema 1 (Manager) — NÃO MUDA

O Sistema 1 (Manager) continua sendo o **porteiro de autenticação**. Nada muda nessa camada:
- Login/SSO → Manager autentica → retorna token + role SSO
- Cada request API → `getAuthenticatedUser()` valida token com Manager via `managerClient.validateSSOToken()`
- Dados do usuário (id, email, nome, tenant) vêm do Manager

O RBAC no Sistema 2 é uma **camada de autorização adicional** sobre a autenticação existente:
- **Manager responde**: "Este usuário é quem diz ser?" (autenticação)
- **RBAC local responde**: "Este usuário pode fazer isso no educacional?" (autorização)

Fluxo completo:
```
Request → getAuthenticatedUser() → valida token com Sistema 1 ✅ (sem mudança)
       → checkPermission() → verifica permissão local no banco RBAC 🆕 (nova camada)
```

## Arquivos Críticos Existentes

- `src/lib/auth/server.ts` — `hasPermission()` hardcoded (será substituído)
- `src/hooks/useAuth.tsx` — Context de auth client-side (será estendido)
- `src/components/ProtectedRoute.tsx` — Proteção de rotas (será estendido)
- `src/lib/navigation.ts` — Navegação role-based (será adaptada para permission-based)
- `prisma/schema.prisma` — Schema (6 novos models)
- `src/components/app-sidebar.tsx` — Sidebar (usará permissions)

---

## Fase 0: Schema + Seed (Fundação)

**Objetivo**: Adicionar tabelas RBAC ao banco. Zero impacto em runtime.

### Schema — 6 novos models em `prisma/schema.prisma`
- `Role` (tenantId, nome, isSystem, ativo) — @@unique([tenantId, nome])
- `Recurso` (slug, nome, ordem) — Global, sem tenantId
- `Acao` (slug, nome) — Global, sem tenantId
- `RolePermissao` (roleId, recursoId, acaoId) — @@unique([roleId, recursoId, acaoId])
- `UsuarioRole` (usuarioId, tenantId, roleId, atribuido_por) — @@unique([usuarioId, tenantId])
- `UsuarioRoleHistorico` (usuarioId, tenantId, roleAnteriorId, roleNovoId, alterado_por, justificativa)

### Seed — `prisma/seed-rbac.ts`
- 14 recursos: dashboard, pacientes, agenda, atividades, curriculums, prontuarios, avaliacoes, sessoes, relatorios, terapeutas, salas, procedimentos, usuarios, configuracoes
- 7 ações: VIEW, CREATE, UPDATE, DELETE, EXPORT, APPROVE, MANAGE
- Idempotente (upsert por slug)

### Comandos
```bash
npx prisma migrate dev --name add_rbac_tables
npx ts-node prisma/seed-rbac.ts
```

### Arquivos
- CRIAR: `prisma/seed-rbac.ts`
- MODIFICAR: `prisma/schema.prisma`

---

## Fase 1: Engine de Permissões (Backend Core)

**Objetivo**: Substituir `hasPermission()` por resolução dinâmica via banco, com fallback para lógica atual.

### Criar `src/lib/auth/permission-service.ts`
- `checkPermission(userId, tenantId, resource, action)` — Resolve do banco com cache
- `getEffectivePermissions(userId, tenantId)` — Retorna mapa completo de permissões
- `invalidateCache(userId, tenantId)` — Limpa cache ao alterar role/permissões
- Cache in-memory (Map) com TTL de 5 min, key `${userId}:${tenantId}`
- Lógica MANAGE: se role tem MANAGE no recurso, implica todas as ações

### Criar `src/lib/auth/action-map.ts`
- Mapeia ações antigas → novo formato: `'view_patients' → { resource: 'pacientes', action: 'VIEW' }`
- Garante que `hasPermission(user, "view_patients")` continua funcionando

### Criar `src/lib/auth/bootstrap-roles.ts`
- `ensureTenantRoles(tenantId)` — Cria 3 roles de sistema + permissões se não existem
- `ensureDefaultRole(userId, tenantId, ssoRole)` — Lazy seeding: mapeia SSO role → role local no primeiro login
- Chamado durante login em `src/app/api/auth/login/route.ts`

### Modificar `src/lib/auth/server.ts`
- `hasPermission()` agora usa `checkPermission()` do banco
- Fallback para switch/case se `UsuarioRole` não existe (transição gradual)

### Arquivos
- CRIAR: `src/lib/auth/permission-service.ts`, `src/lib/auth/action-map.ts`, `src/lib/auth/bootstrap-roles.ts`
- MODIFICAR: `src/lib/auth/server.ts`, `src/app/api/auth/login/route.ts`

---

## Fase 2: CRUD de Roles (19.1) — Admin UI

**Objetivo**: Páginas para gerenciar roles customizadas.

### API Routes
- `src/app/api/roles/route.ts` — GET (listar com _count.usuarios), POST (criar)
- `src/app/api/roles/[id]/route.ts` — GET, PUT, DELETE (bloquear se isSystem)

### UI
- `src/app/permissoes/page.tsx` — Página principal RBAC com tabs
- `src/components/rbac/role-list.tsx` — Tabela de roles com filtros, busca, badge de usuários
- `src/components/rbac/role-form-dialog.tsx` — Dialog criar/editar (React Hook Form + Zod)

### Arquivos
- CRIAR: `src/app/api/roles/route.ts`, `src/app/api/roles/[id]/route.ts`, `src/app/permissoes/page.tsx`, `src/components/rbac/role-list.tsx`, `src/components/rbac/role-form-dialog.tsx`

---

## Fase 3: Matriz de Permissões (19.2)

**Objetivo**: Grid visual para atribuir permissões às roles.

### API Routes
- `src/app/api/roles/[id]/permissoes/route.ts` — GET/PUT permissões da role
- `src/app/api/roles/[id]/clone/route.ts` — POST clonar permissões de outra role

### UI
- `src/components/rbac/permission-matrix.tsx` — Grid: recursos (linhas) × ações (colunas)
  - Checkboxes por célula
  - MANAGE checked → demais checkboxes checked + disabled
  - Dropdown "Clonar de..." para copiar permissões
  - Salvar em lote (PUT completo)

### Arquivos
- CRIAR: `src/app/api/roles/[id]/permissoes/route.ts`, `src/app/api/roles/[id]/clone/route.ts`, `src/components/rbac/permission-matrix.tsx`

---

## Fase 4: Atribuição de Roles a Usuários (19.3)

**Objetivo**: Gerenciar qual role cada usuário tem.

### API Routes
- `src/app/api/usuario-roles/route.ts` — GET (listar usuários + roles), POST/PUT (atribuir/alterar)
- `src/app/api/usuario-roles/[userId]/permissoes/route.ts` — GET permissões efetivas do usuário
- `src/app/api/usuario-roles/historico/route.ts` — GET audit log com filtros + export CSV

### UI
- `src/components/rbac/user-role-assignment.tsx` — Tabela de usuários com role atual
- `src/components/rbac/change-role-dialog.tsx` — Dialog para trocar role (com justificativa obrigatória)
- `src/components/rbac/user-permissions-view.tsx` — Visualização readonly das permissões efetivas
- `src/components/rbac/audit-log.tsx` — Tabela de histórico com filtros e export CSV

### Arquivos
- CRIAR: `src/app/api/usuario-roles/route.ts`, `src/app/api/usuario-roles/[userId]/permissoes/route.ts`, `src/app/api/usuario-roles/historico/route.ts`, `src/components/rbac/user-role-assignment.tsx`, `src/components/rbac/change-role-dialog.tsx`, `src/components/rbac/user-permissions-view.tsx`, `src/components/rbac/audit-log.tsx`

---

## Fase 5: Infraestrutura Client-Side (19.4)

**Objetivo**: Hooks e componentes para controle de permissão no frontend.

### Criar `src/hooks/usePermissions.ts`
```typescript
// Retorna: { can, canAny, canAll, permissions, loading, roleName }
// can('pacientes', 'CREATE') → boolean
```
- Fetch de `/api/usuario-roles/{userId}/permissoes` no mount
- Cache em state + sessionStorage

### Criar `src/components/RequirePermission.tsx`
```tsx
<RequirePermission resource="pacientes" action="CREATE">
  <Button>Novo Paciente</Button>
</RequirePermission>

<RequirePermission resource="configuracoes" action="VIEW" showForbidden>
  <ConfigPage />
</RequirePermission>
```

### Criar `src/app/sem-permissao/page.tsx`
- Página 403 com ícone Shield, mensagem e botão "Voltar ao Dashboard"

### Modificar `src/hooks/useAuth.tsx`
- Adicionar `permissions` e `can()` ao contexto

### Modificar `src/lib/navigation.ts`
- Cada item recebe `requiredPermission?: { resource, action }`
- Filtragem por `can()` ao invés de switch por role

### Modificar `src/components/app-sidebar.tsx`
- Usar `usePermissions()` para filtrar itens de navegação

### Arquivos
- CRIAR: `src/hooks/usePermissions.ts`, `src/components/RequirePermission.tsx`, `src/app/sem-permissao/page.tsx`
- MODIFICAR: `src/hooks/useAuth.tsx`, `src/lib/navigation.ts`, `src/components/app-sidebar.tsx`

---

## Fase 6: Refatoração de APIs Existentes (19.4 cont.)

**Objetivo**: Substituir chamadas `hasPermission()` pelo novo padrão.

### Criar `src/lib/auth/require-permission.ts`
```typescript
const result = await requirePermission(request, 'pacientes', 'VIEW');
if (result instanceof NextResponse) return result;
const { user } = result;
```

### Refatorar ~25 API routes
Substituição mecânica: `hasPermission(user, "view_patients")` → `requirePermission(request, 'pacientes', 'VIEW')`

**APIs a refatorar**: pacientes, terapeutas, atividades, prontuarios, agendamentos, agendamentos/[id], agendamentos/batch, anamneses, anamneses/[id], curriculum, curriculum/atribuir, sessoes, sessoes/avaliar, sessoes/finalizar, sessoes-curriculum, sessoes-avaliacao, atividades/atribuir, avaliacoes/atribuir, encaminhamentos, evolucao, evolucao/clone, evolucao/fase, evolucao/criterios, salas, prontuarios/[id], dashboard/stats, dashboard/agenda-hoje, usuarios-sistema1, usuarios-sistema1/criar, usuarios-sistema1/vincular

### Arquivos
- CRIAR: `src/lib/auth/require-permission.ts`
- MODIFICAR: ~25 API route files

---

## Fase 7: Guards nas Páginas (19.4 cont.)

**Objetivo**: Proteger páginas com verificação de permissão.

### Modificar `src/components/ProtectedRoute.tsx`
- Adicionar prop `requiredPermission?: { resource, action }`
- Se sem permissão, redirecionar para `/sem-permissao`

### Atualizar páginas existentes (incremental)
- Adicionar `requiredPermission` nas páginas gradualmente

### Arquivos
- MODIFICAR: `src/components/ProtectedRoute.tsx`, todas as páginas em `src/app/*/page.tsx`

---

## Estratégia de Transição (Zero Breakage)

1. **Fase 0-1**: Banco + engine prontos, `hasPermission()` continua funcionando via action-map
2. **Lazy seeding**: No primeiro login após deploy, cria UsuarioRole mapeando SSO role → role local
3. **Fallback**: Se não existe UsuarioRole, usa lógica hardcoded antiga
4. **Incremental**: APIs e páginas refatoradas uma a uma, sem big bang

## Verificação (por fase)

- [ ] `npm run build` passa sem erros após cada fase
- [ ] Usuário ADMIN existente acessa tudo normalmente (sem regressão)
- [ ] Usuário USER (terapeuta) acessa suas páginas normalmente
- [ ] Role customizada criada funciona corretamente
- [ ] Remover permissão esconde elemento na UI
- [ ] Audit log registra alterações de role
- [ ] Roles de sistema não podem ser editadas/deletadas
- [ ] MANAGE implica todas as outras ações

## Atualização da Arquitetura (pós-implementação)

Conforme regra de manutenção do CLAUDE.md:
- Atualizar `typescript-prisma.md` com novos models/tipos
- Atualizar `multi-tenant.md` com Role e UsuarioRole
- Atualizar `authentication.md` com usePermissions e RequirePermission
- Adicionar módulo "Permissões" na tabela de módulos do CLAUDE.md
- Atualizar `security.md` com regras de RBAC
