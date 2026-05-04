# Módulo 15 — Procedimentos e Pacotes de Atendimento

## Status: PENDENTE

## Contexto

A clínica precisa gerenciar os procedimentos oferecidos (avaliações, terapias, consultas) e criar pacotes de atendimento (combos de sessões). Hoje existe apenas:
- Model `Procedimento` básico com nome, código, valor, duração, cor
- API `GET /api/procedimentos` (somente listagem)
- Não existe página de cadastro/gestão
- Não existe model/conceito de Pacote

**Motivação**:
1. **Parametrização completa de procedimentos** — especialidade, valor particular, tempo mínimo/máximo, requer autorização, ícone visual
2. **Pacotes de atendimento** — combos como "10 sessões de fonoaudiologia", "Avaliação + 20 terapias", vendidos como unidade com preço promocional
3. **Integração com Repasse e Convênios** — procedimentos completos permitem regras de repasse mais precisas e tabelas de convênio mais ricas
4. **Identificação visual** — cor e ícone para agenda, dashboards e relatórios

---

## Progresso por Fase

### Fase 0: Schema e Database
- [ ] Enums criados (StatusPacote, TipoPacote)
- [ ] Campos adicionados ao model `Procedimento` (especialidade, icone, valor_particular, tempo_min/max, requer_autorizacao, observacoes)
- [ ] Model `Pacote` criado
- [ ] Model `PacoteProcedimento` criado (N:N com quantidade)
- [ ] Model `PacoteHistorico` criado (auditoria de alterações)
- [ ] `npx prisma db push` executado
- [ ] `npx prisma generate` sem erros

### Fase 1: Types + API Core
- [ ] Types e Zod schemas criados (`src/types/procedimento.ts`, `src/types/pacote.ts`)
- [ ] API CRUD procedimentos (`src/app/api/procedimentos/route.ts` — refatorar) + `[id]/route.ts`
- [ ] API CRUD pacotes (`src/app/api/pacotes/route.ts` + `[id]/route.ts`)
- [ ] API sub-recurso pacote-procedimentos (`src/app/api/pacotes/[id]/procedimentos/route.ts`)

### Fase 2: Página de Listagem + CRUD Procedimentos
- [ ] Página `/procedimentos/page.tsx` com tabs (Procedimentos | Pacotes)
- [ ] Cards de estatísticas (total, por especialidade, ativos, com convênio)
- [ ] Dialog novo/editar/excluir procedimento
- [ ] Color picker e icon picker
- [ ] Navegação no sidebar atualizada

### Fase 3: Página de Detalhe do Procedimento
- [ ] Página `/procedimentos/[id]/page.tsx` com tabs (Dados, Convênios, Regras de Repasse)
- [ ] Tab Convênios — lista convênios que têm este procedimento em tabela
- [ ] Tab Regras de Repasse — lista regras de repasse que referenciam este procedimento

### Fase 4: CRUD de Pacotes
- [ ] Dialog novo/editar pacote com seleção múltipla de procedimentos
- [ ] Página de detalhe `/pacotes/[id]/page.tsx`
- [ ] Tab Composição — procedimentos do pacote com quantidade
- [ ] Tab Vendas — futuro (por ora empty state)

### Fase 5: Polish, RBAC e Integração
- [ ] `ProtectedRoute` com `resource: 'procedimentos'` (slug já existe no seed)
- [ ] `action-map.ts` com actions (view/create/edit/delete_procedimentos)
- [ ] Sidebar atualizado com item "Procedimentos"
- [ ] Permission matrix verificar slug
- [ ] Loading state com `PageLoader`
- [ ] Empty states com mensagens amigáveis
- [ ] `npm run build` passando
- [ ] Arquitetura atualizada (CLAUDE.md tabela de módulos)

---

## Fase 0: Schema e Database

### Novos Enums

```prisma
enum StatusPacote {
  ATIVO
  INATIVO
  ESGOTADO              // Estoque/limite atingido (futuro)
}

enum TipoPacote {
  SESSOES_ILIMITADAS    // N sessões do mesmo procedimento
  COMBO_MISTO           // Mistura de procedimentos diferentes
  AVALIACAO_COMPLETA    // Avaliação + sessões
  OUTROS
}
```

