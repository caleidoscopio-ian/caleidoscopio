# Módulo 22 — Relatório de Atendimentos Glosados

> **Objetivo**: Controlar as **glosas** (valores recusados/reduzidos pelos convênios no faturamento) — desde o registro do atendimento glosado, passando pela categorização e análise por convênio, até o processo de recurso para recuperar o valor. Com dashboard de indicadores e exportação.

## O que é uma glosa (contexto)

No faturamento de saúde, **glosa** é quando a operadora/convênio **recusa ou reduz o pagamento** de um procedimento que a clínica faturou. Ex.: clínica atende e cobra R$ 200 do convênio; a operadora glosa R$ 80 por "falta de autorização" → a clínica recebe só R$ 120 e pode **interpor recurso** para recuperar os R$ 80.

**Categorias clássicas de glosa:**
- **Administrativa** — cadastro, autorização ausente, dados do beneficiário
- **Técnica** — pertinência/necessidade clínica questionada
- **Linear** — corte arbitrário/percentual da operadora
- **Duplicidade** — procedimento cobrado em duplicidade
- **Tabela** — divergência de código/valor/tabela
- **Prazo** — envio fora do prazo
- **Documentação** — guia/assinatura/relatório ausente ou incorreto

**Ciclo de vida da glosa (processo de recurso):**
`PENDENTE` → `EM_RECURSO` → (`RECUPERADA` | `PARCIAL` | `NEGADA`) — ou `ACATADA` (clínica aceita a perda sem recorrer).

## Decisões (confirmadas com o usuário)

- **Registro**: manual (formulário dedicado) + **atalho "registrar glosa"** numa linha do Histórico de Atendimentos (Módulo 21).
- **RBAC**: reusa recurso `convenios` (CRUD completo: `view_convenios`/`create_convenios`/`edit_convenios`/`delete_convenios`). Sem novo slug.
- **Valor cobrado**: derivado de `calcularPrecoProcedimento` (regra de convênio) como sugestão **editável**.

## Premissas

- **Novo schema** — models `Glosa` e `GlosaHistorico` + enums `CategoriaGlosa`, `StatusGlosa`. Relações inversas em `agendamento` e `Convenio`.
- **1 glosa = 1 atendimento** (item-level). Glosa por lote fica como evolução futura.
- **Multi-tenant** — `tenantId` em todas as queries; não-admin filtra pela própria filial (via `agendamento.salaRelacao.filialId`).
- **Histórico do recurso** — cada transição de status grava `GlosaHistorico` (padrão `ConvenioHistorico`).
- **Reaproveita** `calcularPrecoProcedimento` + `formatBRL` (`src/lib/preco-procedimento.ts`), `jspdf`/`jspdf-autotable` (já instalados), padrão de export do Módulo 21.

---

## Fase 0 — Setup

- [ ] Confirmar action-keys `view_convenios`/`create_convenios`/`edit_convenios`/`delete_convenios` (`action-map.ts`) — OK
- [ ] Confirmar padrão `ConvenioHistorico` como molde de `GlosaHistorico` — OK

## Fase 1 — Schema

- [ ] Enums em `prisma/schema.prisma`:
  ```prisma
  enum CategoriaGlosa { ADMINISTRATIVA TECNICA LINEAR DUPLICIDADE TABELA PRAZO DOCUMENTACAO OUTROS }
  enum StatusGlosa    { PENDENTE EM_RECURSO RECUPERADA PARCIAL NEGADA ACATADA }
  ```
- [ ] Model `Glosa`:
  ```prisma
  model Glosa {
    id               String         @id @default(uuid())
    tenantId         String
    agendamentoId    String
    convenioId       String?
    valor_cobrado    Decimal        @db.Decimal(10, 2)
    valor_glosado    Decimal        @db.Decimal(10, 2)
    valor_recuperado Decimal?       @db.Decimal(10, 2)
    categoria        CategoriaGlosa
    codigo_glosa     String?
    motivo           String         @db.Text
    status           StatusGlosa    @default(PENDENTE)
    data_glosa       DateTime
    data_recurso     DateTime?
    data_resolucao   DateTime?
    observacoes      String?        @db.Text
    createdAt        DateTime       @default(now())
    updatedAt        DateTime       @default(now()) @updatedAt
    agendamento      agendamento    @relation(fields: [agendamentoId], references: [id], onDelete: Cascade)
    convenio         Convenio?      @relation(fields: [convenioId], references: [id], onDelete: SetNull)
    historico        GlosaHistorico[]
    @@index([tenantId]); @@index([tenantId, status]); @@index([tenantId, convenioId]); @@index([agendamentoId])
    @@map("glosas")
  }
  ```
