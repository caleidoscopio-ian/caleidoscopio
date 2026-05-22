# Plano — Módulo Filiais (Multi-Unidade)

## Contexto

Uma clínica (tenant) pode ter múltiplas unidades físicas (filiais), ex: "Extrema" e "Bragança". Os recursos existentes (pacientes, salas, profissionais, agendamentos, convênios, procedimentos) precisam ser associáveis a uma filial, e o sistema deve filtrar os dados conforme a filial selecionada.

**Analogia**: Prédio = plataforma Caleidoscópio · Apartamento = tenant (clínica) · Quarto = filial (unidade)

---

## Decisões Tomadas

| Recurso | Relação com Filial |
|---|---|
| Sala | Fixa em 1 filial |
| Paciente | Fixo em 1 filial |
| Profissional | **Multi-filial** (pode atender em A e B) |
| Agendamento | Derivado da sala (sem campo extra, filtra via JOIN) |
| Convênio | Pertence a 1 filial (ou null = toda a clínica) |
| Procedimento | Pertence a 1 filial (ou null = toda a clínica) |
| Admin/Super Admin | Vê **todas** as filiais (filtro global opcional) |
| Usuário não-admin | Restrito à filial atribuída (`filialId` no usuário) |
| **Dados existentes** | `filialId = null` → visíveis para todos, sem migração forçada |
| **Filial padrão** | Ao criar um tenant, auto-criar filial "Única" como ponto de partida |
| **Novo usuário** | Campo "Filial" obrigatório no form de criação de usuário |

---

## Arquitetura: Filial Context Global

Em vez de um filtro independente em cada página, um **seletor global de filial** no sidebar:

```
┌─────────────────────────────────────────┐
│  🏥 Caleidoscópio    [▼ Extrema      ]  │  ← FilialSelector no header
│─────────────────────────────────────────│
│  Dashboard                              │
│  Pacientes     → filtrados pela filial  │
│  Agenda        → filtrados pela filial  │
│  Check-in      → filtrados pela filial  │
└─────────────────────────────────────────┘
```

- **Admin**: dropdown "Todas as filiais" + lista de filiais ativas
- **Não-admin**: filial fixada automaticamente, seletor oculto
- **Persistência**: `localStorage` + React Context (`useFilial()`)
- **null selecionado** = ver tudo (comportamento padrão para admin)

---

## Fase 0 — Schema e Database

### Novo Model `Filial`

```prisma
model Filial {
  id        String   @id @default(cuid())
  tenantId  String
  nome      String
  cidade    String?
  endereco  String?
  telefone  String?
  email     String?
  cor       String?   // cor de identificação visual (hex)
  ativo     Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  salas         Sala[]
  pacientes     Paciente[]
  profissionais ProfissionalFilial[]
  convenios     Convenio[]
  procedimentos Procedimento[]

  @@index([tenantId])
  @@index([tenantId, ativo])
}
```

### Novo Model `ProfissionalFilial` (junction multi-filial)

```prisma
model ProfissionalFilial {
  profissionalId String
  filialId       String
  principal      Boolean      @default(false)
  profissional   Profissional @relation(fields: [profissionalId], references: [id], onDelete: Cascade)
  filial         Filial       @relation(fields: [filialId], references: [id], onDelete: Cascade)

  @@id([profissionalId, filialId])
  @@index([filialId])
}
```

### Alterações em Models Existentes

| Model | Campo adicionado | Tipo |
|---|---|---|
| `Sala` | `filialId` | `String?` + relação `Filial?` |
| `Paciente` | `filialId` | `String?` + relação `Filial?` |
| `Profissional` | `filiais ProfissionalFilial[]` | relação |
| `Convenio` | `filialId` | `String?` + relação `Filial?` |
| `Procedimento` | `filialId` | `String?` + relação `Filial?` |
| `Agendamento` | **sem campo** | filial derivada via `salaRelacao.filialId` |

> Nota: `filialId = null` em todos os models existentes = sem filial atribuída → visível para todos os usuários.

### Arquivos
- `prisma/schema.prisma` (modificar)
- `npx prisma migrate dev --name add_filiais_module`
- `npx prisma generate`