### Alterações no Model `Procedimento`

```prisma
model Procedimento {
  id                String              @id @default(uuid())
  tenantId          String
  nome              String
  descricao         String?             @db.Text
  codigo            String?             // Código TUSS
  valor             Decimal?            @db.Decimal(10, 2)          // JÁ EXISTE (será "valor_padrao")
  valor_particular  Decimal?            @db.Decimal(10, 2)          // NOVO: preço particular
  duracao_padrao    Int?                // JÁ EXISTE (minutos)
  tempo_minimo      Int?                // NOVO: tempo mínimo permitido
  tempo_maximo      Int?                // NOVO: tempo máximo permitido
  especialidade     String?             // NOVO: "Fonoaudiologia", "Psicologia", etc.
  requer_autorizacao Boolean            @default(false)              // NOVO
  observacoes       String?             @db.Text                     // NOVO
  cor               String?             // JÁ EXISTE (hex)
  icone             String?             // NOVO: nome de ícone Lucide
  ativo             Boolean             @default(true)
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @default(now()) @updatedAt

  agendamentos      agendamento[]
  tabelasConvenio   ConvenioTabela[]
  regrasRepasse     RegraRepasse[]
  pacoteProcedimentos PacoteProcedimento[]

  @@index([tenantId])
  @@index([tenantId, especialidade])
  @@map("procedimentos")
}
```

### Novo Model `Pacote`

```prisma
model Pacote {
  id                String              @id @default(uuid())
  tenantId          String

  // Dados básicos
  nome              String
  descricao         String?             @db.Text
  tipo              TipoPacote
  status            StatusPacote        @default(ATIVO)

  // Valores
  valor_total       Decimal             @db.Decimal(10, 2)          // Valor do pacote (com desconto)
  valor_particular  Decimal?            @db.Decimal(10, 2)          // Valor particular se diferente
  valor_original    Decimal?            @db.Decimal(10, 2)          // Soma sem desconto (computed ou salvo)

  // Configuração
  total_sessoes     Int?                // Total de sessões (se aplicável)
  validade_dias     Int?                // Validade em dias após compra
  cor               String?             // Identificação visual
  icone             String?

  // Convênio (pacotes podem ser atrelados a um convênio específico)
  convenioId        String?
  convenio          Convenio?           @relation(fields: [convenioId], references: [id], onDelete: SetNull)

  // Controle
  ativo             Boolean             @default(true)
  observacoes       String?             @db.Text
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @default(now()) @updatedAt

  procedimentos     PacoteProcedimento[]
  historicos        PacoteHistorico[]

  @@index([tenantId])
  @@index([tenantId, status])
  @@map("pacotes")
}

model PacoteProcedimento {
  id                String              @id @default(uuid())
  pacoteId          String
  procedimentoId    String
  quantidade        Int                 @default(1)
  observacoes       String?

  pacote            Pacote              @relation(fields: [pacoteId], references: [id], onDelete: Cascade)
  procedimento      Procedimento        @relation(fields: [procedimentoId], references: [id], onDelete: Restrict)

  @@unique([pacoteId, procedimentoId])
  @@map("pacote_procedimentos")
}

model PacoteHistorico {
  id                String              @id @default(uuid())
  pacoteId          String
  tenantId          String

  tipo_alteracao    String              // CRIACAO, ALTERACAO, DESATIVACAO, REATIVACAO
  descricao         String
  dados_anteriores  Json?
  dados_novos       Json?
  usuario_nome      String
  usuario_id        String

  createdAt         DateTime            @default(now())

  pacote            Pacote              @relation(fields: [pacoteId], references: [id], onDelete: Cascade)

  @@index([pacoteId])
  @@map("pacotes_historico")
}
```

### Alterações em Models Existentes

```prisma
// Em Convenio, adicionar:
pacotes           Pacote[]
```

### Arquivos
- `prisma/schema.prisma` (modificar)
- Rodar: `npx prisma db push` + `npx prisma generate`

---

## Fase 1: Types + API Core

### Types

