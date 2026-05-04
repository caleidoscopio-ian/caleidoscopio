# CLAUDE.md — Orquestrador

Este arquivo é a **interface de orquestração**. Define O QUE fazer e QUANDO delegar.
O COMO está em `.claude/rules/` (regras) e `.claude/skills/` (workflows).

## Regra de Manutenção da Arquitetura

**OBRIGATÓRIO**: Ao concluir qualquer implementação que altere a estrutura do projeto, ANTES de finalizar, verificar e atualizar:

| Mudança | Atualizar |
|---------|-----------|
| Novo model/enum no schema | `.claude/rules/typescript-prisma.md` (enums), `.claude/rules/multi-tenant.md` (se tenant-specific) |
| Nova API route | `.claude/rules/api-patterns.md` (se padrão novo) |
| Novo módulo/rota | Tabela "Módulos do Sistema" abaixo neste arquivo |
| Nova convenção de código | Rule correspondente em `.claude/rules/` |
| Novo workflow recorrente | Criar ou atualizar skill em `.claude/skills/` |
| Mudança no auth/SSO | `.claude/rules/authentication.md` |
| Nova regra de segurança | `.claude/rules/security.md` |
| Novo componente padrão | `.claude/rules/frontend.md` |
| Mudança na stack (dependência relevante) | Seção "Stack" neste arquivo |

Não atualizar para mudanças triviais (ex: fix de bug pontual). Atualizar quando a mudança estabelece **padrão novo ou altera padrão existente**.

## Projeto

**Caleidoscópio Educacional** — plataforma terapêutica/educacional para TEA (Transtorno do Espectro Autista).
Sistema 2 (Educacional) integrado ao Sistema 1 (Gestão) via SSO.

**Stack**: Next.js 15 (App Router/RSC) · TypeScript strict · Prisma + PostgreSQL · Tailwind + shadcn/ui · Multi-tenant

## Arquitetura (Visão Geral)

```
src/
├── app/              # Rotas (pages) e API routes (55+ endpoints)
│   ├── api/          # REST endpoints com auth headers
│   └── [módulos]/    # ~34 páginas (dashboard, pacientes, agenda, prontuários, etc.)
├── components/
│   ├── ui/           # shadcn/ui base (35 componentes)
│   ├── forms/        # Formulários de CRUD
│   └── [módulos]/    # Componentes por feature (atividades, curriculum, avaliacoes, etc.)
├── hooks/            # useAuth, useToast, useMobile
├── lib/              # Utilitários (api.ts, prisma.ts, manager-client.ts, navigation.ts)
└── types/            # Definições de tipos (auth, navigation, agendamento)
prisma/schema.prisma  # 20+ models, 10+ enums, design multi-tenant
```

**Decisões arquiteturais chave:**
- Todo model tenant-specific tem `tenantId` — NUNCA consultar sem filtrar
- SSO via `managerClient` singleton (`src/lib/manager-client.ts`)
- Rotas protegidas com `<ProtectedRoute>` + `useAuth()` hook
- API calls via `src/lib/api.ts` com headers automáticos (X-User-Data, X-Auth-Token)
- Imports sempre via aliases: `@/components`, `@/lib`, `@/hooks`, `@/types`

## Comandos

```bash
npm run dev          # Dev server
npm run build        # Build (OBRIGATÓRIO antes de commit — valida TS + ESLint)
npm run lint         # Lint
npx prisma generate  # Após alterar schema
npx prisma db push   # Sync schema → DB (dev)
npx prisma migrate dev  # Migration (produção)
```

## Git

- Branch: `main` ← `develop` ← `feature/EDU-XXX-desc` ou `fix/EDU-XXX-desc`
- Commits: Conventional commits, SEM menções a IA
- SEMPRE `npm run build` antes de commit
- NUNCA commit .env, database dumps, ou console.log

## Delegação — Quando Usar O Quê

### Rules (`.claude/rules/`) — Carregadas automaticamente, sempre ativas