- [ ] Model `GlosaHistorico` (status_anterior, status_novo, titulo, descricao, usuario_nome, usuario_id, createdAt)
- [ ] Relações inversas: `agendamento.glosas Glosa[]`, `Convenio.glosas Glosa[]`
- [ ] `npx prisma generate` + `npx prisma db push`
- [ ] Atualizar `.claude/rules/typescript-prisma.md` (novos enums) e `multi-tenant.md` (novo model tenant-specific)

## Fase 2 — Tipos

- [ ] `src/types/glosa.ts` — `Glosa`, `GlosaResumo`, `GlosaListResponse`, `GlosaDashboard`, labels/cores de `CategoriaGlosa` e `StatusGlosa`, `GlosaFiltros`

## Fase 3 — Backend: APIs

- [ ] `src/app/api/glosas/route.ts`
  - **GET** — lista paginada + filtros (período por `data_glosa`, convênio, status, categoria, busca por paciente) + `resumo` (KPIs). RBAC `view_convenios`.
  - **POST** — cria glosa (valida atendimento do tenant, deriva `valor_cobrado` sugerido). Grava `GlosaHistorico` inicial. RBAC `create_convenios`.
- [ ] `src/app/api/glosas/[id]/route.ts`
  - **GET** — detalhe + histórico. **PUT** — edita dados. **DELETE** — remove. RBAC conforme ação.
- [ ] `src/app/api/glosas/[id]/recurso/route.ts`
  - **PATCH** — transições de status (`interpor` → EM_RECURSO; `resolver` → RECUPERADA/PARCIAL/NEGADA com `valor_recuperado` + `data_resolucao`; `acatar` → ACATADA). Valida transição, grava `GlosaHistorico`. RBAC `edit_convenios`.
- [ ] `src/app/api/glosas/dashboard/route.ts`
  - **GET** — agregações para gráficos: por categoria, por convênio, por status, evolução mensal, **taxa de glosa** (valor glosado ÷ valor faturado dos ATENDIDO no período). RBAC `view_convenios`.

## Fase 4 — Export

- [ ] `src/lib/export-glosas.ts` — `exportarGlosasCSV` (Blob nativo) + `exportarGlosasPDF` (jspdf + autotable, cabeçalho com KPIs)

## Fase 5 — Componentes

- [ ] `src/components/glosas/dashboard-glosas.tsx` — KPI cards + gráficos recharts (categoria, convênio, status, evolução)
- [ ] `src/components/glosas/filtros-glosas.tsx` — período, convênio, status (badges), categoria, busca paciente, filial (admin)
- [ ] `src/components/glosas/tabela-glosas.tsx` — tabela paginada: data, paciente, convênio, procedimento, valor cobrado, valor glosado, valor recuperado, categoria, status (badge); ações (detalhe/recurso, editar, excluir)
- [ ] `src/components/glosas/registrar-glosa-dialog.tsx` — seleciona atendimento (lista de ATENDIDO), deriva valor cobrado (editável), valor glosado, categoria, código, motivo, data da glosa
- [ ] `src/components/glosas/glosa-detalhe-dialog.tsx` — detalhe + **processo de recurso** (botões Interpor / Registrar resultado / Acatar) + timeline do `GlosaHistorico`

## Fase 6 — Página + sidebar

- [ ] `src/app/glosas/page.tsx`
  - `<ProtectedRoute requiredPermission={{ resource: 'convenios', action: 'VIEW' }}>`
  - `MainLayout` + breadcrumbs (`Dashboard › Atendimentos Glosados`)
  - Tabs: **Visão Geral** (dashboard) · **Glosas** (detalhamento + filtros + tabela + export)
  - Botão "Registrar Glosa" sempre visível
- [ ] Sidebar (`src/lib/navigation.ts`): item "Atendimentos Glosados" no grupo **Administração** (perto de Histórico de Atendimentos), ícone `FileX2` ou `AlertOctagon`, `requiredPermission: { resource: 'convenios', action: 'VIEW' }`

## Fase 7 — Atalho no Histórico de Atendimentos

- [ ] Em `src/components/historico-atend/tabela-historico.tsx`, adicionar ação por linha "Registrar glosa" (só para `ATENDIDO`) que abre `registrar-glosa-dialog` pré-preenchido com o atendimento
- [ ] Wire do dialog em `src/app/historico-atendimentos/page.tsx`

## Fase 8 — Validação

- [ ] `npx next build` sem erros TS/ESLint
- [ ] Multi-tenant + filtro filial conferidos
- [ ] Skeletons + empty states + acessibilidade
- [ ] Atualizar tabela "Módulos do Sistema" no `CLAUDE.md` (Módulo 22)

---

## Arquivos afetados

### Novos
- `src/app/api/glosas/route.ts` (GET, POST)
- `src/app/api/glosas/[id]/route.ts` (GET, PUT, DELETE)
- `src/app/api/glosas/[id]/recurso/route.ts` (PATCH)
- `src/app/api/glosas/dashboard/route.ts` (GET)
- `src/app/glosas/page.tsx`
- `src/components/glosas/dashboard-glosas.tsx`
- `src/components/glosas/filtros-glosas.tsx`
- `src/components/glosas/tabela-glosas.tsx`
- `src/components/glosas/registrar-glosa-dialog.tsx`
- `src/components/glosas/glosa-detalhe-dialog.tsx`
- `src/lib/export-glosas.ts`
- `src/types/glosa.ts`