**`src/types/procedimento.ts`** (novo)
```typescript
export const ESPECIALIDADES = [
  'Fonoaudiologia',
  'Terapia Ocupacional',
  'Psicologia',
  'Fisioterapia',
  'Neuropsicologia',
  'Psicopedagogia',
  'Musicoterapia',
  'Educação Física Adaptada',
  'Nutrição',
  'Medicina',
  'Outros',
] as const

export interface Procedimento {
  id: string
  tenantId: string
  nome: string
  descricao: string | null
  codigo: string | null
  valor: number | null
  valor_particular: number | null
  duracao_padrao: number | null
  tempo_minimo: number | null
  tempo_maximo: number | null
  especialidade: string | null
  requer_autorizacao: boolean
  observacoes: string | null
  cor: string | null
  icone: string | null
  ativo: boolean
  createdAt: string
  updatedAt: string
  _count?: { agendamentos: number; tabelasConvenio: number; regrasRepasse: number; pacoteProcedimentos: number }
}

export const procedimentoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  codigo: z.string().optional().nullable(),
  descricao: z.string().optional().nullable(),
  valor: z.number().positive().optional().nullable(),
  valor_particular: z.number().positive().optional().nullable(),
  duracao_padrao: z.number().int().positive().optional().nullable(),
  tempo_minimo: z.number().int().positive().optional().nullable(),
  tempo_maximo: z.number().int().positive().optional().nullable(),
  especialidade: z.string().optional().nullable(),
  requer_autorizacao: z.boolean().default(false),
  observacoes: z.string().optional().nullable(),
  cor: z.string().optional().nullable(),
  icone: z.string().optional().nullable(),
})
```

**`src/types/pacote.ts`** (novo)
```typescript
export const TIPO_PACOTE_LABELS: Record<string, string> = {
  SESSOES_ILIMITADAS: 'Sessões de um procedimento',
  COMBO_MISTO: 'Combo misto',
  AVALIACAO_COMPLETA: 'Avaliação completa',
  OUTROS: 'Outros',
}

export const STATUS_PACOTE_LABELS: Record<string, string> = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  ESGOTADO: 'Esgotado',
}

export interface PacoteProcedimentoItem {
  id: string
  pacoteId: string
  procedimentoId: string
  quantidade: number
  observacoes: string | null
  procedimento?: { id: string; nome: string; valor: number | null; duracao_padrao: number | null; cor: string | null }
}

export interface Pacote {
  id: string
  tenantId: string
  nome: string
  descricao: string | null
  tipo: 'SESSOES_ILIMITADAS' | 'COMBO_MISTO' | 'AVALIACAO_COMPLETA' | 'OUTROS'
  status: 'ATIVO' | 'INATIVO' | 'ESGOTADO'
  valor_total: number
  valor_particular: number | null
  valor_original: number | null
  total_sessoes: number | null
  validade_dias: number | null
  cor: string | null
  icone: string | null
  convenioId: string | null
  ativo: boolean
  observacoes: string | null
  createdAt: string
  updatedAt: string
  convenio?: { id: string; razao_social: string; nome_fantasia: string | null } | null
  procedimentos?: PacoteProcedimentoItem[]
  _count?: { procedimentos: number; historicos: number }
}

export const pacoteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional().nullable(),
  tipo: z.enum(['SESSOES_ILIMITADAS', 'COMBO_MISTO', 'AVALIACAO_COMPLETA', 'OUTROS'] as const),
  valor_total: z.number().positive('Valor total deve ser positivo'),
  valor_particular: z.number().positive().optional().nullable(),
  total_sessoes: z.number().int().positive().optional().nullable(),
  validade_dias: z.number().int().positive().optional().nullable(),
  cor: z.string().optional().nullable(),
  icone: z.string().optional().nullable(),
  convenioId: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  procedimentos: z.array(z.object({
    procedimentoId: z.string().min(1),
    quantidade: z.number().int().positive(),
    observacoes: z.string().optional().nullable(),
  })).min(1, 'Adicione ao menos um procedimento ao pacote'),
})
```

### API Procedimentos (refatorar)

