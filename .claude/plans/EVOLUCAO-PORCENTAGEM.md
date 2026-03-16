# Plano: Critério de Evolução por Porcentagem

## Objetivo
Alterar o critério de evolução de **número absoluto** para **porcentagem de acerto**, permitindo que atividades com quantidades diferentes de tentativas sejam avaliadas de forma justa e consistente.

## Contexto
- Hoje: `min_tentativas_corretas = 4` → "precisa acertar 4 tentativas" (absoluto)
- Problema: atividade com 5 tentativas (4/5 = 80%) vs atividade com 10 tentativas (4/10 = 40%) — critério inconsistente
- Solução: usar `porcentagem_acerto = 80.0` → "precisa acertar 80% das tentativas"

## Default
- `porcentagem_acerto: 80.0` (80%) para todas as fases ao criar atividade clonada

---

## Fases de Implementação

### Fase 1 — Schema Prisma ✅
- [x] Alterar model `AtividadeFase` em `prisma/schema.prisma`
- [x] Rodar `npx prisma generate`
- [x] Rodar `npx prisma db push --accept-data-loss`

### Fase 2 — Lógica de Evolução (`src/lib/evolucao-fase.ts`) ✅
- [x] Alterar comparação em `calcularEvolucaoAposFinalizacao()`
- [x] Alterar comparação em `buscarSessoesConsecutivas()`

### Fase 3 — Clone de Atividade (`src/lib/clone-atividade.ts`) ✅
- [x] Alterar defaults: `porcentagem_acerto: 80` para as 4 fases

### Fase 4 — API de Critérios (`src/app/api/evolucao/criterios/route.ts`) ✅
- [x] PUT: aceitar `porcentagem_acerto`, validar 1-100
- [x] Remover `min_tentativas_corretas` e `total_tentativas`

### Fase 5 — UI Evolução (`src/app/evolucao/page.tsx`) ✅
- [x] Interface `AtividadeFase` atualizada
- [x] `criterioForm` state atualizado
- [x] Display de critérios: 2 cards (% acerto + sessões consecutivas)
- [x] Form: input de % com sufixo e hint explicativo

### Fase 6 — Validação e Build ✅
- [x] `npm run build` — compilado com sucesso
- [ ] Testar fluxo completo: configurar critério → aplicar sessão → finalizar → verificar evolução

---

## Arquivos Impactados

| Arquivo | Mudança |
|---------|---------|
| `prisma/schema.prisma` | Model `AtividadeFase`: remover 2 campos, adicionar 1 |
| `src/lib/evolucao-fase.ts` | Comparação por % (2 locais) |
| `src/lib/clone-atividade.ts` | Defaults dos critérios |
| `src/app/api/evolucao/criterios/route.ts` | Validação PUT/GET |
| `src/app/evolucao/page.tsx` | UI do dialog de critérios |

## Migração de Dados
- Registros existentes com defaults (1/1) → recebem `porcentagem_acerto: 80.0`
- Campo novo com `@default(80)` garante retrocompatibilidade
