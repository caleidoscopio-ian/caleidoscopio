---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# TypeScript & Prisma — Regras de Tipagem

## Regra Zero: NUNCA usar `any`

O projeto usa `@typescript-eslint/no-explicit-any`. Alternativas em ordem de preferência:

1. **Prisma-generated types** (melhor)
2. **Interfaces específicas**
3. **`Record<string, unknown>`**
4. **`unknown` com type guards**

## Tipos Prisma — Padrões

```typescript
import { Prisma } from '@prisma/client';

// WHERE  → Prisma.ModelWhereInput
// SELECT → Prisma.ModelSelect
// INCLUDE → Prisma.ModelInclude
// CREATE → Prisma.ModelCreateInput
// UPDATE → Prisma.ModelUpdateInput
// ORDER  → Prisma.ModelOrderByWithRelationInput
// UNIQUE → Prisma.ModelWhereUniqueInput
```

Exemplo concreto:
```typescript
const where: Prisma.PacienteWhereInput = { tenantId, nome: { contains: busca } };
const include: Prisma.PacienteInclude = { atividades: true };
const orderBy: Prisma.PacienteOrderByWithRelationInput = { nome: 'asc' };
```

## Enums — Sempre Validar Antes de Usar

Query params são strings. Validar antes de cast:

```typescript
const status = searchParams.get('status');
if (status && ['EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA'].includes(status)) {
  whereClause.status = status as StatusSessao;
}
```

Enums do projeto: `StatusSessao`, `StatusProgresso`, `FaseAtividade`, `StatusAgendamento`, `TipoEncaminhamento`, `StatusEncaminhamento`, `TipoRelatorio`, `TipoAnexo`, `TipoRecompensa`, `TipoAvaliacao`

## Interfaces

- Definir interfaces para props de componentes e estruturas de dados
- NUNCA incluir campos que não existem no `prisma/schema.prisma`
- Consultar o schema antes de definir interfaces

## Imports

- SEMPRE usar aliases: `@/components`, `@/lib`, `@/hooks`, `@/types`
- NUNCA importar de `src/` diretamente