**`src/app/api/procedimentos/route.ts`** — refatorar para seguir padrão `getAuthenticatedUser + hasPermission`
- GET: listar com `_count` e filtros (especialidade, ativo)
- POST: criar com validação
- PUT: atualizar por id (body.id)
- DELETE: soft delete via `?id=X`

**`src/app/api/procedimentos/[id]/route.ts`** (novo)
- GET: detalhe com `_count` e relações

### API Pacotes (novo)

**`src/app/api/pacotes/route.ts`**
- GET: listar pacotes com `_count` e `procedimentos.procedimento`
- POST: criar pacote + PacoteProcedimento em transaction + histórico CRIACAO

**`src/app/api/pacotes/[id]/route.ts`**
- GET: detalhe completo
- PUT: atualizar dados + histórico ALTERACAO (com snapshots)
- DELETE: soft delete + histórico DESATIVACAO

**`src/app/api/pacotes/[id]/procedimentos/route.ts`**
- POST: adicionar procedimento ao pacote
- PUT: atualizar quantidade
- DELETE: remover procedimento do pacote

### Padrões a seguir
- `src/app/api/convenios/route.ts` — padrão de CRUD com histórico
- `src/app/api/convenios/[id]/tabela/route.ts` — padrão de sub-recurso N:N

### Arquivos
- `src/types/procedimento.ts` (criar)
- `src/types/pacote.ts` (criar)
- `src/app/api/procedimentos/route.ts` (refatorar)
- `src/app/api/procedimentos/[id]/route.ts` (criar)
- `src/app/api/pacotes/route.ts` (criar)
- `src/app/api/pacotes/[id]/route.ts` (criar)
- `src/app/api/pacotes/[id]/procedimentos/route.ts` (criar)

---

## Fase 2: Página de Listagem + CRUD Procedimentos

### Página (`src/app/procedimentos/page.tsx`)

Layout com:
- `ProtectedRoute` com `resource: 'procedimentos'` (já existe no seed)
- Header com breadcrumbs
- Tabs: **Procedimentos** | **Pacotes**
- Cards de estatísticas: Total procedimentos, Por especialidade (contagem), Pacotes ativos
- Busca por nome/código/especialidade
- Tabela:
  - Coluna com cor + ícone como "chip" visual
  - Nome, Código, Especialidade, Valor (R$), Duração (min), Ativo?
  - Ações: Ver detalhes (link `/procedimentos/[id]`), Editar, Excluir

### Componentes

**`src/components/procedimentos/novo-procedimento-dialog.tsx`**
Form com seções:
- **Identificação**: nome, código, especialidade
- **Visual**: cor (color picker), ícone (icon picker de Lucide)
- **Valores**: valor padrão, valor particular
- **Duração**: duração padrão, tempo mínimo, tempo máximo
- **Controle**: requer autorização (switch), observações

**`src/components/procedimentos/editar-procedimento-dialog.tsx`**
**`src/components/procedimentos/excluir-procedimento-dialog.tsx`**

**`src/components/ui/color-picker.tsx`** (novo, reutilizável)
Palette predefinida + input hex customizado

**`src/components/ui/icon-picker.tsx`** (novo, reutilizável)
Busca em ícones Lucide populares (Heart, Brain, Activity, Stethoscope, etc.)

### Navegação
- `src/lib/navigation.ts` — Adicionar item **"Procedimentos"** com `requiredPermission: { resource: 'procedimentos', action: 'VIEW' }` e ícone `Package2` (Lucide)

### Padrão a seguir
- `src/app/convenios/page.tsx` — layout de listagem
- `src/components/convenios/novo-convenio-dialog.tsx` — padrão de form

### Arquivos
- `src/app/procedimentos/page.tsx` (criar)
- `src/components/procedimentos/novo-procedimento-dialog.tsx` (criar)
- `src/components/procedimentos/editar-procedimento-dialog.tsx` (criar)
- `src/components/procedimentos/excluir-procedimento-dialog.tsx` (criar)
- `src/components/ui/color-picker.tsx` (criar)
- `src/components/ui/icon-picker.tsx` (criar)
- `src/lib/navigation.ts` (modificar)

---

## Fase 3: Página de Detalhe do Procedimento

