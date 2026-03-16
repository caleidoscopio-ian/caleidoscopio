---
name: database
description: Alterações no schema Prisma, migrações e operações de banco de dados. Usar quando precisar modificar models.
disable-model-invocation: true
---

# Database — Operações Prisma

Você vai modificar o schema do banco de dados do projeto Caleidoscópio.

## Etapas

### 1. Analisar o Schema Atual
- Ler `prisma/schema.prisma` integralmente
- Entender as relações existentes entre models
- Identificar enums existentes que podem ser reutilizados

### 2. Modificar o Schema
Seguir as convenções do projeto:

```prisma
model NovoModel {
  id         String   @id @default(uuid())
  tenantId   String   // OBRIGATÓRIO para models tenant-specific
  // campos...
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  // Relações
  paciente   paciente @relation(fields: [pacienteId], references: [id], onDelete: Cascade)
  pacienteId String

  @@index([tenantId])
}
```

**Convenções**:
- `id` sempre UUID com `@default(uuid())`
- `tenantId` como String (sem FK, referência lógica ao Sistema 1)
- `created_at` / `updated_at` em snake_case
- Index em `tenantId` para performance de queries multi-tenant
- onDelete: Cascade para dependências fortes, SetNull para opcionais

### 3. Gerar e Sincronizar

```bash
# Gerar o Prisma Client atualizado
npx prisma generate

# Desenvolvimento — sync direto
npx prisma db push

# Produção — migration formal
npx prisma migrate dev --name descricao-da-mudanca
```

### 4. Atualizar o Código
- Verificar se interfaces em `src/types/` precisam atualização
- Atualizar API routes que usam os models modificados
- Atualizar componentes que exibem os dados modificados

## Checklist

- [ ] `tenantId` presente em models isolados
- [ ] Index em `tenantId`
- [ ] Relações com onDelete apropriado
- [ ] `npx prisma generate` executado
- [ ] `npx prisma db push` ou migrate executado
- [ ] Interfaces atualizadas
- [ ] `npm run build` passa