### Filial "Única" — Auto-criação na inicialização do tenant

Ao fazer o primeiro login de um tenant (bootstrap no `src/lib/auth/bootstrap-roles.ts`), verificar se já existe alguma filial. Se não existir, criar automaticamente:

```typescript
// Em bootstrap-roles.ts (após garantir role do usuário):
const filialCount = await prisma.filial.count({ where: { tenantId } })
if (filialCount === 0) {
  await prisma.filial.create({
    data: { tenantId, nome: 'Única', ativo: true }
  })
}
```

Isso garante que qualquer tenant existente ou novo sempre tenha ao menos uma filial, e o admin pode renomeá-la ou criar novas depois.

### Checklist Fase 0
- [x] Model `Filial` criado
- [x] Model `ProfissionalFilial` criado
- [x] `filialId` adicionado em `Sala`, `Paciente`, `Convenio`, `Procedimento`
- [x] `filialId String?` adicionado em `Usuario` (model local, se existir) ou gerenciado via `X-User-Data`
- [x] Relação `filiais ProfissionalFilial[]` em `Profissional`
- [x] Migration executada sem erros
- [x] `npx prisma generate` sem erros
- [x] Auto-criação de filial "Única" no bootstrap do tenant

---

## Fase 1 — Types + API Core

### Types (`src/types/filial.ts`)
- Interface `Filial`, `ProfissionalFilial`
- Zod schema para validação dos forms

### API Principal (`src/app/api/filiais/route.ts`)
- **GET**: listar filiais do tenant (filtro `ativo`, search por nome/cidade)
- **POST**: criar filial (validar nome único por tenant)

### API Detalhe (`src/app/api/filiais/[id]/route.ts`)
- **GET**: filial completa com contagens (salas, pacientes, profissionais)
- **PUT**: atualizar filial
- **DELETE**: soft delete (`ativo: false`) se não tiver dados vinculados

### API Profissionais por Filial (`src/app/api/filiais/[id]/profissionais/route.ts`)
- **GET**: profissionais vinculados a esta filial
- **POST**: vincular profissional à filial
- **DELETE**: desvincular

### Permissões
- Reutilizar `manage_clinic` para admin
- Adicionar na `action-map.ts`: `view_filiais`, `manage_filiais`
- Adicionar no `seed-rbac.ts` e `bootstrap-roles.ts`

### Checklist Fase 1
- [x] Types e Zod schemas criados
- [x] API CRUD filiais (GET, POST, PUT, DELETE)
- [x] API detalhe com contagens
- [x] API gestão de profissionais por filial
- [x] Permissões no action-map, seed-rbac e bootstrap-roles

---

## Fase 2 — Filial Context Global + Seletor

### Context (`src/contexts/filial-context.tsx`)
```typescript
interface FilialContextValue {
  filiais: Filial[]           // filiais disponíveis para o usuário
  filialAtiva: Filial | null  // null = todas
  setFilialAtiva: (f: Filial | null) => void
  isAdmin: boolean            // admin vê todas
}
```
- Persiste `filialAtiva.id` em `localStorage`
- Carrega filiais do tenant na inicialização
- Se usuário não-admin: `filialAtiva` é fixada automaticamente

### Seletor (`src/components/filial-selector.tsx`)
- Dropdown no `main-layout.tsx` (header ou sidebar)
- Admin: "Todas as filiais" + lista com cor+nome de cada filial
- Não-admin: badge com nome da filial (sem dropdown)
- Indicador visual de cor da filial selecionada

### Integração
- `main-layout.tsx`: adicionar `FilialProvider` + `FilialSelector`
- `src/hooks/useFilial.ts`: hook público para consumir o context

### Checklist Fase 2
- [x] `FilialContext` + `FilialProvider` criados
- [x] `useFilial()` hook exportado
- [x] Persistência em localStorage
- [x] `FilialSelector` no layout principal
- [x] Admin vê dropdown, não-admin vê badge fixo

---

## Fase 3 — Página `/filiais` (CRUD Admin)