### Modificados
- `prisma/schema.prisma` — models `Glosa`/`GlosaHistorico`, enums, relações inversas
- `src/lib/navigation.ts` — item no sidebar (Administração)
- `src/components/historico-atend/tabela-historico.tsx` — ação "registrar glosa"
- `src/app/historico-atendimentos/page.tsx` — wire do dialog
- `CLAUDE.md` — tabela de módulos (Módulo 22)
- `.claude/rules/typescript-prisma.md` — novos enums

### Reaproveitados
- `src/lib/preco-procedimento.ts`, `src/types/agendamento.ts` (status), padrão de export do Módulo 21

---

## Tipos (`src/types/glosa.ts`)

```typescript
export type CategoriaGlosa = "ADMINISTRATIVA" | "TECNICA" | "LINEAR" | "DUPLICIDADE" | "TABELA" | "PRAZO" | "DOCUMENTACAO" | "OUTROS";
export type StatusGlosa = "PENDENTE" | "EM_RECURSO" | "RECUPERADA" | "PARCIAL" | "NEGADA" | "ACATADA";

export const CATEGORIA_GLOSA_LABEL: Record<CategoriaGlosa, string>;
export const STATUS_GLOSA_LABEL: Record<StatusGlosa, string>;
export const STATUS_GLOSA_BADGE: Record<StatusGlosa, string>;

export interface Glosa {
  id: string;
  agendamentoId: string;
  data_atendimento: string;
  paciente: { id: string; nome: string };
  profissional: { id: string; nome: string } | null;
  procedimento: { id: string; nome: string; codigo: string | null } | null;
  convenio: { id: string; nome: string } | null;
  valor_cobrado: number;
  valor_glosado: number;
  valor_recuperado: number | null;
  categoria: CategoriaGlosa;
  codigo_glosa: string | null;
  motivo: string;
  status: StatusGlosa;
  data_glosa: string;
  data_recurso: string | null;
  data_resolucao: string | null;
  observacoes: string | null;
}

export interface GlosaResumo {
  total_glosas: number;
  valor_glosado_total: number;
  valor_recuperado_total: number;
  valor_em_recurso: number;       // glosas EM_RECURSO
  pendentes: number;
  taxa_recuperacao: number;       // recuperado ÷ glosado resolvido
}
```

---

## KPIs e gráficos do Dashboard

**KPIs:** Valor glosado total · Taxa de glosa (% sobre faturado) · Valor recuperado · Valor em recurso · Glosas pendentes · Taxa de recuperação

**Gráficos (recharts):**
- Glosas por **categoria** (barra/pizza)
- Glosas por **convênio** (barra horizontal) — *análise por convênio*
- **Status** das glosas (barra/funil do processo de recurso)
- **Evolução mensal** do valor glosado vs recuperado (linha)

---

## Processo de recurso (transições válidas)

| Ação | De | Para | Efeitos |
|------|----|----|---------|
| Interpor recurso | PENDENTE | EM_RECURSO | `data_recurso = now` |
| Registrar resultado (integral) | EM_RECURSO | RECUPERADA | `valor_recuperado = valor_glosado`, `data_resolucao = now` |
| Registrar resultado (parcial) | EM_RECURSO | PARCIAL | `valor_recuperado` informado, `data_resolucao = now` |
| Registrar resultado (negado) | EM_RECURSO | NEGADA | `valor_recuperado = 0`, `data_resolucao = now` |
| Acatar glosa | PENDENTE | ACATADA | aceita a perda sem recorrer |

Toda transição grava `GlosaHistorico` (status_anterior → status_novo, autor, descrição).

---

## Checklist RBAC (skill `criar-feature`)

- [ ] **`resource`**: `convenios` (slug já no seed)
- [ ] **action-keys**: `view_convenios` / `create_convenios` / `edit_convenios` / `delete_convenios` (já em `action-map.ts`)
- [ ] **Permission matrix**: `convenios` já presente
- [ ] **Sidebar**: item novo com `requiredPermission: { resource: 'convenios', action: 'VIEW' }`
- [ ] **Bootstrap roles**: não muda

## Pendências para discussão

1. **Colocação no sidebar** — "Administração" (perto de Histórico de Atendimentos) por ser relatório/financeiro; alternativa "Clínica" (perto de Convênios). Sugestão: Administração.
2. **Taxa de glosa (denominador)** — usar soma do valor faturado dos `ATENDIDO` no período como base do %. Confirmar.
3. **Glosa por lote** — registro item-a-item agora; importação/lote de retorno do convênio fica como Módulo futuro.
```