| Regra | Quando se aplica |
|-------|-----------------|
| `typescript-prisma.md` | Qualquer código TS — tipos, Prisma queries, enums |
| `multi-tenant.md` | Queries ao banco, API routes, isolamento de dados |
| `api-patterns.md` | Criar/modificar API routes em `src/app/api/` |
| `authentication.md` | SSO, tokens, proteção de rotas, useAuth |
| `security.md` | Validação, sanitização, práticas proibidas |
| `frontend.md` | Componentes React, UI, acessibilidade, TEA |

### Skills (`.claude/skills/`) — Orquestração automática

**REGRA DE ORQUESTRAÇÃO**: Ao receber um pedido de implementação, SEMPRE consultar os skills disponíveis e usar o mais adequado ANTES de começar a codar. Não esperar o usuário invocar manualmente.

| Skill | Gatilho automático | Manual (`/cmd`) |
|-------|-------------------|-----------------|
| `criar-feature` | Pedido envolve múltiplas camadas (schema + API + UI) | `/criar-feature` |
| `criar-api` | Pedido envolve criar/modificar endpoint REST | `/criar-api` |
| `criar-componente` | Pedido envolve criar/modificar componente React | `/criar-componente` |
| `corrigir-bug` | Reportado bug ou comportamento inesperado | `/corrigir-bug` |
| `revisar-codigo` | Antes de commit ou quando pedido review | `/revisar-codigo` |
| `database` | Alterações no schema Prisma (SOMENTE manual) | `/database` |

**Fluxo de decisão**:
1. Feature completa → usar `criar-feature` (que internamente delega para `criar-api` e `criar-componente`)
2. Só backend → usar `criar-api`
3. Só frontend → usar `criar-componente`
4. Bug → usar `corrigir-bug`
5. Pre-commit → usar `revisar-codigo`

### Subagents — Delegar automaticamente

- **Explore agent**: Para pesquisa profunda no codebase (>3 queries)
- **Plan agent**: Para features complexas que tocam >3 arquivos
- **Background agents**: Para build/lint enquanto trabalha em paralelo

## Práticas Proibidas (Resumo)

NUNCA: `any` type · query sem `tenantId` · import de `src/` · `dangerouslySetInnerHTML` · console.log em commit · campos inexistentes no schema · enum sem validação

> Detalhes completos em `.claude/rules/security.md`

## Variáveis de Ambiente

- `NEXT_PUBLIC_MANAGER_API_URL` — URL do Sistema 1 (Manager)
- `DATABASE_URL` — Connection string PostgreSQL

## Módulos do Sistema

| # | Módulo | Rota | Status |
|---|--------|------|--------|
| 1 | Dashboard | `/dashboard` | Implementado |
| 2 | Pacientes | `/pacientes` | Implementado |
| 3 | Agenda | `/agenda` | Implementado |
| 4 | Prontuários | `/prontuarios` | Implementado |
| 5 | Sessões | `/iniciar-sessao` | Implementado |
| 6 | Anamnese | `/anamnese` | Implementado |
| 7 | Atividades Clínicas | `/atividades-clinicas` | Implementado |
| 8 | Curriculum | `/curriculum` | Implementado |
| 9 | Avaliações ABA+ | `/avaliacoes` | Implementado |
| 10 | Evolução/Fases | `/evolucao` | Implementado |
| 11 | Relatórios | `/relatorios` | Implementado |
| 12 | Admin (Usuários/Salas) | `/usuarios`, `/salas` | Implementado |
| 13 | Convênios | `/convenios`, `/convenios/[id]` | Implementado |
| 14 | Profissional Detalhe + Repasse | `/terapeutas/[id]` | Implementado |
| 15 | Procedimentos e Pacotes | `/procedimentos`, `/procedimentos/[id]`, `/pacotes/[id]` | Implementado |
| 16 | Check-in e Recepção | `/check-in` | Implementado |