### Página (`src/app/filiais/page.tsx`)
- `ProtectedRoute` com `{ resource: 'filiais', action: 'VIEW' }`
- Cards por filial: nome, cidade, cor, contadores (salas, pacientes, profissionais)
- Status badge: Ativa / Inativa
- Botões: Nova filial, Editar, Desativar

### Dialogs
- `src/components/filiais/nova-filial-dialog.tsx` — campos: nome*, cidade, endereço, telefone, email, cor
- `src/components/filiais/editar-filial-dialog.tsx`
- `src/components/filiais/excluir-filial-dialog.tsx` — confirmação com aviso se tiver dados vinculados

### Navegação (`src/lib/navigation.ts`)
- Adicionar item "Filiais" no grupo Admin com ícone `Building2`
- `requiredPermission: { resource: 'filiais', action: 'VIEW' }`

### Checklist Fase 3
- [x] Página de listagem renderizando
- [x] Cards com contadores
- [x] Dialog criação com validação
- [x] Dialog edição pré-preenchido
- [x] Dialog exclusão com aviso
- [x] Item no sidebar (admin only)

---

## Fase 4 — Integração nas Páginas Existentes

Para cada página abaixo: (a) adicionar `filialId` nos forms de criação/edição, (b) aplicar filtro automático via `useFilial()`.

### `/salas`
- Form: dropdown "Filial" (obrigatório ao criar nova sala)
- Listagem: filtrar por `filialId` da filial ativa
- Exibir badge de filial em cada card de sala

### `/pacientes`
- Form: dropdown "Filial" (obrigatório)
- Listagem: filtrar por `filialId`
- Exibir filial no card/linha do paciente

### `/terapeutas` (Profissionais)
- Form: multi-select "Filiais de atendimento" + toggle "Filial principal"
- Listagem: filtrar por profissionais que têm a filial ativa em `ProfissionalFilial`
- Exibir badges de filiais no card do profissional

### `/agenda`
- Filtro automático: `agendamento WHERE salaRelacao.filialId = filialAtiva.id`
- Manter outros filtros existentes

### `/check-in`
- Filtro automático: mesmo padrão da agenda
- API `/api/agendamentos/check-in` aceita `filialId` como param

### `/convenios`
- Form: dropdown "Filial" (opcional — null = toda a clínica)
- Listagem: filtrar por filial ativa (incluir convenios com `filialId = null`)
- Lógica: convênios sem filial são visíveis em todas as filiais

### `/procedimentos`
- Form: dropdown "Filial" (opcional — null = toda a clínica)
- Listagem: mesmo padrão dos convênios

### `/usuarios`
- Form de **criação de usuário**: campo "Filial" obrigatório (dropdown das filiais ativas do tenant)
- Form de **edição**: campo "Filial" editável
- Admin e Super Admin ficam sem restrição de filial (`filialId = null`)
- Exibir filial atribuída na listagem de usuários (coluna ou badge)

### APIs afetadas
Adicionar parâmetro `filialId` opcional nas APIs:
- `/api/salas`
- `/api/pacientes`
- `/api/terapeutas`
- `/api/agendamentos`
- `/api/agendamentos/check-in`
- `/api/convenios`
- `/api/procedimentos`

### Checklist Fase 4
- [x] `/salas` — form + filtro
- [x] `/pacientes` — form + filtro
- [x] `/terapeutas` — multi-select + filtro
- [x] `/agenda` — filtro automático
- [x] `/check-in` — filtro automático
- [x] `/convenios` — form + filtro (inclui sem filial)
- [x] `/procedimentos` — form + filtro (inclui sem filial)
- [x] `/usuarios` — campo filial no form de criação e edição
- [x] Todas as APIs aceitam `filialId` como param

---

## Fase 5 — Controle de Acesso por Filial

### Lógica nas APIs
```typescript
// Em cada API route que filtra por filial:
const userFilialId = user.filialId  // null para admin
const filialFiltro = userFilialId ?? searchParams.get('filialId') ?? undefined

// Query:
where: {
  ...(filialFiltro ? { filialId: filialFiltro } : {}),
  // para convênios/procedimentos: também incluir filialId: null
}
```