### Página (`src/app/procedimentos/[id]/page.tsx`)

Layout com 3 tabs:

1. **Dados Gerais** — Todos os campos do procedimento com cor/ícone em destaque. Botão editar.

2. **Convênios** — Lista de convênios que têm este procedimento em tabela
   - Coluna: convênio, valor convênio, valor particular, vigência, ações
   - Link para detalhe do convênio

3. **Regras de Repasse** — Lista regras de repasse ativas que referenciam este procedimento
   - Coluna: profissional, tipo (%/R$/hora), valor, convênio (se aplicável), status

### Loading
- Usar `PageLoader` enquanto dados carregam

### Arquivos
- `src/app/procedimentos/[id]/page.tsx` (criar)

---

## Fase 4: CRUD de Pacotes

### Página Listagem (mesma `/procedimentos/page.tsx`, tab "Pacotes")

- Cards: Total pacotes, Valor médio, Mais vendidos (futuro)
- Tabela:
  - Nome + cor/ícone
  - Tipo (badge)
  - # Procedimentos, Total sessões, Valor total (R$), Status
  - Ações: detalhes, editar, desativar

### Dialog `novo-pacote-dialog.tsx`

Form com:
- **Dados básicos**: nome, descrição, tipo (select), cor, ícone
- **Valores**: valor total, valor particular, validade (dias)
- **Convênio** (opcional): dropdown convênios ativos
- **Composição** (obrigatório): lista de procedimentos
  - Botão "Adicionar procedimento" → dropdown filtra não-adicionados
  - Cada linha: nome do procedimento, quantidade (input), valor unitário (readonly), subtotal
  - Footer: "Valor original (soma): R$ X" vs "Valor total do pacote: R$ Y" → mostra desconto (%)

### Página Detalhe (`src/app/pacotes/[id]/page.tsx`)

Tabs:
1. **Dados Gerais** — Campos do pacote + cor/ícone
2. **Composição** — Tabela de procedimentos com CRUD de quantidades
3. **Histórico** — Timeline de alterações (auditoria)

### Arquivos
- `src/components/pacotes/novo-pacote-dialog.tsx` (criar)
- `src/components/pacotes/editar-pacote-dialog.tsx` (criar)
- `src/components/pacotes/excluir-pacote-dialog.tsx` (criar)
- `src/components/pacotes/pacote-procedimentos-list.tsx` (criar — tabela editável de composição)
- `src/app/pacotes/[id]/page.tsx` (criar)

---

## Fase 5: Polish, RBAC e Integração

### RBAC (obrigatório — checklist)

- [ ] `ProtectedRoute` com `resource: 'procedimentos'` nas páginas (slug já existe em `prisma/seed-rbac.ts`)
- [ ] **Adicionar actions em `src/lib/auth/action-map.ts`**:
  ```typescript
  view_procedimentos:   { resource: 'procedimentos', action: 'VIEW'   },
  create_procedimentos: { resource: 'procedimentos', action: 'CREATE' },
  edit_procedimentos:   { resource: 'procedimentos', action: 'UPDATE' },
  delete_procedimentos: { resource: 'procedimentos', action: 'DELETE' },
  ```
- [ ] API routes usam `hasPermission(user, 'view_procedimentos')`, etc.
- [ ] Verificar que `procedimentos` aparece em `src/components/rbac/permission-matrix.tsx`
- [ ] Sidebar com `requiredPermission: { resource: 'procedimentos', action: 'VIEW' }`
- [ ] Decidir se **Pacotes** é um recurso RBAC separado (`pacotes`) ou sub-recurso de `procedimentos`.
  - **Recomendação**: herdar de `procedimentos` (quem gerencia procedimentos gerencia pacotes). Não criar novo recurso.

### UX Polish

- [ ] Loading state das páginas com `<PageLoader />`
- [ ] Empty states amigáveis: "Nenhum procedimento cadastrado. Clique em 'Novo' para começar."
- [ ] Formatação BRL em todos os valores (R$ 1.234,56)
- [ ] Formatação de duração ("45 min", "1h 30min")
- [ ] Badges coloridas por especialidade
- [ ] Inputs numéricos controlados (lição aprendida do Módulo 14: `value={field.value ?? ""}` + onChange correto)