### Acesso do usuário não-admin
- `getAuthenticatedUser` passa a retornar `filialId` do usuário
- Se `user.filialId` está definido → filtrar automaticamente
- Admin (`role === 'ADMIN' || 'SUPER_ADMIN'`) → sem restrição

> **Nota**: Por ora, o `filialId` do usuário pode ser gerenciado na página `/usuarios` (admin atribui filial ao usuário).

### Checklist Fase 5
- [x] `getAuthenticatedUser` retorna `filialId` do usuário
- [x] Bootstrap cria filial "Única" se tenant não tiver nenhuma
- [x] Todas as APIs aplicam filtro condicional por filial
- [x] Admin/Super Admin bypassa restrição (`filialId = null`)
- [x] Usuários sem filial configurada veem tudo (fallback seguro)
- [x] API `/api/usuarios` aceita e persiste `filialId`

---

## Fase 6 — Polish e Verificação Final

- [x] Empty states para listas vazias em todas as páginas
- [x] Loading states em todas as operações
- [x] Indicador visual de filial ativa (cor no header/sidebar)
- [x] Responsividade mobile do FilialSelector
- [x] `npm run build` passando sem erros
- [x] Fluxo E2E: criar filial → vincular sala → cadastrar paciente → criar agendamento → verificar filtro

---

## Arquivos Críticos de Referência

| Arquivo | Para que serve |
|---|---|
| `prisma/schema.prisma` | Schema — onde adicionar models |
| `src/app/api/pacientes/route.ts` | Padrão de API route com tenantId |
| `src/app/salas/page.tsx` | Padrão de página de listagem |
| `src/components/salas/nova-sala-dialog.tsx` | Padrão de dialog form |
| `src/lib/auth/server.ts` | `getAuthenticatedUser`, `hasPermission` |
| `src/lib/navigation.ts` | Onde adicionar item no sidebar |
| `src/app/convenios/page.tsx` | Referência para padrão de convenios |
| `src/app/procedimentos/page.tsx` | Referência para procedimentos |

---

## Fluxo de Teste E2E

1. Admin cria filial "Extrema" (cor azul) e "Bragança" (cor verde)
2. Admin atribui salas existentes às filiais
3. Admin atribui profissional X a ambas as filiais
4. Admin atribui profissional Y só a "Extrema"
5. Seleciona "Extrema" no FilialSelector → verifica que só aparecem dados de Extrema
6. Seleciona "Todas" → verifica que tudo aparece (incluindo registros sem filial)
7. Cria novo paciente → deve pedir filial
8. Cria agendamento → filial deriva da sala selecionada
9. Abre `/check-in` → só aparecem agendamentos da filial ativa

---

## Status de Progresso

| Fase | Status | Observações |
|---|---|---|
| Fase 0 — Schema | ✅ Concluída | `Filial`, `ProfissionalFilial`, `filialId` em Sala/Paciente/Convenio/Procedimento/UsuarioRole. `db push` aplicado. |
| Fase 1 — Types + API Core | ✅ Concluída | `src/types/filial.ts`, `/api/filiais` CRUD, `/api/filiais/[id]/profissionais`, action-map, seed-rbac, bootstrap + auto-criação "Única" |
| Fase 2 — Filial Context Global | ✅ Concluída | `FilialContext`, `FilialProvider`, `useFilial()`, `FilialSelector` no sidebar, `FilialProvider` no `main-layout.tsx` |
| Fase 3 — Página /filiais | ✅ Concluída | `src/app/filiais/page.tsx` com cards+contadores+busca; dialogs nova/editar/excluir; item "Filiais" no sidebar |
| Fase 4 — Integração nas páginas | ✅ Concluída | APIs (salas, pacientes, check-in, convênios, procedimentos) com filialId; dialogs de sala com dropdown; páginas filtram por filialAtiva; FilialProvider movido para root layout |
| Fase 5 — Controle de Acesso | ✅ Concluída | getAuthenticatedUser retorna filialId do UsuarioRole; APIs aplicam filtro automático para não-admin; PATCH /api/usuario-roles para atualizar filialId |
| Fase 6 — Polish | ✅ Concluída | Badge de filial ativa no header; FilialSelector com max-h scroll e ícone Landmark; build passando |