### Build & Verificação

- [ ] `npm run build` passando sem erros
- [ ] Atualizar `CLAUDE.md` tabela de módulos: "15 | Procedimentos e Pacotes | /procedimentos | Implementado"
- [ ] Atualizar plan status para "CONCLUÍDO ✅"

### Fluxo de teste E2E
1. Abrir `/procedimentos` → empty state
2. Criar procedimento "Fonoaudiologia - Sessão" (45min, R$ 150, cor azul, ícone Activity)
3. Criar procedimento "Avaliação Neuropsicológica" (120min, R$ 800)
4. Abrir detalhe de um procedimento → tab Convênios/Regras vazia
5. Criar pacote "Combo 10 sessões Fono" (tipo SESSOES_ILIMITADAS, 10x Fono, valor R$ 1.200 em vez de R$ 1.500)
6. Ver composição no detalhe → verificar desconto calculado
7. Editar pacote → adicionar "Avaliação" como 1x → verificar histórico
8. Desativar pacote → badge "Inativo"
9. Verificar sidebar com item Procedimentos (para ADMIN)
10. Login como USER (terapeuta) → não deve ver item no sidebar

---

## Arquivos Críticos de Referência

| Arquivo | Para que serve |
|---------|---------------|
| `prisma/schema.prisma` | Schema — adicionar campos em Procedimento + novos models |
| `src/app/api/convenios/route.ts` | Padrão de CRUD com histórico |
| `src/app/api/convenios/[id]/tabela/route.ts` | Padrão de sub-recurso N:N |
| `src/app/convenios/page.tsx` | Padrão de listagem |
| `src/app/convenios/[id]/page.tsx` | Padrão de página com tabs |
| `src/app/terapeutas/[id]/page.tsx` | Padrão atualizado com PageLoader e RBAC correto |
| `src/components/terapeutas/regra-repasse-form.tsx` | Padrão de form com RHF+Zod (inputs controlados) |
| `src/components/page-loader.tsx` | Loading state reutilizável |
| `src/lib/auth/action-map.ts` | Adicionar action-keys |
| `src/lib/auth/server.ts` | hasPermission helper |
| `src/lib/navigation.ts` | Adicionar item sidebar com requiredPermission |
| `prisma/seed-rbac.ts` | Já tem slug "procedimentos" |

## Verificação Final

```bash
npm run build          # TS + ESLint sem erros
npm run dev            # Testar navegação e CRUD completo
npx prisma studio      # Verificar dados no banco
```

## Lições aplicadas de Módulos anteriores

- **Inputs numéricos**: `value={field.value ?? ""}` + `onChange={(e) => field.onChange(e.target.value === "" ? "" : e.target.valueAsNumber)}` — nunca deixar o input começar com `undefined`
- **PageLoader**: usar `<PageLoader message="..." />` para loading de página inteira — não `<Skeleton />` dentro de `MainLayout`
- **RBAC**: slug do recurso no `ProtectedRoute` DEVE bater com `prisma/seed-rbac.ts` (nunca inventar)
- **Decimal do Prisma**: Tratar com `new Prisma.Decimal(valor)` nas mutations para evitar erros de tipo
- **Zod enum v4**: usar `z.enum(['A', 'B'] as const)` sem opção `required_error`
- **Json nullable**: usar `Prisma.JsonNull` em vez de `null` para campos Json opcionais

## Decisões arquiteturais

1. **Pacotes = sub-conceito de Procedimentos** — não é um recurso RBAC separado; mesma permissão gerencia ambos
2. **Valor do pacote é salvo explicitamente** — `valor_total` é o preço final (com desconto); `valor_original` é opcional (pode ser calculado na UI ou salvo no momento da criação para histórico)
3. **Soft delete em todos** — `ativo: false` em vez de DELETE físico
4. **Histórico somente em Pacote** — Procedimento não tem histórico (raramente muda, sem necessidade imediata)
5. **N:N com tabela intermediária** — `PacoteProcedimento` em vez de array em Pacote, para permitir quantidade e observações por item
